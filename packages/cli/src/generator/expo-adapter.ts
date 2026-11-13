/** Compatibility adapter: the existing CESS resolver and executable own Expo output. */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { EXPO_FRAMEWORK_DESCRIPTOR } from '@mr.dj2u/framework-registry';
import { buildCreateExpoSuperStackArgv, resolveCessPlan, type CessIntakeAnswers } from '../cess-intake.js';
import type { ExecutionIdentity, FrameworkTemplate, GenerationPlan, GenerationRequest, PlatformTarget, VerificationCheck, VerificationReport } from './adapter-types.js';
import { BaseAdapter, type GenerationTopology } from './base-adapter.js';
import { checkExpoPrerequisites } from './prerequisites.js';
import { directoryDigest, fileDigest, identifyExecutable } from './runner.js';
const TEMPLATE: FrameworkTemplate = {id:'super-stack',frameworkId:'expo-react-native',name:'Expo starter',description:'Existing Expo generation options, resolved through the compatibility adapter.',keywords:['expo'],verifiedHosts:[],pinnedRevision:{repository:'https://github.com/DavidJGrimsley/mrdj-dev-suite.git',commit:'create-expo-super-stack@0.2.0'},upstreamSource:'packages/create-expo-super-stack',category:'starter'};
const EXPO_PLATFORMS: readonly PlatformTarget[] = ['web', 'ios', 'android'];
const OPTION_KEYS = ['projectIdentity','cessExecutable','createExpoStackExecutable','answers','openDecisions','sourceInfo','skipExpoProjectChecks'];
/** create-expo-stack fork CESS delegates to; pinned explicitly so CESS never falls back to PATH lookups or local builds. */
const CREATE_EXPO_STACK = { name: '@mr.dj2u/create-expo-stack', version: '2.21.3-mrdj.2' } as const;

function resolveCreateExpoStack(cessScript: string, explicit: unknown): string {
  const candidate = typeof explicit === 'string' ? path.resolve(explicit) : path.join(path.dirname(cessScript), '..', 'node_modules', '@mr.dj2u', 'create-expo-stack', 'bin', 'create-expo-stack.js');
  if (!existsSync(candidate)) throw new Error(`Install ${CREATE_EXPO_STACK.name}@${CREATE_EXPO_STACK.version} with create-expo-super-stack, or provide options.createExpoStackExecutable`);
  // pnpm links packages; the digest binds the real package content, so the resolved path is what runs.
  const bin = realpathSync(candidate);
  const manifest = JSON.parse(readFileSync(path.join(path.dirname(bin), '..', 'package.json'), 'utf8'));
  if (path.basename(bin) !== 'create-expo-stack.js' || manifest.name !== CREATE_EXPO_STACK.name || manifest.version !== CREATE_EXPO_STACK.version) throw new Error(`create-expo-stack must be ${CREATE_EXPO_STACK.name}@${CREATE_EXPO_STACK.version} bin/create-expo-stack.js`);
  return bin;
}

