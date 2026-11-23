#!/usr/bin/env node
// Builds the Quest-only Viro renderer: ViroCore v3.0.3 plus the patches in
// tools/quest/viro-renderer, applied in lock.json order (0001 OpenXR pointer, 0002 menu
// compositor layer, 0003 controller input sampler). Only arm64 libviro_renderer.so
// changes. The Java bridge, the
// other native libraries and node_modules stay stock. Output goes to
// native/quest-viro-renderer, which tools/quest/with-quest-viro-renderer.cjs wires into
// QUEST_BUILD=1 prebuilds.
//
//   node tools/quest/build-viro-renderer.mjs             patched build, AAR and report
//   node tools/quest/build-viro-renderer.mjs --pristine  unpatched v3.0.3, for comparison
//
// Needs git, JDK 17 (java, jar, javap), Android SDK with NDK 27.1.12297006 and CMake 3.22.1.
// QUEST_RENDERER_WORK (default %TEMP%\nrq-viro) holds the checkout; keep it short on
// Windows. QUEST_RENDERER_GRADLE_HOME defaults to ~/.gradle.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const patchDir = path.join(root, 'tools/quest/viro-renderer');
const lock = JSON.parse(readFileSync(path.join(patchDir, 'lock.json'), 'utf8'));
if (!Array.isArray(lock.patches) || lock.patches.length === 0)
  throw new Error('tools/quest/viro-renderer/lock.json lists no patches.');
