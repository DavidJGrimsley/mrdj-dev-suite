// Builds the browser prototype for deployment under a subpath (default /iSquared/).
//   node scripts/build-hosted.mjs [--base /iSquared/] [--out dist-hosted] [--archive]
//     [--pet-v1 <dir>] [--pet-v2 <dir>] [--require-pet-previews] [--no-pet-previews] [--rollback-dir <dir>]
// Output: <out>/web (static files, including web/preview/pet-show-and-tell/{v1,v2} when present),
//   <out>/manifest.json, <out>/provenance.json, <out>/SHA256SUMS, optionally <out>/isquared-web.tgz
//   plus <out>/isquared-web.tgz.sha256 (kept outside manifest.json so SHA256SUMS matches its final bytes).
// The portfolio server serves <out>/web from a private directory behind its own authentication;
// nothing in this repo implements access control.
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { DEFAULT_HOSTED_BASE_PATH, normalizeBasePath } from './lib/base-path.mjs'
import { verifyHostedOutput } from './lib/verify-hosted-output.mjs'
import { ARCHIVE_NAME, ARCHIVE_SHA256_NAME, outputFileHashes, validateHostedOutputLocation } from './lib/hosted-output-safety.mjs'
import { applyPetPreRouterPathShim, resolvePetPreviewDirs } from './lib/local-preview-servers.mjs'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  const args = {
    base: DEFAULT_HOSTED_BASE_PATH,
    out: 'dist-hosted',
    archive: false,
    petV1: '',
    petV2: '',
    requirePetPreviews: false,
    noPetPreviews: false,
    rollbackDir: '',
  }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--archive') args.archive = true
    else if (token === '--require-pet-previews') args.requirePetPreviews = true
    else if (token === '--no-pet-previews') args.noPetPreviews = true
    else if (token === '--base' || token === '--out' || token === '--pet-v1' || token === '--pet-v2' || token === '--rollback-dir') {
      const value = argv[(index += 1)]
      if (!value) throw new Error(`${token} requires a value`)
      if (token === '--pet-v1') args.petV1 = value
      else if (token === '--pet-v2') args.petV2 = value
      else if (token === '--rollback-dir') args.rollbackDir = value
      else args[token.slice(2)] = value
    } else throw new Error(`Unknown argument: ${token}`)
  }
  return args
}

function git(...gitArgs) {
  const result = spawnSync('git', gitArgs, { cwd: appRoot, encoding: 'utf8' })
  return result.status === 0 ? result.stdout.trim() : ''
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

function copyTreeNoSymlinks(srcDir, dstDir) {
  fs.mkdirSync(dstDir, { recursive: true })
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Refusing to copy symlink: ${path.join(srcDir, entry.name)}`)
    const src = path.join(srcDir, entry.name)
    const dst = path.join(dstDir, entry.name)
    if (entry.isDirectory()) {
      const children = fs.readdirSync(src)
      if (children.length > 0) copyTreeNoSymlinks(src, dst)
    } else if (entry.isFile()) {
      fs.copyFileSync(src, dst)
    } else {
      throw new Error(`Unexpected entry in preview build: ${src}`)
    }
  }
}

function stagePetPreview(version, srcDir, webDir, outRoot) {
  const indexPath = path.join(srcDir, 'index.html')
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Pet ${version} preview missing index.html at ${srcDir}`)
  }
  const targetDir = path.join(webDir, 'preview', 'pet-show-and-tell', version)
  copyTreeNoSymlinks(srcDir, targetDir)
  const targetIndex = path.join(targetDir, 'index.html')
  const rawHtml = fs.readFileSync(targetIndex, 'utf8')
  const shimmedHtml = applyPetPreRouterPathShim(rawHtml)
  fs.writeFileSync(targetIndex, shimmedHtml, 'utf8')

  const siblingManifest = path.resolve(srcDir, '..', 'manifest.json')
  let manifestInfo = null
  const archiveExtras = []
  if (fs.existsSync(siblingManifest) && fs.statSync(siblingManifest).isFile()) {
    const manifestsDir = path.join(outRoot, 'manifests')
    fs.mkdirSync(manifestsDir, { recursive: true })
    const destManifest = path.join(manifestsDir, `pet-${version}-manifest.json`)
    fs.copyFileSync(siblingManifest, destManifest)
    archiveExtras.push(`manifests/pet-${version}-manifest.json`)
    try {
      const parsed = JSON.parse(fs.readFileSync(siblingManifest, 'utf8'))
      manifestInfo = {
        gitCommit: parsed.gitCommit ?? null,
        basePath: parsed.basePath ?? null,
        builtAt: parsed.builtAt ?? null,
        fileCount: parsed.fileCount ?? null,
        sourceIndexHtmlSha256: parsed.indexHtmlSha256 ?? null,
        shimmedIndexHtmlSha256: sha256File(targetIndex),
      }
    } catch {
      manifestInfo = { shimmedIndexHtmlSha256: sha256File(targetIndex) }
    }
  } else {
    manifestInfo = { shimmedIndexHtmlSha256: sha256File(targetIndex) }
  }
  return { manifestInfo, archiveExtras }
}

