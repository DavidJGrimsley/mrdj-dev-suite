import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { canonicalizeJson, computePlanDigest, parseGenerationPlan, verifyPlanApproval, ApprovalRequiredError, PlanDigestMismatchError, createProgressEvent } from '@mr.dj2u/framework-registry';
import type { ExecutionIdentity, FrameworkAdapter, FrameworkDescriptor, FrameworkDetectionResult, FrameworkTemplate, GenerationExecutionOptions, GenerationPlan, GenerationPlanValidation, GenerationRequest, GenerationResult, NewWorkspaceTopology, OnboardOptions, PrerequisiteReport, ProjectIdentityMode, VerificationReport } from './adapter-types.js';
import { ReservationJournal } from './journal.js';
import { assertNoSymlinks, runCommand, validateExecutionIdentity, type CommandRunner } from './runner.js';
import { discoverWorkspace } from '../workspace/discover.js';
import { onboardProject } from './onboarding.js';
import { NewWorkspaceBootstrap, newWorkspaceReservationPaths, planNewWorkspaceTopology, validateNewWorkspacePlan } from './workspace-topology.js';

/** Resolved project identity for one generation request or plan. */
export interface GenerationTopology {
  readonly mode: ProjectIdentityMode;
  readonly workspace?: NewWorkspaceTopology;
  /** Directory the official generator must create (`<root>/<app>` for a new workspace, later renamed to `<app>-main`). */
  readonly generationTarget: string;
}

/** Reviewed product decisions that remain open, recorded in canonical memory and the handoff (never resolved by the generator). */
export function openDecisionsFromOptions(options: Record<string, unknown> | undefined): string[] {
  const value = options?.openDecisions;
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item.trim() || item.length > 2000)) throw new Error('options.openDecisions must be a list of non-empty strings');
  return value as string[];
}
function renderOpenDecisions(plan: GenerationPlan, decisions: readonly string[]): string {
  const source = plan.options?.sourceInfo as { path?: unknown; sha256?: unknown } | undefined;
  return ['# Open decisions', '', 'Recorded at generation from reviewed inputs. The generator did not resolve these; the owner decides them before implementation.', '',
    ...(source && typeof source.path === 'string' ? [`Source: \`${source.path}\`${typeof source.sha256 === 'string' ? ` (sha256 ${source.sha256})` : ''}, read-only.`, ''] : []),
    ...decisions.map(decision => `- [ ] ${decision}`), ''].join('\n');
}

const PROJECT_IDENTITIES: readonly ProjectIdentityMode[] = ['new-workspace', 'workspace-member', 'distinct-project'];
/** Bumped whenever plan semantics change, so plans from older adapters are rejected instead of reinterpreted. */
export const ADAPTER_VERSION = '0.4.0';