export class ExpoReactNativeAdapter extends BaseAdapter {
  readonly descriptor = EXPO_FRAMEWORK_DESCRIPTOR;
  async listTemplates() { return [TEMPLATE]; }
  async checkPrerequisites() { return checkExpoPrerequisites(); }
  private resolveAnswers(request: GenerationRequest) {
    const options = request.options ?? {};
    if (Object.keys(options).some(k => !OPTION_KEYS.includes(k))) throw new Error('Unknown Expo generation option');
    const answers = options.answers;
    if (answers !== undefined && (!answers || typeof answers !== 'object' || Array.isArray(answers))) throw new Error('Expo answers must be an object');
    const supplied = (answers ?? {}) as Partial<CessIntakeAnswers>;
    // A supplied display name wins; otherwise CESS derives one from the app name exactly as the legacy CLI does.
    const displayAppName = supplied.displayAppName ?? request.projectInfo?.displayName;
    return {...supplied,targetPlatforms:request.platforms as CessIntakeAnswers['targetPlatforms'],...(displayAppName ? {displayAppName} : {}),confirmed:true,saveDefaults:false};
  }
  private execution(request: GenerationRequest, topology: GenerationTopology): ExecutionIdentity {
    const options = request.options ?? {};
    if (topology.mode === 'workspace-member') throw new Error('Existing CESS creates app-owned memory and cannot join an initialized workspace without writing its coordinator-owned memory: use the default new-workspace identity or an explicit distinct-project (standalone) identity.');
    const script = typeof options.cessExecutable === 'string' ? path.resolve(options.cessExecutable) : fileURLToPath(new URL('../../../create-expo-super-stack/dist/cli.js',import.meta.url));
    if (!existsSync(script)) throw new Error('Build/install existing create-expo-super-stack first, or provide options.cessExecutable');
    const manifest = JSON.parse(readFileSync(path.join(path.dirname(script),'..','package.json'),'utf8'));
    if (path.basename(script) !== 'cli.js' || manifest.name !== 'create-expo-super-stack' || manifest.version !== '0.2.0') throw new Error('Local CESS must be create-expo-super-stack@0.2.0 cli.js');
    const stackBin = resolveCreateExpoStack(script, options.createExpoStackExecutable);
    if (options.skipExpoProjectChecks !== undefined && typeof options.skipExpoProjectChecks !== 'boolean') throw new Error('options.skipExpoProjectChecks must be a boolean');
    // Explicit opt-in to CESS's existing --mds-skip-expo-fix: the post-scaffold install, `expo install --fix` and the
    // unpinned `expo-doctor` gate are left to the caller, who must run and report them.
    const skipChecks = options.skipExpoProjectChecks === true ? ['--mds-skip-expo-fix'] : [];
    // CESS always creates <cwd>/<app>. A new workspace runs it in the workspace root (so package name, slug and scheme
    // stay <app>); the bootstrap then renames <root>/<app> to <root>/<app>-main. Standalone runs in the target's parent.
    const output = topology.generationTarget;
    const resolved = resolveCessPlan({parentDir:path.dirname(output),appName:request.appName,answers:this.resolveAnswers(request),cwd:path.dirname(output)});
    if (path.resolve(resolved.parentDir, resolved.appName) !== path.resolve(output)) throw new Error(`Expo generation for "${resolved.appName}" creates "${path.join(resolved.parentDir, resolved.appName)}"; the target directory must be named "${resolved.appName}"`);
    const executable = identifyExecutable('node');
    const runtime = fileURLToPath(new URL('..',import.meta.url));
    const stackPackage = path.dirname(path.dirname(stackBin));
    const sources = [...new Set([path.dirname(script),runtime,path.join(stackPackage,'bin'),path.join(stackPackage,'build')])].map(directory => ({directory,digest:directoryDigest(directory)}));
    return {executable,executableDigest:fileDigest(executable),cwd:resolved.parentDir,args:[script,...buildCreateExpoSuperStackArgv(resolved),`--mds-create-expo-stack-bin=${stackBin}`,...skipChecks],script,scriptDigest:fileDigest(script),checkouts:[],localSources:sources,timeoutMs:2700000};
  }
  async planGeneration(request: GenerationRequest): Promise<GenerationPlan> {
    if (request.templateId && request.templateId !== TEMPLATE.id) throw new Error('Unknown Expo template');
    // User-supplied intake answers keep their own platforms unless the request names them; a conflict is an error.
    const answered = ((request.options ?? {}).answers as { targetPlatforms?: unknown } | undefined)?.targetPlatforms;
    const answeredPlatforms = Array.isArray(answered) ? answered as PlatformTarget[] : undefined;
    if (answeredPlatforms && request.platforms && [...answeredPlatforms].sort().join() !== [...request.platforms].sort().join()) throw new Error('Expo answers.targetPlatforms conflicts with the requested platforms');
    const platforms = request.platforms ?? answeredPlatforms ?? [...EXPO_PLATFORMS];
    if (platforms.some(platform => !EXPO_PLATFORMS.includes(platform))) throw new Error('Expo targets are web, ios and android');
    const normalized = { ...request, templateId: TEMPLATE.id, platforms };
    const topology = this.resolveTopology(normalized);
    return this.makePlan(normalized, TEMPLATE, this.execution(normalized, topology), topology);
  }
  protected async expectedExecution(plan: GenerationPlan) { return this.execution({frameworkId:plan.frameworkId,appName:plan.appName,targetDirectory:plan.targetDirectory,bundleId:plan.bundleId,platforms:plan.targetPlatforms,options:plan.options},this.topologyFromPlan(plan)); }
  async verify(project: string): Promise<VerificationReport> {
    let expo = false;
    try { const pkg = JSON.parse(readFileSync(path.join(project,'package.json'),'utf8')); expo = typeof pkg.dependencies?.expo === 'string'; } catch { /* No valid Expo manifest. */ }
    return {frameworkId:'expo-react-native',passed:false,checks:[{name:'Expo dependency',passed:expo,message:'Manifest inspection only; no build or platform tests executed.'}],unverifiedPlatforms:['web','ios','android']};
  }
  /** Checks that the generated identity matches the approved plan. Still structural: no build or device run happens here. */
  protected override async verifyGenerated(plan: GenerationPlan): Promise<VerificationReport> {
    const app = this.appPath(plan), base = await this.verify(app);
    const checks: VerificationCheck[] = [...base.checks];
    let config: Record<string, unknown> = {}, pkg: Record<string, unknown> = {};
    try { config = (JSON.parse(readFileSync(path.join(app,'app.json'),'utf8')) as { expo?: Record<string, unknown> }).expo ?? {}; } catch { /* Reported below. */ }
    try { pkg = JSON.parse(readFileSync(path.join(app,'package.json'),'utf8')) as Record<string, unknown>; } catch { /* Reported above. */ }
    const display = (plan.options?.answers as { displayAppName?: unknown } | undefined)?.displayAppName;
    checks.push({name:'package name',passed:pkg.name === plan.appName,message:`package.json name ${String(pkg.name)}; expected ${plan.appName}`});
    checks.push({name:'Expo slug',passed:config.slug === plan.appName,message:`app.json slug ${String(config.slug)}; expected ${plan.appName}`});
    if (typeof display === 'string') checks.push({name:'display name',passed:config.name === display,message:`app.json name ${String(config.name)}; expected ${display}`});
    const platforms = Array.isArray(config.platforms) ? (config.platforms as string[]).filter(p => p !== 'web' || plan.targetPlatforms.includes('web')) : [];
    const configured = Array.isArray(config.platforms) ? [...(config.platforms as string[])].sort().join(',') : 'unset';
    checks.push({name:'platforms',passed:[...platforms].sort().join(',') === [...plan.targetPlatforms].sort().join(','),message:`app.json platforms ${configured}; planned ${[...plan.targetPlatforms].sort().join(',')}`});
    const ios = (config.ios as { bundleIdentifier?: unknown } | undefined)?.bundleIdentifier, android = (config.android as { package?: unknown } | undefined)?.package;
    checks.push({name:'native identifiers (informational)',passed:true,message:`CESS does not apply the plan bundle id ${plan.bundleId}; app.json has ios.bundleIdentifier ${String(ios ?? 'unset')}, android.package ${String(android ?? 'unset')}. Set them before an EAS build.`});
    return {...base,checks,passed:false,unverifiedPlatforms:[...plan.targetPlatforms]};
  }
}