const args = parseArgs(process.argv.slice(2))
const basePath = normalizeBasePath(args.base)
const outRoot = path.resolve(appRoot, args.out)
const webDir = path.join(outRoot, 'web')

if (args.rollbackDir) {
  const rollbackRoot = path.resolve(args.rollbackDir)
  if (rollbackRoot === outRoot || rollbackRoot.startsWith(outRoot + path.sep)) {
    throw new Error(`--rollback-dir must stay outside ${outRoot}`)
  }
  const hasPrevious =
    fs.existsSync(outRoot) &&
    ['web', 'manifest.json', 'isquared-web.tgz'].some((f) => fs.existsSync(path.join(outRoot, f)))
  const hasBaselineRollback =
    fs.existsSync(path.join(rollbackRoot, 'isquared-web.tgz')) &&
    fs.existsSync(path.join(rollbackRoot, 'NOTE.md'))

  if (!hasPrevious && !hasBaselineRollback) {
    throw new Error(
      `--rollback-dir requested (${rollbackRoot}), but no previous output existed in ${outRoot} and no baseline rollback was found; rollback NOT written`,
    )
  }

  if (hasBaselineRollback) {
    console.log(`[build-hosted] preserved verified pre-change baseline rollback at ${rollbackRoot}`)
  } else if (hasPrevious) {
    fs.mkdirSync(rollbackRoot, { recursive: true })
    for (const name of ['manifest.json', 'provenance.json', 'SHA256SUMS', ARCHIVE_NAME, ARCHIVE_SHA256_NAME]) {
      const src = path.join(outRoot, name)
      if (fs.existsSync(src) && fs.statSync(src).isFile()) {
        fs.copyFileSync(src, path.join(rollbackRoot, name))
      }
    }
    const prevWeb = path.join(outRoot, 'web')
    if (fs.existsSync(prevWeb) && fs.statSync(prevWeb).isDirectory()) {
      copyTreeNoSymlinks(prevWeb, path.join(rollbackRoot, 'web'))
    }
    console.log(`[build-hosted] saved rollback copy to ${rollbackRoot}`)
  }
}

const viteBin = path.join(
  path.dirname(createRequire(import.meta.url).resolve('vite/package.json')),
  'bin',
  'vite.js',
)
validateHostedOutputLocation(appRoot, outRoot, args.archive)
fs.mkdirSync(outRoot, { recursive: true })
console.log(`[build-hosted] base ${basePath} -> ${path.relative(appRoot, webDir)}`)
const build = spawnSync(
  process.execPath,
  [viteBin, 'build', '--config', 'vite.figma.config.ts', '--mode', 'production', '--outDir', webDir, '--emptyOutDir'],
  { cwd: appRoot, stdio: 'inherit', env: { ...process.env, ISQUARED_BASE_PATH: basePath } },
)
if (build.status !== 0) throw new Error(`vite build failed with exit code ${build.status}`)

const petPreviewsProvenance = {}
const extraArchiveEntries = new Set()

