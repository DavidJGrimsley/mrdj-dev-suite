import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const entryExists = (file) => { try { fs.lstatSync(file); return true } catch (error) { if (error.code === 'ENOENT') return false; throw error } }

export function outputFileHashes(dir) {
  const files = {}
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isSymbolicLink()) throw new Error(`Output contains a symlink: ${full}`)
      if (entry.isDirectory()) {
        if (fs.readdirSync(full).length === 0) throw new Error(`Output contains an untracked empty directory: ${full}`)
        visit(full)
      }
      else if (entry.isFile()) files[path.relative(dir, full).split(path.sep).join('/')] = sha256(full)
      else throw new Error(`Unexpected output entry: ${full}`)
    }
  }
  visit(dir)
  return files
}

/** Permit replacing only a verified earlier hosted build; preserve all other output-root files. */
export function validateHostedOutputLocation(appRoot, outRoot, archive) {
  const relative = path.relative(appRoot, outRoot)
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`--out must be a subdirectory of ${appRoot}`)
  }
  let current = appRoot
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part)
    if (entryExists(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error(`--out cannot traverse a symlink: ${current}`)
  }
  const web = path.join(outRoot, 'web')
  const manifestPath = path.join(outRoot, 'manifest.json')
  const archivePath = path.join(outRoot, 'isquared-web.tgz')
  for (const file of [web, manifestPath, archivePath]) {
    if (entryExists(file) && fs.lstatSync(file).isSymbolicLink()) throw new Error(`Output cannot be a symlink: ${file}`)
  }
  const webExists = fs.existsSync(web)
  const manifestExists = fs.existsSync(manifestPath)
  if (!webExists && !manifestExists && (!archive || !fs.existsSync(archivePath))) return
  if (!webExists || !manifestExists || !fs.statSync(web).isDirectory()) {
    throw new Error('Refusing to overwrite output without a matching hosted build manifest.')
  }
  let manifest
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) } catch { throw new Error('Refusing to overwrite an invalid hosted build manifest.') }
  const hashes = outputFileHashes(web)
  if (!hashes['index.html'] || hashes['index.html'] !== manifest.indexHtmlSha256 || Object.keys(hashes).length !== manifest.fileCount) {
    throw new Error('Refusing to replace output changed since the previous hosted build.')
  }
  if (!manifest.fileHashes || typeof manifest.fileHashes !== 'object' || Array.isArray(manifest.fileHashes)) {
    throw new Error('The previous hosted build has no file inventory. Review it and choose a fresh output directory before rebuilding.')
  }
  if (Object.keys(manifest.fileHashes).length !== Object.keys(hashes).length || Object.entries(hashes).some(([name, hash]) => manifest.fileHashes[name] !== hash)) {
    throw new Error('Refusing to replace output changed since the previous hosted build.')
  }
  if (archive && fs.existsSync(archivePath) && (!manifest.archiveSha256 || sha256(archivePath) !== manifest.archiveSha256)) {
    throw new Error('Refusing to overwrite an archive not recorded by the previous hosted build.')
  }
  return manifest
}
