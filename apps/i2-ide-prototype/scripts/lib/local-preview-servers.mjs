import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'

export const DEFAULT_PREFERRED_PORTS = Object.freeze({
  v1: 8792,
  v2: 8791,
})

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.plan': 'application/json; charset=utf-8',
}

/**
 * Resolve existing v1 and v2 snapshot directories from the workspace layout without copying files.
 */
export function resolveSnapshotDirs(options = {}) {
  const libDir = import.meta.dirname
  const prototypeRoot = options.prototypeRoot ?? path.resolve(libDir, '../..')
  const workspaceRoot = options.workspaceRoot ?? path.resolve(prototypeRoot, '../../..')
  const tutorialDir = path.join(workspaceRoot, 'generated', 'exact-jenny', 'tutorial')
  return {
    v1Dir: options.v1Dir ?? path.join(tutorialDir, 'v1-starter', 'extracted'),
    v2Dir: options.v2Dir ?? path.join(tutorialDir, 'v2-merged', 'dist'),
  }
}

export async function sha256File(filePath) {
  const bytes = await fsp.readFile(filePath)
  return crypto.createHash('sha256').update(bytes).digest('hex')
}

function requestBuffer(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode ?? 0,
          body: Buffer.concat(chunks),
        })
      })
    })
    req.setTimeout(timeoutMs, () => {
      req.destroy()
      resolve(null)
    })
    req.on('error', () => resolve(null))
  })
}

/**
 * Verify that a running server on `url` serves the exact `/app.js` SHA-256 of the expected snapshot.
 * Returns false on connection errors, non-200 status, or content mismatch so unrelated servers are never reused or killed.
 */
export async function verifyExistingPreviewServer(url, expectedSha256, options = {}) {
  if (!url || !expectedSha256) return false
  const target = `${url.replace(/\/+$/, '')}/app.js`
  const response = await requestBuffer(target, options.timeoutMs ?? 1500)
  if (!response || response.statusCode !== 200) return false
  const actualSha = crypto.createHash('sha256').update(response.body).digest('hex')
  return actualSha === expectedSha256
}

function createStaticRequestHandler(rootDir) {
  const resolvedRoot = path.resolve(rootDir)
  const indexCandidate = fs.existsSync(path.join(resolvedRoot, 'index.html'))
    ? path.join(resolvedRoot, 'index.html')
    : path.join(resolvedRoot, 'shell.html')

  return async (req, res) => {
    const method = (req.method || 'GET').toUpperCase()
    if (method !== 'GET' && method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Method Not Allowed')
      return
    }

    const rawUrl = (req.url || '/').split('?')[0].split('#')[0]
    let decodedPath = '/'
    try {
      decodedPath = decodeURIComponent(rawUrl)
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Bad Request')
      return
    }

    const rel = decodedPath.replace(/^\/+/, '')
    let candidate = rel ? path.resolve(resolvedRoot, rel) : indexCandidate
    if (candidate !== resolvedRoot && !candidate.startsWith(resolvedRoot + path.sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Forbidden')
      return
    }

    try {
      const stat = await fsp.stat(candidate)
      if (stat.isDirectory()) {
        candidate = indexCandidate
      }
    } catch {
      const ext = path.extname(candidate)
      if (!ext && fs.existsSync(indexCandidate)) {
        candidate = indexCandidate
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Not Found')
        return
      }
    }

    try {
      const ext = path.extname(candidate).toLowerCase()
      const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'
      const body = method === 'HEAD' ? null : await fsp.readFile(candidate)
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      })
      res.end(body ?? undefined)
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Internal Server Error')
    }
  }
}

function listenOnPort(server, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.removeListener('listening', onListening)
      reject(err)
    }
    const onListening = () => {
      server.removeListener('error', onError)
      const addr = server.address()
      resolve(typeof addr === 'object' && addr ? addr.port : port)
    }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, host)
  })
}

/**
 * Ensure a local static preview server is serving `rootDir` directly (no file copying).
 * Checks `preferredPort` by verifying `/app.js` SHA-256 first, reuses only verified matches,
 * and falls back to an OS-assigned ephemeral port on conflict without killing unrelated processes.
 */
export async function startSnapshotStaticServer(options) {
  const {
    rootDir,
    preferredPort = 0,
    host = '127.0.0.1',
    allowEphemeralFallback = true,
  } = options

  const appJsPath = path.join(rootDir, 'app.js')
  const expectedSha256 = fs.existsSync(appJsPath) ? await sha256File(appJsPath) : null

  if (preferredPort > 0 && expectedSha256) {
    const candidateUrl = `http://${host}:${preferredPort}`
    const verified = await verifyExistingPreviewServer(candidateUrl, expectedSha256)
    if (verified) {
      return {
        url: candidateUrl,
        port: preferredPort,
        rootDir,
        reused: true,
        close: async () => {},
      }
    }
  }

  const sockets = new Set()
  const server = http.createServer(createStaticRequestHandler(rootDir))
  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
  })

  let boundPort
  try {
    boundPort = await listenOnPort(server, preferredPort, host)
  } catch (err) {
    if (err && err.code === 'EADDRINUSE' && allowEphemeralFallback && preferredPort !== 0) {
      boundPort = await listenOnPort(server, 0, host)
    } else {
      throw err
    }
  }

  let closed = false
  const close = async () => {
    if (closed) return
    closed = true
    for (const socket of sockets) {
      socket.destroy()
    }
    sockets.clear()
    await new Promise((resolve) => server.close(() => resolve()))
  }

  return {
    url: `http://${host}:${boundPort}`,
    port: boundPort,
    rootDir,
    reused: false,
    close,
  }
}