export abstract class BaseAdapter implements FrameworkAdapter {
  abstract readonly descriptor: FrameworkDescriptor;
  constructor(protected readonly runner: CommandRunner = runCommand) {}
  getCapabilities() { return this.descriptor.buildRunCapabilities; }
  getKnowledgeResources(): readonly string[] { return this.descriptor.knowledgeResources ?? []; }
  abstract listTemplates(): Promise<readonly FrameworkTemplate[]>;
  abstract checkPrerequisites(): Promise<PrerequisiteReport>;
  abstract planGeneration(request: GenerationRequest): Promise<GenerationPlan>;
  protected abstract expectedExecution(plan: GenerationPlan): Promise<ExecutionIdentity>;
  abstract verify(project: string): Promise<VerificationReport>;
  /** Directory that contains the generated app (the source main checkout for a new workspace). */
  protected appPath(plan: GenerationPlan): string { return plan.workspace?.sourcePath ?? plan.targetDirectory; }
  protected verifyGenerated(plan: GenerationPlan, _cancellation?: GenerationExecutionOptions['cancellationToken']): Promise<VerificationReport> { return this.verify(this.appPath(plan)); }
  /** Canonical memory an adapter writes into a new workspace's control repository when its generator produces none. */
  protected workspaceMemoryFiles(_plan: GenerationPlan): Record<string, string> { return {}; }
  async detect(project: string): Promise<FrameworkDetectionResult> {
    let files: string[] = [];
    try { files = readdirSync(project); } catch { return {frameworkId:this.descriptor.id,confidence:'none',matchedSignals:[]}; }
    let signals: string[] = [];
    if (this.descriptor.id === 'exact') {
      signals = ['app.contract','exact.mjs','exact.json'].filter(f => files.includes(f));
      return {frameworkId:'exact', confidence:signals.includes('app.contract') && signals.includes('exact.mjs') ? 'high' : signals.length ? 'low' : 'none',matchedSignals:signals};
    }
    try { const pkg = JSON.parse(readFileSync(path.join(project,'package.json'),'utf8')); if (typeof (pkg.dependencies?.expo ?? pkg.devDependencies?.expo) === 'string') signals.push('package.json:expo'); } catch { /* Invalid or absent manifest is not a signal. */ }
    if (files.includes('expo-env.d.ts')) signals.push('expo-env.d.ts');
    return {frameworkId:this.descriptor.id, confidence:signals.includes('package.json:expo') ? 'high' : signals.length ? 'low' : 'none',matchedSignals:signals};
  }
  /**
   * Chooses the project identity. The default creates a NEW workspace, even when the target sits inside another
   * workspace folder; `workspace-member` and `distinct-project` (standalone) are explicit opt-outs only.
   */
  protected resolveTopology(request: GenerationRequest): GenerationTopology {
    const requested = (request.options ?? {}).projectIdentity;
    if (requested !== undefined && !PROJECT_IDENTITIES.includes(requested as ProjectIdentityMode)) throw new Error('Explicit options.projectIdentity must select new-workspace, workspace-member or distinct-project');
    const mode = (requested as ProjectIdentityMode | undefined) ?? 'new-workspace';
    const target = path.resolve(request.targetDirectory);
    if (mode === 'new-workspace') {
      const workspace = planNewWorkspaceTopology(request.appName, target);
      return { mode, workspace, generationTarget: workspace.generatorOutputPath };
    }
    if (mode === 'workspace-member') {
      const enclosing = discoverWorkspace(path.dirname(target));
      if (!enclosing) throw new Error('Workspace membership requires an initialized workspace');
      const reserved = [enclosing.projectPath, path.resolve(enclosing.workspaceRoot, enclosing.manifest.temp?.path ?? 'temp'), path.join(enclosing.workspaceRoot, 'generated')];
      if (reserved.some(entry => { const relative = path.relative(entry, target); return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative)); })) throw new Error('A workspace member cannot be generated inside the workspace project, temp or generated folders');
    }
    return { mode, generationTarget: target };
  }
  protected topologyFromPlan(plan: GenerationPlan): GenerationTopology {
    const mode = plan.projectMemory?.mode ?? 'distinct-project';
    return { mode, ...(plan.workspace ? { workspace: plan.workspace } : {}), generationTarget: plan.workspace?.generatorOutputPath ?? plan.targetDirectory };
  }
  protected makePlan(request: GenerationRequest, template: FrameworkTemplate, execution: ExecutionIdentity, topology: GenerationTopology): GenerationPlan {
    if (!/^[a-z][a-z0-9-]*$/.test(request.appName)) throw new Error('Use a lowercase app name');
    if (['web', 'ios', 'android', 'macos', 'linux', 'windows'].some(suffix => request.appName.endsWith(`-${suffix}`))) {
      throw new Error(`App name "${request.appName}" ends with a reserved host suffix`);
    }
    const options = request.projectInfo ? { ...request.options, projectInfo: request.projectInfo } : (request.options ?? {});
    const target = path.resolve(request.targetDirectory);
    const enclosing = topology.mode === 'workspace-member' ? discoverWorkspace(path.dirname(target)) : undefined;
    const memoryLocation = topology.workspace?.projectPath ?? enclosing?.projectPath ?? path.join(target, 'project');
    const plan: GenerationPlan = {
      schemaVersion:1, planId:randomUUID(), frameworkId:this.descriptor.id, templateId:template.id, appName:request.appName,
      bundleId:request.bundleId ?? `com.example.${request.appName.replace(/-/g,'')}`, targetDirectory:target, targetPlatforms:request.platforms ?? ['web'],
      pinnedRevision:template.pinnedRevision, reservationPaths:topology.workspace ? newWorkspaceReservationPaths(topology.workspace) : [], planDigest:'',createdAt:new Date().toISOString(),
      generatorIdentity:{adapterId:this.descriptor.id,adapterVersion:ADAPTER_VERSION,frameworkCommit:template.pinnedRevision.commit}, options,
      execution, projectMemory:{mode:topology.mode, location:memoryLocation, coordinatorOwned:topology.mode !== 'distinct-project'},
      ...(topology.workspace ? { workspace: topology.workspace } : {}),
    };
    if (!/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(plan.bundleId)) throw new Error('Invalid bundle identifier');
    return { ...plan, planDigest:computePlanDigest(plan) };
  }
  async validatePlan(input: GenerationPlan): Promise<GenerationPlanValidation> {
    const errors: string[] = [];
    const warnings = ['Tool inventory is separate from verification; generation may install dependencies only as shown in the approved command.'];
    try {
      const plan = parseGenerationPlan(input);
      if (plan.frameworkId !== this.descriptor.id || !verifyPlanApproval(plan, plan.planDigest).approved) throw new Error('Plan digest/framework mismatch');
      if (plan.generatorIdentity.adapterId !== this.descriptor.id || plan.generatorIdentity.adapterVersion !== ADAPTER_VERSION) throw new Error(`Plan was made by adapter ${plan.generatorIdentity.adapterId}@${plan.generatorIdentity.adapterVersion}; replan with ${ADAPTER_VERSION}`);
      openDecisionsFromOptions(plan.options);
      if (!(await this.listTemplates()).some(t => t.id === plan.templateId && t.pinnedRevision.commit === plan.pinnedRevision.commit && t.pinnedRevision.repository === plan.pinnedRevision.repository)) throw new Error('Unregistered template or revision');
      if (plan.targetPlatforms.some(p => ![...this.descriptor.supportedPlatforms,...this.descriptor.experimentalPlatforms].includes(p))) throw new Error('Unsupported target platform');
      const mode = plan.projectMemory?.mode;
      if (mode === 'new-workspace') validateNewWorkspacePlan(plan.appName, plan.targetDirectory, plan.workspace!);
      else new ReservationJournal(plan.targetDirectory).validateTarget();
      const expected = await this.expectedExecution(plan);
      if (canonicalizeJson(expected) !== canonicalizeJson(plan.execution)) throw new Error('Execution does not match adapter command and current local identities; replan');
      validateExecutionIdentity(expected);
      let expectedMemory: string | undefined;
      if (mode === 'new-workspace') expectedMemory = plan.workspace!.projectPath;
      else if (mode === 'workspace-member') expectedMemory = discoverWorkspace(path.dirname(plan.targetDirectory))?.projectPath;
      else expectedMemory = path.join(plan.targetDirectory,'project');
      if (!expectedMemory || plan.projectMemory?.location !== expectedMemory || plan.projectMemory.coordinatorOwned !== (mode !== 'distinct-project')) throw new Error('Canonical memory identity mismatch');
      if (mode === 'distinct-project') {
        const enclosing = discoverWorkspace(path.dirname(plan.targetDirectory));
        if (enclosing) warnings.push(`Standalone app is inside the ${enclosing.manifest.name} workspace folder: workspace-aware tools started here will resolve that workspace's memory, not the app's own project/. Prefer the default new-workspace identity.`);
      }
      if (plan.workspace?.enclosingWorkspace) warnings.push(`The new workspace is nested in the ${plan.workspace.enclosingWorkspace.workspaceId} workspace folder; that workspace is never read or written by this generation.`);
    } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    return {valid:errors.length === 0,planDigest:input?.planDigest ?? '',errors,warnings,prerequisiteReport:await this.checkPrerequisites()};
  }
  async generate(input: GenerationPlan, options: GenerationExecutionOptions): Promise<GenerationResult> {
    const plan = parseGenerationPlan(input);
    if (!options.approvedPlanDigest) throw new ApprovalRequiredError(plan.planDigest);
    if (!verifyPlanApproval(plan,options.approvedPlanDigest).approved) throw new PlanDigestMismatchError(plan.planDigest, options.approvedPlanDigest);
    const validation = await this.validatePlan(plan);
    if (!validation.valid) throw new Error(validation.errors.join('; '));
    const emit = (type: 'scaffold:started'|'generation:completed'|'generation:failed', message: string) => options.progressReporter?.(createProgressEvent(type,message));
    options.cancellationToken?.throwIfCancelled();
    if (options.dryRun) return this.result(plan,true,[],undefined);
    if (!validation.prerequisiteReport?.satisfied) throw new Error(validation.prerequisiteReport?.summary ?? 'Prerequisites are not verified');
    const reservation = new ReservationJournal(plan.targetDirectory); reservation.reserve();
    const bootstrap = plan.workspace ? new NewWorkspaceBootstrap(plan, plan.workspace, options.cancellationToken) : undefined;
    try {
      bootstrap?.createSkeleton(); bootstrap?.beginGenerator();
      emit('scaffold:started','Running approved official generator');
      const e = plan.execution!; validateExecutionIdentity(e);
      const logFile = plan.workspace?.logPath;
      const output = await this.runner(logFile ? {...e,logFile} : e,options.cancellationToken);
      if (output.code !== 0) throw new Error(`Generator exited ${output.code}${logFile ? ` (full output: ${logFile})` : ''}: ${(output.stderr || output.stdout).slice(-4000)}`);
      options.cancellationToken?.throwIfCancelled(); assertNoSymlinks(plan.targetDirectory);
      let topology: Awaited<ReturnType<NewWorkspaceBootstrap['complete']>> | undefined;
      if (bootstrap) {
        // Canonical memory lives only in the new control repository; no app-local project/ is left behind.
        const decisions = openDecisionsFromOptions(plan.options);
        topology = bootstrap.complete({ memoryFiles: {...this.workspaceMemoryFiles(plan), ...(decisions.length ? {'open-decisions.md':renderOpenDecisions(plan,decisions)} : {})} });
      } else if (this.descriptor.id === 'exact' && plan.projectMemory?.mode === 'distinct-project') {
        // Generated memory is local only for an explicitly distinct app; workspace memory is coordinator-owned.
        const local = new ReservationJournal(path.join(plan.targetDirectory,'project'));
        local.reserve();
        try {
          for (const [file, content] of Object.entries(this.workspaceMemoryFiles(plan))) local.writeFile(file, content);
          local.commit();
        } catch (error) { local.rollback(); throw error; }
      }
      const verification = await this.verifyGenerated(plan, options.cancellationToken);
      options.cancellationToken?.throwIfCancelled();
      if (this.descriptor.id === 'exact') bootstrap?.recordFrameworkVerification(verification);
      reservation.commit(); emit('generation:completed',verification.passed ? 'Official scaffold created; verification passed' : 'Official scaffold retained; verification incomplete. Review failed checks before using the app.');
      return this.result(plan,true,readdirSync(this.appPath(plan)),verification,topology);
    } catch (error) { bootstrap?.fail(error); reservation.commit(); emit('generation:failed','Partial scaffold retained for review; no recursive cleanup'); throw error; }
  }
  protected result(plan: GenerationPlan, success: boolean, files: string[], verification?: VerificationReport, topology?: { report: VerificationReport; deferred: readonly string[] }): GenerationResult {
    const app = this.appPath(plan);
    const verified = Boolean(verification?.passed) && (topology ? topology.report.passed : true);
    return {success,planId:plan.planId,planDigest:plan.planDigest,targetDirectory:plan.targetDirectory,frameworkId:plan.frameworkId,templateId:plan.templateId,pinnedRevision:plan.pinnedRevision,createdPaths:files.map(f => path.join(app,f)),journalEntries:[],verificationReport:verification,
      ...(topology ? { topologyReport: topology.report } : {}),
      handoff:{projectId:plan.appName,targetDirectory:plan.targetDirectory,frameworkId:plan.frameworkId,frameworkRevision:plan.pinnedRevision.commit,templateId:plan.templateId,generatedFilesSummary:files,canonicalProjectMemoryLocation:plan.projectMemory!.location,verificationStatus:verified ? 'verified' : 'unverified',missingPrerequisites:verification?.passed ? [] : (verification?.checks.filter(check => !check.passed).map(check => `${check.name}: ${check.message}`) ?? ['Build/test/startup verification has not passed; review verification report and prerequisite inventory.']),deferredDecisions:[...openDecisionsFromOptions(plan.options),...(topology?.deferred ?? [])],recommendedNextSession:'Review scaffold and deferred product requirements with Infie before implementation.',
        ...(plan.workspace ? { workspace: { root: plan.workspace.root, sourceCheckout: plan.workspace.sourcePath, controlRepository: plan.workspace.projectPath, publication: 'local-only' as const } } : {})}};
  }
  onboardExisting(project: string, options?: OnboardOptions) { return onboardProject(project,this.descriptor.id,options); }
}
