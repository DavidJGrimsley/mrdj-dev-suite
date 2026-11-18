// Synchronizes the Pet owner's generated plan, task label, manifest hashes, and git diff
// into apps/i2-ide-prototype/public/workspace-files/pet-add-comments.json so the i2 replay
// displays the exact plan.md and inspectable per-file source diff hunks.
//
// Applies secret/user-path/local-URL hygiene filters matching snapshot-workspace-files.mjs.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const defaultPetGenDir = path.resolve(appRoot, '../../../generated/pet-add-comments-2026-11-16/pet')
const defaultOutFile = path.join(appRoot, 'public', 'workspace-files', 'pet-add-comments.json')

const FORBIDDEN_PATTERNS = [
  { name: 'Windows user path', re: /[A-Za-z]:\\Users\\[^\\\s]+/ },
  { name: 'macOS/Linux home path', re: /\/(?:Users|home)\/[A-Za-z0-9._-]+\// },
  { name: 'loopback URL', re: /(?:https?|wss?):\/\/(?:localhost|127\.0\.0\.1|\[::1\])/i },
  { name: 'private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'scrypt/beta secret', re: /ISQUARED_BETA_CODE_PEPPER|ISQUARED_ADMIN_PASSWORD_HASH|scrypt\$/ },
]

function parseArgs(argv) {
  const args = { petDir: defaultPetGenDir, out: defaultOutFile }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--pet-dir' && argv[i + 1]) args.petDir = path.resolve(argv[++i])
    else if (argv[i] === '--out' && argv[i + 1]) args.out = path.resolve(argv[++i])
    else throw new Error(`Unknown or incomplete argument: ${argv[i]}`)
  }
  return args
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex')
}

function assertCleanText(label, text) {
  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.re.test(text)) {
      throw new Error(`Security hygiene check failed (${rule.name}) in ${label}`)
    }
  }
}

export function parseUnifiedPatch(patchText) {
  const files = []
  let current = null
  const lines = patchText.split(/\r?\n/)
  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      if (current) {
        current.hunk = current._lines.join('\n').trimEnd() + '\n'
        delete current._lines
        files.push(current)
      }
      const m = line.match(/^diff --git a\/(.+?) b\/(.+)$/)
      const filePath = m ? m[2] : line.slice('diff --git '.length)
      current = {
        status: 'M',
        name: path.posix.basename(filePath),
        path: filePath,
        addCount: 0,
        delCount: 0,
        add: '+0',
        del: '-0',
        hunk: '',
        _lines: [line],
      }
      continue
    }
    if (!current) continue
    current._lines.push(line)
    if (line.startsWith('new file mode')) current.status = 'A'
    else if (line.startsWith('deleted file mode')) current.status = 'D'
    else if (line.startsWith('+') && !line.startsWith('+++')) current.addCount += 1
    else if (line.startsWith('-') && !line.startsWith('---')) current.delCount += 1
  }
  if (current) {
    current.hunk = current._lines.join('\n').trimEnd() + '\n'
    delete current._lines
    files.push(current)
  }
  for (const f of files) {
    f.add = `+${f.addCount}`
    f.del = `-${f.delCount}`
  }
  return files
}

export function buildPetArtifactsBundle(petDir) {
  const planPath = path.join(petDir, 'plan.md')
  const taskLabelPath = path.join(petDir, 'prototype-task-label.txt')
  const patchPath = path.join(petDir, 'diff-6e17795.patch')
  const v1ManifestPath = path.join(petDir, 'v1', 'manifest.json')
  const v2ManifestPath = path.join(petDir, 'v2', 'manifest.json')

  const planMd = fs.readFileSync(planPath, 'utf8').replace(/\r\n/g, '\n')
  const taskLabel = fs.readFileSync(taskLabelPath, 'utf8').trim()
  const patchText = fs.readFileSync(patchPath, 'utf8').replace(/\r\n/g, '\n')
  const v1Manifest = JSON.parse(fs.readFileSync(v1ManifestPath, 'utf8'))
  const v2Manifest = JSON.parse(fs.readFileSync(v2ManifestPath, 'utf8'))

  assertCleanText('plan.md', planMd)
  assertCleanText('prototype-task-label.txt', taskLabel)
  assertCleanText('diff-6e17795.patch', patchText)

  const parsedFiles = parseUnifiedPatch(patchText)
  const totalAdd = parsedFiles.reduce((acc, f) => acc + f.addCount, 0)
  const totalDel = parsedFiles.reduce((acc, f) => acc + f.delCount, 0)

  return {
    schemaVersion: 1,
    baseCommit: '6e177950bfbfb36a8769e67fac72d838a791da8e',
    taskLabel,
    planMd,
    diffSha256: sha256Text(fs.readFileSync(patchPath, 'utf8')),
    v1IndexHtmlSha256: v1Manifest.indexHtmlSha256 || null,
    v2IndexHtmlSha256: v2Manifest.indexHtmlSha256 || null,
    summary: {
      commitFiles: `${parsedFiles.length} files`,
      branchFiles: `${parsedFiles.length} files`,
      add: `+${totalAdd}`,
      del: `-${totalDel}`,
    },
    files: parsedFiles.map(({ status, name, path: filePath, add, del, hunk }) => ({
      status,
      name,
      path: filePath,
      add,
      del,
      hunk,
    })),
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
if (isCli) {
  const args = parseArgs(process.argv.slice(2))
  const bundle = buildPetArtifactsBundle(args.petDir)
  fs.mkdirSync(path.dirname(args.out), { recursive: true })
  fs.writeFileSync(args.out, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8')
  console.log(
    `[sync-pet-artifacts] wrote ${path.relative(appRoot, args.out)}: ${bundle.files.length} files (${bundle.summary.add} ${bundle.summary.del}), taskLabel=${JSON.stringify(bundle.taskLabel)}`,
  )
}
