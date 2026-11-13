/** Exact invokes immutable official scripts; it never synthesizes an Exact runtime. */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { EXACT_FRAMEWORK_DESCRIPTOR, EXACT_TEMPLATES, UPSTREAM_REVISIONS } from '@mr.dj2u/framework-registry';
import type { CancellationTokenLike, ExecutionIdentity, GenerationPlan, GenerationRequest, PlatformTarget, VerificationCheck, VerificationReport } from './adapter-types.js';
import { BaseAdapter } from './base-adapter.js';
import { checkExactPrerequisites } from './prerequisites.js';
import type { GenerationTopology } from './base-adapter.js';
import { fileDigest, identifyCheckout, identifyExecutable } from './runner.js';
import { buildExactProjectMemory } from './exact-memory.js';
import { availableLoopbackPort, verifyStartup } from './startup-verification.js';

const EXACT_OPTION_KEYS = [
  'projectIdentity',
  'exactCheckout',
  'templatesCheckout',
  'bunExecutable',
  'openDecisions',
  'sourceInfo',
  'projectInfo',
  'answers',
  'productRequirements',
  'originalInfoContent',
  'platforms',
];

function resolveCheckout(explicit?: unknown, envVar?: string, defaultNames: string[] = []): string | undefined {
  if (typeof explicit === 'string' && explicit.trim()) return path.resolve(explicit);
  if (envVar && process.env[envVar]) return path.resolve(process.env[envVar]!);
  const searchRoots = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../..'),
    path.resolve(process.cwd(), '../../..'),
    path.resolve(process.cwd(), '../../../..'),
    fileURLToPath(new URL('..', import.meta.url)),
    fileURLToPath(new URL('../..', import.meta.url)),
    fileURLToPath(new URL('../../..', import.meta.url)),
    fileURLToPath(new URL('../../../..', import.meta.url)),
    fileURLToPath(new URL('../../../../..', import.meta.url)),
  ];
  for (const root of searchRoots) {
    for (const name of defaultNames) {
      const candidate = path.join(root, name);
      if (existsSync(candidate)) return candidate;
      const tempCandidate = path.join(root, 'temp', name);
      if (existsSync(tempCandidate)) return tempCandidate;
    }
  }
  return undefined;
}

