// Builds the browser prototype for deployment under a subpath (default /iSquared/).
//   node scripts/build-hosted.mjs [--base /iSquared/] [--out dist-hosted] [--archive]
// Output: <out>/web (static files), <out>/manifest.json, optionally <out>/isquared-web.tgz.
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
import { outputFileHashes, validateHostedOutputLocation } from './lib/hosted-output-safety.mjs'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  const args = { base: DEFAULT_HOSTED_BASE_PATH, out: 'dist-hosted', archive: false }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--archive') args.archive = true
    else if (token === '--base' || token === '--out') {
      const value = argv[(index += 1)]
      if (!value) throw new Error(`${token} requires a value`)
      args[token.slice(2)] = value
    } else throw new Error(`Unknown argument: ${token}`)
  }
  return args
}

function git(...gitArgs) {
  const result = spawnSync('git', gitArgs, { cwd: appRoot, encoding: 'utf8' })
  return result.status === 0 ? result.stdout.trim() : ''
}

const args = parseArgs(process.argv.slice(2))
const basePath = normalizeBasePath(args.base)
const outRoot = path.resolve(appRoot, args.out)
const webDir = path.join(outRoot, 'web')

const viteBin = path.join(
  path.dirname(createRequire(import.meta.url).resolve('vite/package.json')),
  'bin',
  'vite.js',
)
const previousManifest = validateHostedOutputLocation(appRoot, outRoot, args.archive)
fs.mkdirSync(outRoot, { recursive: true })
console.log(`[build-hosted] base ${basePath} -> ${path.relative(appRoot, webDir)}`)
const build = spawnSync(
  process.execPath,
  [viteBin, 'build', '--config', 'vite.figma.config.ts', '--mode', 'production', '--outDir', webDir, '--emptyOutDir'],
  { cwd: appRoot, stdio: 'inherit', env: { ...process.env, ISQUARED_BASE_PATH: basePath } },
)
if (build.status !== 0) throw new Error(`vite build failed with exit code ${build.status}`)

const { errors, files } = verifyHostedOutput({ dir: webDir, basePath })
if (errors.length > 0) {
  console.error('[build-hosted] verification failed:')
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

const totalBytes = files.reduce((sum, rel) => sum + fs.statSync(path.join(webDir, rel)).size, 0)
const manifest = {
  basePath,
  builtAt: new Date().toISOString(),
  gitCommit: git('rev-parse', 'HEAD') || null,
  gitDirty: git('status', '--porcelain', '--', '.') !== '',
  fileCount: files.length,
  totalBytes,
  indexHtmlSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(webDir, 'index.html'))).digest('hex'),
  fileHashes: outputFileHashes(webDir),
  ...(previousManifest?.archiveSha256 ? { archiveSha256: previousManifest.archiveSha256 } : {}),
}
fs.writeFileSync(path.join(outRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

if (args.archive) {
  // Relative names with cwd=outRoot: GNU tar reads "C:\..." as a remote host:path.
  const archive = path.join(outRoot, 'isquared-web.tgz')
  const tar = spawnSync('tar', ['-czf', 'isquared-web.tgz', 'web', 'manifest.json'], { cwd: outRoot, stdio: 'inherit' })
  if (tar.status !== 0) throw new Error('tar failed; copy dist-hosted/web manually instead')
  manifest.archiveSha256 = crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex')
  fs.writeFileSync(path.join(outRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`[build-hosted] archive ${path.relative(appRoot, archive)}`)
}

console.log(`[build-hosted] OK: ${files.length} files, ${(totalBytes / 1048576).toFixed(1)} MiB, verification passed`)