if (!args.noPetPreviews) {
  const defaults = resolvePetPreviewDirs({
    prototypeRoot: appRoot,
    v1Dir: args.petV1 || undefined,
    v2Dir: args.petV2 || undefined,
  })
  for (const [ver, dir] of [['v1', defaults.v1Dir], ['v2', defaults.v2Dir]]) {
    const hasIndex = dir && fs.existsSync(path.join(dir, 'index.html'))
    if (!hasIndex) {
      if (args.requirePetPreviews) {
        throw new Error(`Required Pet ${ver} preview not found at ${dir}`)
      }
      continue
    }
    const staged = stagePetPreview(ver, dir, webDir, outRoot)
    petPreviewsProvenance[ver] = staged.manifestInfo
    for (const rel of staged.archiveExtras) extraArchiveEntries.add(rel)
    console.log(`[build-hosted] staged Pet ${ver} preview -> web/preview/pet-show-and-tell/${ver}`)
  }
}

const { errors, files } = verifyHostedOutput({
  dir: webDir,
  basePath,
  requirePetPreviews: args.requirePetPreviews,
})
if (errors.length > 0) {
  console.error('[build-hosted] verification failed:')
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

const totalBytes = files.reduce((sum, rel) => sum + fs.statSync(path.join(webDir, rel)).size, 0)
const fileHashes = outputFileHashes(webDir)
const manifest = {
  basePath,
  builtAt: new Date().toISOString(),
  gitCommit: git('rev-parse', 'HEAD') || null,
  gitDirty: git('status', '--porcelain', '--', '.') !== '',
  fileCount: files.length,
  totalBytes,
  indexHtmlSha256: sha256File(path.join(webDir, 'index.html')),
  fileHashes,
  ...(Object.keys(petPreviewsProvenance).length > 0 ? { petPreviews: petPreviewsProvenance } : {}),
}
fs.writeFileSync(path.join(outRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

const provenance = {
  schemaVersion: 1,
  builtAt: manifest.builtAt,
  i2: {
    gitBranch: git('branch', '--show-current') || null,
    gitCommit: manifest.gitCommit,
    gitDirty: manifest.gitDirty,
    basePath,
    indexHtmlSha256: manifest.indexHtmlSha256,
  },
  petPreviews: petPreviewsProvenance,
  hostingShim: {
    applied: Object.keys(petPreviewsProvenance).length > 0,
    marker: 'data-i2-pet-index-shim="1"',
    purpose: 'Normalizes trailing /index.html to / via history.replaceState before Expo Router boots.',
  },
}
fs.writeFileSync(path.join(outRoot, 'provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`)

const shaLines = []
for (const [rel, hash] of Object.entries(fileHashes).sort(([a], [b]) => a.localeCompare(b))) {
  shaLines.push(`${hash}  web/${rel}`)
}
for (const metaRel of ['manifest.json', 'provenance.json', ...[...extraArchiveEntries].sort()]) {
  const abs = path.join(outRoot, metaRel)
  if (fs.existsSync(abs)) shaLines.push(`${sha256File(abs)}  ${metaRel}`)
}
fs.writeFileSync(path.join(outRoot, 'SHA256SUMS'), `${shaLines.join('\n')}\n`)

if (args.archive) {
  // Relative names with cwd=outRoot: GNU tar reads "C:\..." as a remote host:path.
  const archive = path.join(outRoot, ARCHIVE_NAME)
  const archiveItems = ['web', 'manifest.json', 'provenance.json', 'SHA256SUMS']
  if (extraArchiveEntries.size > 0) archiveItems.push('manifests')
  const tar = spawnSync('tar', ['-czf', ARCHIVE_NAME, ...archiveItems], { cwd: outRoot, stdio: 'inherit' })
  if (tar.status !== 0) throw new Error('tar failed; copy dist-hosted/web manually instead')
  // Sidecar rather than manifest.json: rewriting the manifest here would invalidate SHA256SUMS.
  fs.writeFileSync(path.join(outRoot, ARCHIVE_SHA256_NAME), `${sha256File(archive)}  ${ARCHIVE_NAME}\n`)
  console.log(`[build-hosted] archive ${path.relative(appRoot, archive)}`)
}

console.log(`[build-hosted] OK: ${files.length} files, ${(totalBytes / 1048576).toFixed(1)} MiB, verification passed`)
