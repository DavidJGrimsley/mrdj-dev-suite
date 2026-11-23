const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { withFinalizedMod } = require('@expo/config-plugins');

// Quest prebuilds use the patched renderer from tools/quest/build-viro-renderer.mjs.
// Phone Android and iOS keep Viro's stock :viro_renderer project. node_modules is never
// modified: only the generated android/settings.gradle points the project elsewhere.
// Expo's settings.gradle may be CRLF, and a second prebuild already has the comment.
const PROJECT_LINE =
  /^project\(':viro_renderer'\)\.projectDir = new File\('([^']+)'\)(?:\s*\/\/.*)?\r?$/m;

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** Returns the renderer directory after checking that it was built from this checkout's pin. */
function verifiedRendererDir(projectRoot) {
  const lockDir = path.join(projectRoot, 'tools/quest/viro-renderer');
  const lock = JSON.parse(fs.readFileSync(path.join(lockDir, 'lock.json'), 'utf8'));
  const dir = path.join(projectRoot, 'native/quest-viro-renderer');
  const rebuild = 'Run `node tools/quest/build-viro-renderer.mjs` and prebuild again.';
  const provenanceFile = path.join(dir, 'provenance.json');
  const aar = path.join(dir, 'viro_renderer-release.aar');
  if (!fs.existsSync(provenanceFile) || !fs.existsSync(aar))
    throw new Error(`Quest builds need the patched Viro renderer. ${rebuild}`);
  const provenance = JSON.parse(fs.readFileSync(provenanceFile, 'utf8'));
  const stockAar = path.join(
    path.dirname(require.resolve('@reactvision/react-viro/package.json', { paths: [projectRoot] })),
    'android/viro_renderer/viro_renderer-release.aar'
  );
  // Every patch in lock order, so a renderer without the menu layer or input patch is rejected.
  const patches = (lock.patches ?? []).map((file) => ({
    file,
    sha256: sha256(path.join(lockDir, file)),
  }));
  const checks = [
    ['ViroCore revision', provenance.viroCore?.revision, lock.revision],
    [
      'patches',
      Array.isArray(provenance.patches) ? JSON.stringify(provenance.patches) : null,
      patches.length ? JSON.stringify(patches) : 'no patches in lock.json',
    ],
    ['stock AAR in the lock', provenance.stockAarSha256, lock.stockAarSha256],
    ['stock AAR in node_modules', sha256(stockAar), lock.stockAarSha256],
    ['renderer AAR', sha256(aar), provenance.aarSha256],
  ];
  for (const [label, actual, expected] of checks)
    if (!actual || actual !== expected)
      throw new Error(
        `Patched Viro renderer does not match this checkout (${label}: ${actual} != ${expected}). ${rebuild}`
      );
  return dir;
}

function pointViroRendererAt(settings, relativeDir) {
  const matches = settings.match(new RegExp(PROJECT_LINE.source, 'gm')) ?? [];
  if (matches.length !== 1)
    throw new Error(`Expected one :viro_renderer projectDir in settings.gradle, found ${matches.length}.`);
  return settings.replace(
    PROJECT_LINE,
    `project(':viro_renderer').projectDir = new File('${relativeDir}') // Quest pointer, menu layer and input patches`
  );
}

function withQuestViroRenderer(config) {
  return withFinalizedMod(config, [
    'android',
    (modConfig) => {
      const { projectRoot, platformProjectRoot } = modConfig.modRequest;
      const dir = verifiedRendererDir(projectRoot);
      const settingsFile = path.join(platformProjectRoot, 'settings.gradle');
      const relativeDir = path.relative(platformProjectRoot, dir).split(path.sep).join('/');
      fs.writeFileSync(
        settingsFile,
        pointViroRendererAt(fs.readFileSync(settingsFile, 'utf8'), relativeDir)
      );
      return modConfig;
    },
  ]);
}

module.exports = withQuestViroRenderer;
module.exports.pointViroRendererAt = pointViroRendererAt;
module.exports.verifiedRendererDir = verifiedRendererDir;
