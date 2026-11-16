#!/usr/bin/env node
// Snapshots real, git-tracked text files from one or more local repositories into
// public/workspace-files/<id>.json so the prototype's Explorer, Project Folder and Plan.md
// widgets open actual file contents instead of placeholders.
//
// Usage:
//   node scripts/snapshot-workspace-files.mjs --id experimemo --root-name experimemo-i2Workspace \
//     --mount main=<path-to-repo> --mount project=<path-to-project-repo> [--mount <label>=<path>[::<subdir>]]
//
// A mount copies a repository (or one sub-directory of it, after `::`) under <label>/ in the
// snapshot. Add `!<prefix>` entries with --exclude to leave paths out of a mount, e.g.
//   --mount main=../pet-show-and-tell --exclude main=project/
//
// Safety rules (the snapshot ships inside a publicly hosted bundle):
//   - only files tracked by git are read, never untracked or ignored files
//   - only an allowlist of text extensions, capped per file
//   - env files, lockfiles, credentials, build output and native signing files are skipped
//   - every file is scanned for secret-looking strings; any hit aborts the snapshot
//   - local absolute path roots inside file contents are rewritten to <local>/ and loopback
//     URLs to <scheme>://<loopback>; no source repository path is written to the output
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "..", "public", "workspace-files");

const TEXT_EXT = new Set([
  ".md", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".jsonc", ".css", ".contract", ".txt", ".yml", ".yaml",
]);
const MAX_BYTES = 150 * 1024;
const SKIP_PATTERNS = [
  /(^|\/)\.env/i,
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/,
  /(^|\/)(node_modules|.claude|.agents|.cline|dist|dist\.gen|dist-web|build|target|tmp|temp|store|\.expo|\.exact|\.mds|\.vscode|\.github|\.git)\//,
  /(^|\/)(eas\.json|app\.config\.[cm]?js|google-services\.json|GoogleService-Info\.plist)$/,
  /\.(keystore|jks|p8|p12|pem|key|mobileprovision)$/i,
  /(credential|secret)/i,
];
const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bsk-[A-Za-z0-9_-]{24,}\b/,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
];

function parseArgs(argv) {
  const args = { mounts: [], excludes: {} };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--id") { args.id = value; i++; }
    else if (flag === "--root-name") { args.rootName = value; i++; }
    else if (flag === "--mount") {
      const eq = value.indexOf("=");
      const label = value.slice(0, eq);
      const [repo, subdir = ""] = value.slice(eq + 1).split("::");
      args.mounts.push({ label, repo: path.resolve(repo), subdir: subdir.replace(/\\/g, "/").replace(/\/?$/, subdir ? "/" : "") });
      i++;
    } else if (flag === "--exclude") {
      const eq = value.indexOf("=");
      (args.excludes[value.slice(0, eq)] ??= []).push(value.slice(eq + 1));
      i++;
    } else {
      throw new Error(`Unknown argument: ${flag}`);
    }
  }
  if (!args.id || !/^[a-z0-9-]+$/.test(args.id)) throw new Error("--id <lowercase-id> is required");
  if (!args.rootName) throw new Error("--root-name <workspace folder name> is required");
  if (args.mounts.length === 0) throw new Error("at least one --mount <label>=<repo path> is required");
  return args;
}

function git(repo, gitArgs) {
  return execFileSync("git", ["-C", repo, ...gitArgs], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

const LOCAL_PATH_ROOT = /\b[A-Za-z]:[\\/]+(?:Users[\\/]+[^\\/\s"'`]+|[A-Za-z0-9_.-]+)[\\/]+/g;

const LOOPBACK_URL = /\b(https?|wss?):\/\/(?:localhost|127\.0\.0\.1|\[::1\])/gi;

function snapshot(args) {
  let redactions = 0;
  const files = [];
  const sources = [];
  const skipped = [];
  for (const mount of args.mounts) {
    const tracked = git(mount.repo, ["ls-files", "-z"]).split("\0").filter(Boolean);
    const commit = git(mount.repo, ["rev-parse", "--short", "HEAD"]).trim();
    const excludes = args.excludes[mount.label] ?? [];
    let count = 0;
    for (const rel of tracked) {
      if (mount.subdir && !rel.startsWith(mount.subdir)) continue;
      const inner = mount.subdir ? rel.slice(mount.subdir.length) : rel;
      if (excludes.some((prefix) => inner.startsWith(prefix))) continue;
      if (!TEXT_EXT.has(path.extname(rel).toLowerCase())) { skipped.push(`${mount.label}/${inner} (type)`); continue; }
      if (SKIP_PATTERNS.some((re) => re.test(rel))) { skipped.push(`${mount.label}/${inner} (rule)`); continue; }
      const abs = path.join(mount.repo, rel);
      if (!fs.existsSync(abs)) continue;
      const stat = fs.statSync(abs);
      if (!stat.isFile() || stat.size > MAX_BYTES) { skipped.push(`${mount.label}/${inner} (size)`); continue; }
      const content = fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
      if (content.includes("\u0000")) { skipped.push(`${mount.label}/${inner} (binary)`); continue; }
      const hit = SECRET_PATTERNS.find((re) => re.test(content));
      if (hit) {
        throw new Error(`Secret-looking content (${hit}) in ${mount.label}/${inner}. Nothing was written; remove or exclude the file.`);
      }
      // Local absolute paths (drive roots, user profile folders) are not part of what the
      // file means; rewrite them so the public bundle does not describe this machine.
      // Loopback URLs are rewritten too: the hosted-build verifier (scripts/lib/
      // verify-hosted-output.mjs) rejects any shipped file that references localhost.
      const redacted = content
        .replace(LOCAL_PATH_ROOT, () => { redactions++; return "<local>/"; })
        .replace(LOOPBACK_URL, (_m, scheme) => { redactions++; return `${scheme}://<loopback>`; });
      files.push({ path: `${mount.label}/${inner}`, content: redacted });
      count++;
    }
    sources.push({ mount: mount.label, commit, files: count });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { id: args.id, rootName: args.rootName, sources, files, skipped, redactions };
}

const args = parseArgs(process.argv.slice(2));
const { skipped, redactions, ...bundle } = snapshot(args);
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${args.id}.json`);
fs.writeFileSync(outFile, `${JSON.stringify(bundle)}\n`);
const bytes = fs.statSync(outFile).size;
console.log(`Wrote public/workspace-files/${args.id}.json: ${bundle.files.length} files, ${(bytes / 1024).toFixed(1)} KB`);
for (const s of bundle.sources) console.log(`  ${s.mount}: ${s.files} files`);
if (redactions) console.log(`  rewrote ${redactions} local path root(s) / loopback URL(s)`);
if (skipped.length) console.log(`  skipped ${skipped.length}: ${skipped.slice(0, 12).join(", ")}${skipped.length > 12 ? ", …" : ""}`);
