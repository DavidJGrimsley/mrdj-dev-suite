import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { availableLoopbackPort, verifyStartup } from '../src/generator/startup-verification.js';
import { identifyExecutable } from '../src/generator/runner.js';
import { ExactAdapter } from '../src/generator/exact-adapter.js';
import { GENERATION_STATE_FILENAME, NewWorkspaceBootstrap } from '../src/generator/workspace-topology.js';
import type { GenerationPlan, NewWorkspaceTopology } from '../src/generator/adapter-types.js';

describe('ordinary-shell Exact readiness', () => {
  let temp: string;
  beforeEach(() => { temp = mkdtempSync(path.join(os.tmpdir(), 'mds-startup-')); });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(temp, { recursive: true, force: true }); });

  it('requires browser HTML rather than accepting a wildcard HTTP success and cleans up on timeout', async () => {
    const port = await availableLoopbackPort();
    const url = `http://127.0.0.1:${port}/`;
    const code = `require('node:http').createServer((req,res)=>{res.statusCode=req.headers.accept==='text/html'?503:200;res.end('<div id="exact-root"></div>')}).listen(${port},'127.0.0.1')`;
    const result = await verifyStartup({executable:process.execPath,args:['-e',code],cwd:temp,timeoutMs:1800},url,'id="exact-root"');
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/HTTP 503/);
    await expect(fetch(url)).rejects.toThrow();
  }, 15000);

  it('waits for a nonempty expected page and stops the full child server tree on success', async () => {
    const port = await availableLoopbackPort();
    const url = `http://127.0.0.1:${port}/`;
    const server = `const http=require('node:http');let ready=false;setTimeout(()=>ready=true,450);http.createServer((req,res)=>{res.end(ready?'<div id="exact-root"></div>':'')}).listen(${port},'127.0.0.1')`;
    const parent = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(server)}],{stdio:'inherit',windowsHide:true});setInterval(()=>{},1000)`;
    const result = await verifyStartup({executable:process.execPath,args:['-e',parent],cwd:temp,timeoutMs:8000},url,'id="exact-root"');
    expect(result.passed).toBe(true);
    expect(result.message).toMatch(/Browser execution.*not verified/);
    await expect(fetch(url)).rejects.toThrow();
  }, 15000);

  it('reports early start errors rather than treating process creation as readiness', async () => {
    const result = await verifyStartup({executable:process.execPath,args:['-e',`console.error('Bun 1.3.14 is older than 1.4.2');process.exit(1)`],cwd:temp,timeoutMs:5000},`http://127.0.0.1:${await availableLoopbackPort()}/`,'id="exact-root"');
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/exit 1.*Bun 1.3.14/s);
  });

  it('cleans up its listener when cancelled', async () => {
    const port = await availableLoopbackPort();
    const url = `http://127.0.0.1:${port}/`;
    const began = Date.now();
    await expect(verifyStartup({executable:process.execPath,args:['-e',`require('node:http').createServer((req,res)=>res.end('building')).listen(${port},'127.0.0.1')`],cwd:temp,timeoutMs:5000},url,'id="exact-root"', {
      isCancelled: false,
      throwIfCancelled() { if (Date.now()-began>600) throw new Error('cancelled'); },
    })).rejects.toThrow(/cancelled/);
    await expect(fetch(url)).rejects.toThrow();
  }, 15000);

  it('resolves normal PATH even when a newer task-local Bun override exists', () => {
    const bin = path.join(temp, 'path-bin'); mkdirSync(bin);
    const stale = path.join(bin, process.platform === 'win32' ? 'bun.exe' : 'bun');
    const hidden = path.join(temp, 'approved-bun');
    writeFileSync(stale, 'stale PATH binary'); writeFileSync(hidden, 'hidden newer binary');
    vi.stubEnv('PATH',bin); vi.stubEnv('BUN_EXECUTABLE',hidden); vi.stubEnv('BUN',hidden);
    expect(identifyExecutable('bun')).toBe(stale);
    vi.stubEnv('PATH',temp);
    expect(() => identifyExecutable('bun')).toThrow(/Missing executable bun/);
  });

  it('runs startup despite broad setup failure and keeps failed starts unverified', async () => {
    const pkg = '{"scripts":{"start":"bun exact.mjs serve dist"}}';
    const upstreamRunner = '// immutable upstream generated runner\n';
    for (const [file,content] of Object.entries({'app.contract':'Text("hello")','app.json':'{"host":{"web":{},"ios":{}}}','exact.mjs':upstreamRunner,'package.json':pkg,'AGENTS.md':'upstream rules'})) writeFileSync(path.join(temp,file),content);
    let startupCalls = 0;
    class Adapter extends ExactAdapter {
      override async checkPrerequisites() { return {frameworkId:'exact' as const,satisfied:true,prerequisites:[],summary:'ready',notes:[]}; }
      protected override async verifyWebStartup() { startupCalls++; return {name:'web startup',passed:false,message:'HTTP 503; run bun exact.mjs web and inspect startup diagnostics'}; }
      run(plan: GenerationPlan) { return this.verifyGenerated(plan); }
      handoff(plan: GenerationPlan, verification: Awaited<ReturnType<Adapter['run']>>) { return this.result(plan,true,[],verification).handoff; }
    }
    const calls: readonly string[][] = [];
    const adapter = new Adapter(async spec => { (calls as string[][]).push([...spec.args]); return {code:spec.args.includes('setup')?1:0,stdout:'',stderr:spec.args.includes('setup')?'optional native SDK absent':''}; });
    const plan = {frameworkId:'exact',targetDirectory:temp,targetPlatforms:['web','ios'],options:{},projectMemory:{location:path.join(temp,'project'),mode:'distinct-project'},pinnedRevision:{commit:'revision'},execution:{executable:process.execPath,checkouts:[{directory:temp}]}} as unknown as GenerationPlan;
    const report = await adapter.run(plan);
    expect(startupCalls).toBe(1);
    expect(calls.some(args=>args.includes('test'))).toBe(true);
    expect(report.passed).toBe(false);
    expect(report.unverifiedPlatforms).toEqual(['web','ios']);
    expect(report.checks.some(check=>check.name==='web startup'&&!check.passed)).toBe(true);
    expect(adapter.handoff(plan,report).verificationStatus).toBe('unverified');
    expect(adapter.handoff(plan,report).missingPrerequisites.join(' ')).toMatch(/HTTP 503/);
    const bootstrap = new NewWorkspaceBootstrap({planDigest:'digest',appName:'app',frameworkId:'exact'},{root:temp} as NewWorkspaceTopology);
    bootstrap.recordFrameworkVerification(report);
    const state = JSON.parse(readFileSync(path.join(temp,GENERATION_STATE_FILENAME),'utf8'));
    expect(state.state).toBe('partial');
    expect(state.verification.checks.some((check: {name: string; passed: boolean})=>check.name==='web startup'&&!check.passed)).toBe(true);
    expect(readFileSync(path.join(temp,'package.json'),'utf8')).toBe(pkg);
    expect(readFileSync(path.join(temp,'exact.mjs'),'utf8')).toBe(upstreamRunner);
    expect(existsSync(path.join(temp,'mds-exact.mjs'))).toBe(false);
    startupCalls = 0;
    await adapter.run({...plan,targetPlatforms:['ios']});
    expect(startupCalls).toBe(0);
  });
});