/**
 * Start or reuse local snapshot preview servers for both v1 and v2 directly from existing snapshots.
 */
export async function ensureLocalPreviewServers(options = {}) {
  const {
    v1Dir: customV1,
    v2Dir: customV2,
    preferredPorts = DEFAULT_PREFERRED_PORTS,
    host = '127.0.0.1',
    allowEphemeralFallback = true,
  } = options
  const defaults = resolveSnapshotDirs(options)
  const v1Dir = customV1 ?? defaults.v1Dir
  const v2Dir = customV2 ?? defaults.v2Dir

  const servers = {}
  const urls = { v1: '', v2: '' }

  if (fs.existsSync(v1Dir)) {
    const v1Server = await startSnapshotStaticServer({
      rootDir: v1Dir,
      preferredPort: preferredPorts.v1 ?? DEFAULT_PREFERRED_PORTS.v1,
      host,
      allowEphemeralFallback,
    })
    servers.v1 = v1Server
    urls.v1 = v1Server.url
  }

  if (fs.existsSync(v2Dir)) {
    const v2Server = await startSnapshotStaticServer({
      rootDir: v2Dir,
      preferredPort: preferredPorts.v2 ?? DEFAULT_PREFERRED_PORTS.v2,
      host,
      allowEphemeralFallback,
    })
    servers.v2 = v2Server
    urls.v2 = v2Server.url
  }

  const closeAll = async () => {
    await Promise.all([
      servers.v1 ? servers.v1.close() : Promise.resolve(),
      servers.v2 ? servers.v2.close() : Promise.resolve(),
    ])
  }

  return { urls, servers, closeAll }
}

/**
 * Dev-only Vite plugin (`apply: 'serve'`) that ensures local snapshot servers are running
 * and injects their resolved URLs into `window.__ISQUARED_PREVIEW_URLS__`.
 * Excluded completely from `vite build` / `build:hosted`.
 */
export function createPreviewServersVitePlugin(options = {}) {
  let startupPromise = null
  let resolvedUrls = { v1: '', v2: '' }
  let handle = null

  const ensureStarted = () => {
    if (process.env.ISQUARED_DISABLE_AUTO_PREVIEW_SERVERS === '1') {
      return Promise.resolve({ urls: resolvedUrls, closeAll: async () => {} })
    }
    if (!startupPromise) {
      startupPromise = ensureLocalPreviewServers(options)
        .then((res) => {
          handle = res
          resolvedUrls = res.urls
          return res
        })
        .catch(() => ({ urls: resolvedUrls, closeAll: async () => {} }))
    }
    return startupPromise
  }

  return {
    name: 'isquared-local-preview-servers',
    apply: 'serve',
    configureServer(server) {
      void ensureStarted()
      const cleanup = () => {
        if (handle) {
          const current = handle
          handle = null
          void current.closeAll()
        }
      }
      server.httpServer?.once('close', cleanup)
      process.once('exit', cleanup)
    },
    async transformIndexHtml() {
      await ensureStarted()
      if (!resolvedUrls.v1 && !resolvedUrls.v2) return []
      return [
        {
          tag: 'script',
          injectTo: 'head-prepend',
          children: `window.__ISQUARED_PREVIEW_URLS__ = Object.assign({}, window.__ISQUARED_PREVIEW_URLS__, ${JSON.stringify(resolvedUrls)});`,
        },
      ]
    },
  }
}

/** Paths Pet Show and Tell's v1 and v2 web exports are built for (`baseUrl`). */
export const PET_PREVIEW_MOUNT = '/iSquared/preview/pet-show-and-tell'
export const PET_PREVIEW_V1_MOUNT = '/iSquared/preview/pet-show-and-tell/v1'
export const PET_PREVIEW_V2_MOUNT = '/iSquared/preview/pet-show-and-tell/v2'

/**
 * Narrow pre-router path normalization shim for Expo Router static web exports loaded via explicit
 * `.../index.html` URLs (so Expo Router sees `.../` instead of `.../index.html` -> `+not-found`).
 */
export const PET_PRE_ROUTER_SHIM_MARKER = 'data-i2-pet-index-shim="1"'
export const PET_PRE_ROUTER_SHIM_SCRIPT =
  `<script ${PET_PRE_ROUTER_SHIM_MARKER}>(function(){var p=location.pathname;if(/\\/index\\.html$/.test(p)){history.replaceState(null,"",p.replace(/\\/index\\.html$/,"/")+location.search+location.hash);}})();</script>`