export class ExactAdapter extends BaseAdapter {
  readonly descriptor = EXACT_FRAMEWORK_DESCRIPTOR;
  async listTemplates() { return EXACT_TEMPLATES; }
  async checkPrerequisites() { return checkExactPrerequisites(); }
  private execution(request: GenerationRequest, pin: {repository:string;commit:string}, topology: GenerationTopology): ExecutionIdentity {
    const options = request.options ?? {};
    if (Object.keys(options).some(k => !EXACT_OPTION_KEYS.includes(k))) throw new Error('Unknown Exact generation option');
    const exactCheckoutPath = resolveCheckout(options.exactCheckout, 'EXACT_CHECKOUT', ['exact-upstream', 'exact']);
    if (!exactCheckoutPath) throw new Error('Prepare an immutable Exact checkout separately, then provide options.exactCheckout or set EXACT_CHECKOUT');
    const checkout = identifyCheckout(exactCheckoutPath, pin);
    if (options.bunExecutable !== undefined && typeof options.bunExecutable !== 'string') throw new Error('options.bunExecutable must be an executable path');
    const executable = identifyExecutable(typeof options.bunExecutable === 'string' ? options.bunExecutable : 'bun');
    if (fileDigest(executable) !== fileDigest(identifyExecutable('bun'))) throw new Error('Approved Bun differs from normal PATH Bun. Install the compatible Bun on normal PATH and restart your terminal/editor before planning.');
    let script = path.join(checkout.directory,'scripts','exact.mjs');
    const name = request.appName, bundle = request.bundleId ?? `com.example.${name.replace(/-/g,'')}`;
    const displayName = (options.answers as { displayAppName?: string } | undefined)?.displayAppName ?? request.projectInfo?.displayName ?? name;
    let args = [script,'new',topology.generationTarget,'--name',displayName,'--bundle-id',bundle];
    const checkouts = [checkout];
    if (request.templateId !== 'blank') {
      const templatesCheckoutPath = resolveCheckout(options.templatesCheckout, 'EXACT_TEMPLATES_CHECKOUT', ['exact-templates-upstream', 'exact-templates']);
      if (!templatesCheckoutPath) throw new Error('Official templates require separately prepared options.templatesCheckout or set EXACT_TEMPLATES_CHECKOUT');
      const templates = identifyCheckout(templatesCheckoutPath, UPSTREAM_REVISIONS.EXACT_TEMPLATES_MAIN);
      const ownPin = JSON.parse(readFileSync(path.join(templates.directory,request.templateId!,'exact.json'),'utf8'));
      if (ownPin.commit !== pin.commit || ownPin.repository.replace(/\.git$/,'') !== pin.repository.replace(/\.git$/,'')) throw new Error('Official template pin differs from registry');
      checkouts.push(templates); script = path.join(templates.directory,'new.mjs');
      args = [script,request.templateId!,topology.generationTarget,'--name',displayName,'--bundle-id',bundle,'--exact2',checkout.directory];
    }
    return {executable,executableDigest:fileDigest(executable),cwd:checkout.directory,args,script,scriptDigest:fileDigest(script),checkouts,timeoutMs:300000};
  }
  async planGeneration(request: GenerationRequest): Promise<GenerationPlan> {
    const templateId = request.templateId ?? 'blank', template = EXACT_TEMPLATES.find(t => t.id === templateId);
    if (!template) throw new Error('Unknown Exact template');
    const normalized = {...request,templateId};
    const topology = this.resolveTopology(normalized);
    return this.makePlan(normalized,template,this.execution(normalized,template.pinnedRevision,topology),topology);
  }
  protected async expectedExecution(plan: GenerationPlan) {
    return this.execution({frameworkId:plan.frameworkId,appName:plan.appName,targetDirectory:plan.targetDirectory,templateId:plan.templateId,bundleId:plan.bundleId,options:plan.options,platforms:plan.targetPlatforms},plan.pinnedRevision,this.topologyFromPlan(plan));
  }
  /** Rich, honest Exact memory; injects product requirements and preserves original intake. */
  protected override workspaceMemoryFiles(plan: GenerationPlan): Record<string, string> {
    return buildExactProjectMemory(plan);
  }
  async verify(project: string): Promise<VerificationReport> {
    const checks = ['app.contract','app.json','exact.mjs','package.json','AGENTS.md'].map(name => ({name,passed:existsSync(path.join(project,name)),message:'Structural presence check only; no build or Contract test executed.'}));
    let configuredPlatforms: PlatformTarget[] = ['web'];
    try {
      const appJson = JSON.parse(readFileSync(path.join(project, 'app.json'), 'utf8'));
      if (appJson.host && typeof appJson.host === 'object') {
        configuredPlatforms = Object.keys(appJson.host).filter((host): host is PlatformTarget => ['web','ios','android','macos','linux','windows'].includes(host));
      }
    } catch { /* Invalid manifests remain unverified. */ }
    return {frameworkId:'exact',passed:false,checks,unverifiedPlatforms:configuredPlatforms};
  }
  protected async verifyWebStartup(plan: GenerationPlan, cancellation?: CancellationTokenLike): Promise<VerificationCheck> {
    const port = await availableLoopbackPort();
    // Resolve the public shell command again, independently of the approved scaffold executable.
    // The official dev loop builds missing output; npm start remains upstream's prebuilt-dist command.
    return verifyStartup({ executable: identifyExecutable('bun'), args: ['exact.mjs','web','--port',String(port)], cwd: this.appPath(plan), timeoutMs: 900000 }, `http://127.0.0.1:${port}/`, 'id="exact-root"', cancellation);
  }
  protected async verifyGenerated(plan: GenerationPlan, cancellation?: CancellationTokenLike): Promise<VerificationReport> {
    const app = this.appPath(plan), structural = await this.verify(app), prereqs = await this.checkPrerequisites();
    if (!prereqs.satisfied) return {...structural,checks:[...structural.checks,{name:'toolchain',passed:false,message:[prereqs.summary,...prereqs.prerequisites.filter(item => item.required).map(item => item.actionableFix)].join(' ')}],unverifiedPlatforms:[...plan.targetPlatforms]};
    const execution = plan.execution!, checks: VerificationCheck[] = [...structural.checks];
    const runCheck = async (name: string, args: string[], cwd: string, timeoutMs: number) => {
      try {
        const result = await this.runner({executable:execution.executable,args,cwd,timeoutMs},cancellation);
        checks.push({name,passed:result.code === 0,message:(result.stdout+result.stderr).slice(-4000),command:['bun',...args].join(' ')});
      } catch (error) { checks.push({name,passed:false,message:error instanceof Error ? error.message : String(error)}); }
    };
    // Broad native setup diagnostics must never skip the independent selected web startup check.
    await runCheck('official setup --check', [path.join(execution.checkouts[0]!.directory,'scripts','exact.mjs'),'setup','--check'],execution.checkouts[0]!.directory,60000);
    if (plan.targetPlatforms.includes('web')) {
      await runCheck('official web test', [path.join(app,'exact.mjs'),'test','web'],app,900000);
      try { checks.push(await this.verifyWebStartup(plan,cancellation)); }
      catch (error) { checks.push({name:'web startup',passed:false,message:error instanceof Error ? error.message : String(error)}); }
    }
    const webPassed = plan.targetPlatforms.includes('web') && checks.filter(check => check.name !== 'official setup --check').every(check => check.passed);
    const unverified = plan.targetPlatforms.filter(p => p !== 'web' || !webPassed);
    const passed = unverified.length === 0 && checks.every(c => c.passed);
    return {frameworkId:'exact',passed,checks,unverifiedPlatforms:unverified};
  }
}