const patchFiles = lock.patches.map((name) => path.join(patchDir, name));
const pristine = process.argv.includes('--pristine');
const work = process.env.QUEST_RENDERER_WORK || path.join(os.tmpdir(), 'nrq-viro');
const source = path.join(work, 'virocore');
const gradleHome = process.env.QUEST_RENDERER_GRADLE_HOME || path.join(os.homedir(), '.gradle');
const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  path.join(process.env.LOCALAPPDATA || '', 'Android/Sdk');
const ndk = path.join(sdk, 'ndk', lock.ndk);
const exe = process.platform === 'win32' ? '.exe' : '';
const llvm = path.join(
  ndk,
  'toolchains/llvm/prebuilt',
  process.platform === 'win32' ? 'windows-x86_64' : `${process.platform}-x86_64`,
  'bin'
);
const stockAar = path.join(
  root,
  'node_modules/@reactvision/react-viro/android/viro_renderer/viro_renderer-release.aar'
);
const output = path.join(root, 'native/quest-viro-renderer');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? source,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${command} ${args.join(' ')} exited ${result.status}\n${result.stderr ?? ''}`.trim()
    );
  return result.stdout ?? '';
}
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function findFiles(directory, predicate) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return findFiles(file, predicate);
    return predicate(file) ? [file] : [];
  });
}

// Replaces exact text once. Used only for build settings that are not part of the patch.
function edit(file, before, after) {
  const target = path.join(source, file);
  const text = readFileSync(target, 'utf8');
  if (text.split(before).length !== 2) throw new Error(`Build edit context not unique: ${file}`);
  writeFileSync(target, text.replace(before, after));
}

for (const tool of ['llvm-strip', 'llvm-readelf', 'llvm-nm'])
  if (!existsSync(path.join(llvm, tool + exe)))
    throw new Error(`NDK ${lock.ndk} is required: ${path.join(llvm, tool + exe)} is missing.`);
if (!existsSync(stockAar)) throw new Error(`Run npm ci first: ${stockAar} is missing.`);
if (sha256(stockAar) !== lock.stockAarSha256)
  throw new Error(
    `node_modules has a different viro_renderer AAR (${sha256(stockAar)}). ` +
      `The patch is pinned to the 3.0.3 AAR ${lock.stockAarSha256}.`
  );

// 1. Pinned checkout with LF endings, so the patch and the build see upstream's bytes.
mkdirSync(work, { recursive: true });
const gitProbe = existsSync(source)
  ? spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: source,
      encoding: 'utf8',
    })
  : null;
if (existsSync(source) && gitProbe?.status !== 0) {
  console.error(`Replacing an unusable ViroCore checkout at ${source}.`);
  console.error(gitProbe?.stderr || gitProbe?.error?.message || `git status ${gitProbe?.status}`);
  rmSync(source, { recursive: true, force: true });
}
if (!existsSync(source))
  run(
    'git',
    [
      '-c',
      'core.autocrlf=false',
      'clone',
      '--depth',
      '1',
      '--branch',
      lock.tag,
      lock.repository,
      source,
    ],
    { cwd: work }
  );
run('git', ['config', 'core.autocrlf', 'false']);
const head = run('git', ['rev-parse', 'HEAD'], { capture: true }).trim();
if (head !== lock.revision) throw new Error(`Expected ViroCore ${lock.revision}, found ${head}.`);

// 2. Restore every tracked file and clear patch-added headers. Untracked build output stays for incremental builds.
run('git', ['checkout', '--', '.']);
for (const addedHeader of [
  'android/sharedCode/src/main/cpp/QuestPanelLayer.h',
  'android/sharedCode/src/main/cpp/QuestInputSampler.h',
]) {
  rmSync(path.join(source, addedHeader), { force: true });
}
if (run('git', ['status', '--porcelain', '--untracked-files=no'], { capture: true }).trim())
  throw new Error(`${source} still differs from ${lock.revision} after checkout.`);

// 3. Each patch must apply with full context, in order; git apply refuses fuzz.
if (!pristine) {
  for (const patchFile of patchFiles) {
    run('git', ['apply', '--check', '--whitespace=error-all', patchFile]);
    run('git', ['apply', '--whitespace=error-all', patchFile]);
  }
}
const sourceDiff = run('git', ['diff', '--binary'], { capture: true });

// 4. Build settings only: arm64, renderer target, local SDK. Not part of the patch.
edit('android/settings.gradle', ", ':openxrtest'", '');
edit(
  'android/viroreact/build.gradle',
  'abiFilters "arm64-v8a", "armeabi-v7a"',
  'abiFilters "arm64-v8a"'
);
writeFileSync(
  path.join(source, 'android/local.properties'),
  `sdk.dir=${sdk.replaceAll('\\', '/')}\n`
);
run(
  'java',
  [
    `-Dgradle.user.home=${gradleHome}`,
    '-classpath',
    path.join(source, 'android/gradle/wrapper/gradle-wrapper.jar'),
    'org.gradle.wrapper.GradleWrapperMain',
    ':viroreact:externalNativeBuildRelease',
    '--console=plain',
  ],
  { cwd: path.join(source, 'android') }
);
run('git', ['checkout', '--', 'android/settings.gradle', 'android/viroreact/build.gradle']);

const built = findFiles(path.join(source, 'android/viroreact/build'), (file) =>
  /[\\/]obj[\\/]arm64-v8a[\\/]libviro_renderer\.so$/.test(file)
).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
if (!built.length) throw new Error('The arm64 libviro_renderer.so was not built.');

// 5. Strip like AGP does for AARs, then compare with the stock library.
const variant = pristine ? 'pristine' : 'patched';
const variantDir = path.join(work, variant);
rmSync(variantDir, { recursive: true, force: true });
mkdirSync(variantDir, { recursive: true });
const library = path.join(variantDir, 'libviro_renderer.so');
run(path.join(llvm, 'llvm-strip' + exe), ['--strip-unneeded', '-o', library, built[0]]);

const stockDir = path.join(work, 'stock-aar');
rmSync(stockDir, { recursive: true, force: true });
mkdirSync(stockDir, { recursive: true });
run('jar', ['xf', stockAar], { cwd: stockDir });
const stockLibrary = path.join(stockDir, 'jni/arm64-v8a/libviro_renderer.so');

function elf(file) {
  const readelf = (args) => run(path.join(llvm, 'llvm-readelf' + exe), [...args, file], {
    capture: true,
  });
  const exports = run(
    path.join(llvm, 'llvm-nm' + exe),
    ['-D', '--defined-only', '--format=just-symbols', file],
    { capture: true }
  )
    .split(/\r?\n/)
    .filter(Boolean);
  return {
    sha256: sha256(file),
    bytes: statSync(file).size,
    buildId: /Build ID: ([0-9a-f]+)/.exec(readelf(['-n']))?.[1] ?? null,
    needed: [...readelf(['-d']).matchAll(/\(NEEDED\)\s+Shared library: \[([^\]]+)\]/g)].map(
      (match) => match[1]
    ),
    soname: /\(SONAME\)\s+Library soname: \[([^\]]+)\]/.exec(readelf(['-d']))?.[1] ?? null,
    machine: /Machine:\s+(.+)/.exec(readelf(['-h']))?.[1].trim() ?? null,
    exports: new Set(exports),
  };
}

// Every native method in the stock Java classes must still resolve by JNI name.
function mangle(text) {
  let out = '';
  for (const char of text) {
    if (/[A-Za-z0-9]/.test(char)) out += char;
    else if (char === '.' || char === '/') out += '_';
    else if (char === '_') out += '_1';
    else out += '_0' + char.charCodeAt(0).toString(16).padStart(4, '0');
  }
  return out;
}
function jniSymbols(jarFile) {
  const classes = run('jar', ['tf', jarFile], { capture: true })
    .split(/\r?\n/)
    .filter((entry) => entry.endsWith('.class'))
    .map((entry) => entry.slice(0, -6).replaceAll('/', '.'));
  const symbols = new Set();
  for (let index = 0; index < classes.length; index += 150) {
    const listing = run('javap', ['-p', '-classpath', jarFile, ...classes.slice(index, index + 150)], {
      capture: true,
    });
    let current = null;
    for (const line of listing.split(/\r?\n/)) {
      const header = /(?:class|interface|enum)\s+([\w.$]+)/.exec(line);
      if (header && !line.startsWith(' ')) current = header[1];
      const method = /\bnative\b[^(]*?\s([\w$]+)\(/.exec(line);
      if (current && method) symbols.add(`Java_${mangle(current)}_${mangle(method[1])}`);
    }
  }
  return symbols;
}

const stock = elf(stockLibrary);
const candidate = elf(library);
const declared = jniSymbols(path.join(stockDir, 'classes.jar'));
const missingJni = [...declared].filter((symbol) => !candidate.exports.has(symbol)).sort();
const stockOnly = [...stock.exports].filter((symbol) => !candidate.exports.has(symbol)).sort();
const candidateOnly = [...candidate.exports].filter((symbol) => !stock.exports.has(symbol)).sort();
const pristineLibrary = path.join(work, 'pristine/libviro_renderer.so');
const reference =
  !pristine && existsSync(pristineLibrary) ? elf(pristineLibrary) : null;
const summary = (info) => ({
  sha256: info.sha256,
  bytes: info.bytes,
  buildId: info.buildId,
  soname: info.soname,
  machine: info.machine,
  needed: info.needed,
  exportedSymbols: info.exports.size,
});
const report = {
  variant,
  viroCore: { repository: lock.repository, tag: lock.tag, revision: head },
  patches: pristine
    ? null
    : lock.patches.map((file, index) => ({ file, sha256: sha256(patchFiles[index]) })),
  sourceDiffSha256: createHash('sha256').update(sourceDiff).digest('hex'),
  ndk: lock.ndk,
  stock: summary(stock),
  built: summary(candidate),
  neededMatchesStock: JSON.stringify(stock.needed) === JSON.stringify(candidate.needed),
  sonameMatchesStock: stock.soname === candidate.soname,
  jni: { declaredInStockJava: declared.size, missing: missingJni },
  exportsOnlyInStock: stockOnly,
  exportsOnlyInBuilt: candidateOnly,
  pristine: reference
    ? {
        ...summary(reference),
        exportsOnlyInPristine: [...reference.exports].filter((s) => !candidate.exports.has(s)),
        exportsOnlyInPatched: [...candidate.exports].filter((s) => !reference.exports.has(s)),
      }
    : null,
};
writeFileSync(path.join(variantDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, exportsOnlyInStock: stockOnly.length, exportsOnlyInBuilt: candidateOnly.length }, null, 2));

// A different .so hash is recorded in report.json. It is not, by itself, an ABI mismatch.
// The published 3.0.3 binary also links proprietary ReactVisionCCA and ARCore image-tracker
// objects that are not in the public tag. Those gaps are accepted only when an unpatched
// rebuild of this same tag has them too. Run --pristine before the patched build.
const problems = [];
if (candidate.machine !== stock.machine) problems.push(`machine ${candidate.machine}`);
if (!report.sonameMatchesStock) problems.push('SONAME differs from stock');
if (!pristine && !reference)
  problems.push('no pristine v3.0.3 rebuild to explain stock-only symbols; run --pristine first');
// 0002 + 0004 add the multi-window OpenXR compositor bridge that modules/quest-panel binds.
const panelJni = [
  'nativeVersion',
  'nativeCapabilitiesJson',
  'nativeStatus',
  'nativeHide',
  'nativePose',
  'nativeDraw',
  'nativeRefSpaceEpoch',
  'nativeTitleStatus',
  'nativeTitleHide',
  'nativeTitlePose',
  'nativeTitleDraw',
  'nativeSlotStatus',
  'nativeSlotHide',
  'nativeSlotPose',
  'nativeSlotPoseAndSize',
  'nativeSlotDraw',
  'nativeSlotDrawBitmap',
].map((name) => `Java_expo_modules_questpanel_QuestPanelModule_${name}`);
const missingPanelJni = pristine ? [] : panelJni.filter((symbol) => !candidate.exports.has(symbol));
if (missingPanelJni.length)
  problems.push(`menu layer JNI methods are not exported: ${missingPanelJni.join(', ')}`);
// 0003 adds the controller input sampler, render-thread markers and sky diagnostics layer.
const inputJni = [
  'nativeVersion',
  'nativeSetMarkersEnabled',
  'nativeRead',
  'nativeProfile',
  'nativeDiagStatus',
  'nativeDiagHide',
  'nativeDiagPose',
  'nativeDiagDraw',
  'nativeDiagDrawRegion',
].map((name) => `Java_expo_modules_questinput_QuestInputModule_${name}`);
const missingInputJni = pristine ? [] : inputJni.filter((symbol) => !candidate.exports.has(symbol));
if (missingInputJni.length)
  problems.push(`input sampler JNI methods are not exported: ${missingInputJni.join(', ')}`);
if (reference) {
  const pristineMissingJni = [...declared].filter((symbol) => !reference.exports.has(symbol));
  const jniRegression = missingJni.filter((symbol) => !pristineMissingJni.includes(symbol));
  if (jniRegression.length)
    problems.push(`${jniRegression.length} JNI methods are not exported: ${jniRegression.join(', ')}`);
  const neededRegression = reference.needed.filter((name) => !candidate.needed.includes(name));
  if (neededRegression.length)
    problems.push(`NEEDED libraries missing versus pristine: ${neededRegression.join(', ')}`);
  const exportRegression = stockOnly.filter(
    (symbol) => reference.exports.has(symbol) && !symbol.includes('updateAimRay')
  );
  if (exportRegression.length)
    problems.push(`${exportRegression.length} exports differ from the pristine public tag`);
}
if (problems.length) {
  console.error(`Not packaging the ${variant} renderer: ${problems.join('; ')}.`);
  console.error(`See ${path.join(variantDir, 'report.json')}.`);
  process.exit(1);
}
if (pristine) {
  console.log(
    `Pristine public-tag rebuild matches stock machine and SONAME. ` +
      `Hash and proprietary ReactVisionCCA or image-tracker gaps are recorded, not treated as a patch regression. ${library}`
  );
  process.exit(0);
}

// 6. Quest AAR: stock contents, arm64 only, with the patched renderer. Other ABIs are
// removed so no APK can mix a patched arm64 build with stock 32-bit libraries.
const stage = path.join(work, 'quest-aar');
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
run('jar', ['xf', stockAar], { cwd: stage });
for (const abi of readdirSync(path.join(stage, 'jni')))
  if (abi !== 'arm64-v8a') rmSync(path.join(stage, 'jni', abi), { recursive: true, force: true });
copyFileSync(library, path.join(stage, 'jni/arm64-v8a/libviro_renderer.so'));
mkdirSync(output, { recursive: true });
const aar = path.join(output, 'viro_renderer-release.aar');
rmSync(aar, { force: true });
run('jar', ['cfM', aar, '-C', stage, '.'], { cwd: work });
writeFileSync(
  path.join(output, 'build.gradle'),
  [
    '// Generated by tools/quest/build-viro-renderer.mjs. Quest builds only.',
    'configurations.maybeCreate("default")',
    'artifacts.add("default", file(\'viro_renderer-release.aar\'))',
    '',
  ].join('\n')
);
const provenance = {
  generatedBy: 'tools/quest/build-viro-renderer.mjs',
  viroCore: report.viroCore,
  patches: report.patches,
  stockAarSha256: lock.stockAarSha256,
  stockRendererSha256: stock.sha256,
  rendererSha256: candidate.sha256,
  rendererBuildId: candidate.buildId,
  aarSha256: sha256(aar),
  abis: ['arm64-v8a'],
};
writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
copyFileSync(path.join(variantDir, 'report.json'), path.join(output, 'report.json'));
console.log(`Quest renderer: ${aar}\nlibviro_renderer.so ${candidate.sha256}`);