export function applyPetPreRouterPathShim(html) {
  if (typeof html !== 'string' || html.includes(PET_PRE_ROUTER_SHIM_MARKER)) return html
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n    ${PET_PRE_ROUTER_SHIM_SCRIPT}`)
  }
  return `${PET_PRE_ROUTER_SHIM_SCRIPT}\n${html}`
}

/**
 * Resolve the Pet Show and Tell v1 and v2 web export directories on disk.
 */
export function resolvePetPreviewDirs(options = {}) {
  const prototypeRoot = options.prototypeRoot ?? path.resolve(import.meta.dirname, '../..')
  const workspaceRoot = options.workspaceRoot ?? path.resolve(prototypeRoot, '../../..')
  const generatedPetRoot = path.resolve(workspaceRoot, 'generated', 'pet-add-comments-2026-11-16', 'pet')
  const defaultV1 = path.join(generatedPetRoot, 'v1', 'web')
  const fallbackV1 = path.resolve(workspaceRoot, '..', 'pet-show-and-tell', 'dist-web', 'web')
  const v1Dir = options.v1Dir
    ? path.resolve(options.v1Dir)
    : process.env.ISQUARED_PET_V1_DIR
      ? path.resolve(process.env.ISQUARED_PET_V1_DIR)
      : process.env.ISQUARED_PET_PREVIEW_DIR
        ? path.resolve(process.env.ISQUARED_PET_PREVIEW_DIR)
        : fs.existsSync(path.join(defaultV1, 'index.html'))
          ? defaultV1
          : fallbackV1
  const v2Dir = options.v2Dir
    ? path.resolve(options.v2Dir)
    : process.env.ISQUARED_PET_V2_DIR
      ? path.resolve(process.env.ISQUARED_PET_V2_DIR)
      : path.join(generatedPetRoot, 'v2', 'web')
  return { v1Dir, v2Dir }
}

export function resolvePetPreviewDir(options = {}) {
  if (options.dir) return path.resolve(options.dir)
  return resolvePetPreviewDirs(options).v1Dir
}

/**
 * Exact-file static request handler for nested Pet preview mounts (no SPA fallback for missing
 * files) that applies the narrow pre-router path normalization shim to `index.html`.
 */
export function createPetStaticRequestHandler(rootDir) {
  const resolvedRoot = path.resolve(rootDir)
  return async (req, res) => {
    const method = (req.method || 'GET').toUpperCase()
    if (method !== 'GET' && method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Method Not Allowed')
      return
    }
    const rawUrl = (req.url || '/').split('?')[0].split('#')[0]
    let decodedPath = '/'
    try {
      decodedPath = decodeURIComponent(rawUrl)
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Bad Request')
      return
    }
    const rel = decodedPath.replace(/^\/+/, '')
    let candidate = rel ? path.resolve(resolvedRoot, rel) : path.join(resolvedRoot, 'index.html')
    if (candidate !== resolvedRoot && !candidate.startsWith(resolvedRoot + path.sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Forbidden')
      return
    }
    try {
      const stat = await fsp.stat(candidate)
      if (stat.isDirectory()) {
        candidate = path.join(candidate, 'index.html')
        await fsp.stat(candidate)
      }
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Not Found')
      return
    }
    try {
      const ext = path.extname(candidate).toLowerCase()
      const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'
      if (path.basename(candidate) === 'index.html') {
        const html = applyPetPreRouterPathShim(await fsp.readFile(candidate, 'utf8'))
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        })
        res.end(method === 'HEAD' ? undefined : html)
        return
      }
      const body = method === 'HEAD' ? null : await fsp.readFile(candidate)
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      })
      res.end(body ?? undefined)
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Internal Server Error')
    }
  }
}

/**
 * Dev-only Vite plugin: serves both Pet Show and Tell v1 and v2 web exports from their own
 * directories at `PET_PREVIEW_V1_MOUNT` and `PET_PREVIEW_V2_MOUNT` on the dev server (same origin,
 * no copying), matching the hosted site layout.
 */
export function createPetPreviewVitePlugin(options = {}) {
  return {
    name: 'isquared-pet-web-preview',
    apply: 'serve',
    configureServer(server) {
      const { v1Dir, v2Dir } = resolvePetPreviewDirs(options)
      if (fs.existsSync(path.join(v1Dir, 'index.html'))) {
        const v1Handler = createPetStaticRequestHandler(v1Dir)
        server.middlewares.use(PET_PREVIEW_V1_MOUNT, (req, res) => {
          void v1Handler(req, res)
        })
      }
      if (fs.existsSync(path.join(v2Dir, 'index.html'))) {
        const v2Handler = createPetStaticRequestHandler(v2Dir)
        server.middlewares.use(PET_PREVIEW_V2_MOUNT, (req, res) => {
          void v2Handler(req, res)
        })
      }
    },
  }
}
