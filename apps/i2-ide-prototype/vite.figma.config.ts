import {
  defineConfig,
  mergeConfig,
  type ConfigEnv,
  type HtmlTagDescriptor,
  type Plugin,
  type UserConfig,
} from 'vite'
import path from 'node:path'

import siteConfiguration from './.figma/make/site.json'
import packageAliases from './.figma/make/migrated-package-aliases.json'
import userConfig from './vite.config'

const FIGMA_ASSET_PREFIX = 'figma:asset/'

export default defineConfig(async (env) =>
  mergeConfig(await resolveUserConfig(env), {
    resolve: {
      alias: Object.entries<string>(packageAliases).map(([find, replacement]) => ({
        find,
        replacement,
      })),
    },
    base: process.env.FIGMA_PUBLIC_URL ? `${process.env.FIGMA_PUBLIC_URL}/` : '/',
    build: {
      sourcemap: env.mode === 'development' ? 'inline' : false,
      minify: env.mode !== 'development',
    },
    plugins: [
      figmaPackageSchemeResolver(),
      figmaAssetResolver(),
      figmaSiteConfiguration(siteConfiguration),
      figmaErrorOverlayReplay(),
      figmaReactRefreshBoundaryFallback(),
      figmaMakeKitPlugin({ storiesGlob: '/src/**/*.stories.{ts,tsx,js,jsx}' }),
    ],
    server: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
      strictPort: true,
      watch: { ignored: ['**/.figma/**'] },
    },
    preview: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
    },
  }),
)

async function resolveUserConfig(env: ConfigEnv): Promise<UserConfig> {
  return typeof userConfig === 'function' ? await userConfig(env) : await userConfig
}

function figmaPackageSchemeResolver(): Plugin {
  return {
    name: 'figma-package-scheme-resolver',
    enforce: 'pre',
    async resolveId(id, importer) {
      let normalizedId: string | undefined
      if (id.startsWith('npm:')) {
        normalizedId = id.slice(4)
      } else if (id.startsWith('jsr:@')) {
        normalizedId = `@jsr/${id.slice(5).replace('/', '__')}`
      }

      if (!normalizedId) return
      return this.resolve(normalizedId, importer, { skipSelf: true })
    },
  }
}

function figmaAssetResolver(): Plugin {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (!id.startsWith(FIGMA_ASSET_PREFIX)) return
      return path.resolve(__dirname, 'assets', path.basename(id.slice(FIGMA_ASSET_PREFIX.length)))
    },
  }
}

type FigmaSiteConfiguration = {
  title?: string
  description?: string
  language?: string
  robots?: { index?: boolean }
  icons?: { icon?: string }
  openGraph?: { image?: string }
  analytics?: { googleAnalyticsId?: string }
  customScripts?: {
    headStart?: string
    headEnd?: string
    bodyStart?: string
    bodyEnd?: string
  }
  accessibility?: { addBypassLinks?: boolean }
}

function figmaSiteConfiguration(config: FigmaSiteConfiguration): Plugin {
  const clean = (value: string | undefined) => value?.replace(/[^a-zA-Z0-9_-]/g, '') || ''
  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const title = config.title ?? 'Figma Make App'
  const description = config.description ?? ''
  const socialImage = config.openGraph?.image ?? ''
  const language = clean(config.language) || 'en'
  const googleAnalyticsId = clean(config.analytics?.googleAnalyticsId)
  const robotsTxt = config.robots?.index === false ? 'User-agent: *\nDisallow: /\n' : ''

  return {
    name: 'figma-site-configuration',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!robotsTxt || req.url?.split('?')[0] !== '/robots.txt') return next()
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(robotsTxt)
      })
    },
    generateBundle() {
      if (robotsTxt) this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        let transformed = html
        transformed = transformed.replace('<!-- figma:lang -->', language)
        transformed = transformed.replace('<!-- figma:title -->', escape(title))
        transformed = transformed.replace(
          '<!-- figma:head-start -->',
          config.customScripts?.headStart ?? '',
        )
        transformed = transformed.replace(
          '<!-- figma:head-end -->',
          config.customScripts?.headEnd ?? '',
        )
        transformed = transformed.replace(
          '<!-- figma:body-start -->',
          config.customScripts?.bodyStart ?? '',
        )
        transformed = transformed.replace(
          '<!-- figma:body-end -->',
          config.customScripts?.bodyEnd ?? '',
        )

        const tags: HtmlTagDescriptor[] = []
        if (description)
          tags.push({
            tag: 'meta',
            attrs: { name: 'description', content: description },
            injectTo: 'head',
          })
        if (config.robots?.index === false)
          tags.push({
            tag: 'meta',
            attrs: { name: 'robots', content: 'noindex, nofollow' },
            injectTo: 'head',
          })
        if (config.icons?.icon)
          tags.push({
            tag: 'link',
            attrs: { rel: 'icon', href: config.icons.icon },
            injectTo: 'head',
          })
        if (title)
          tags.push({
            tag: 'meta',
            attrs: { property: 'og:title', content: title },
            injectTo: 'head',
          })
        if (description)
          tags.push({
            tag: 'meta',
            attrs: { property: 'og:description', content: description },
            injectTo: 'head',
          })
        if (socialImage)
          tags.push(
            {
              tag: 'meta',
              attrs: { property: 'og:image', content: socialImage },
              injectTo: 'head',
            },
            {
              tag: 'meta',
              attrs: { name: 'twitter:card', content: 'summary_large_image' },
              injectTo: 'head',
            },
            {
              tag: 'meta',
              attrs: { name: 'twitter:image', content: socialImage },
              injectTo: 'head',
            },
          )
        if (googleAnalyticsId) {
          tags.push(
            {
              tag: 'script',
              attrs: {
                async: true,
                src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`,
              },
              injectTo: 'head',
            },
            {
              tag: 'script',
              children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',${JSON.stringify(googleAnalyticsId)});`,
              injectTo: 'head',
            },
          )
        }

        if (config.accessibility?.addBypassLinks) {
          tags.push(
            {
              tag: 'style',
              children: `
  .figma-bypass-link {
    position: fixed;
    top: 8px;
    left: 8px;
    z-index: 2147483647;
    transform: translateY(-150%);
    border-radius: 6px;
    background: #111827;
    color: #fff;
    padding: 8px 12px;
    font: 600 14px/1.2 system-ui, sans-serif;
    text-decoration: none;
  }
  .figma-bypass-link:focus {
    transform: translateY(0);
  }
`,
              injectTo: 'head',
            },
            {
              tag: 'a',
              attrs: { class: 'figma-bypass-link', href: '#root' },
              children: 'Skip to content',
              injectTo: 'body-prepend',
            },
          )
        }
        return { html: transformed, tags }
      },
    },
  }
}

function figmaErrorOverlayReplay(): Plugin {
  return {
    name: 'figma-error-overlay-replay',
    apply: 'serve',
    configureServer(server) {
      let lastError: object | null = null
      const originalSend = server.ws.send.bind(server.ws) as (...args: any[]) => void
      server.ws.send = ((...args: any[]) => {
        const payload = args[0]
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          const type = (payload as { type?: string }).type
          if (type === 'error') lastError = payload as object
          if (type === 'update' || type === 'full-reload') lastError = null
        }
        return originalSend(...args)
      }) as typeof server.ws.send
      server.ws.on('connection', (socket) => {
        if (lastError !== null) socket.send(JSON.stringify(lastError))
      })
    },
  }
}

function figmaReactRefreshBoundaryFallback(): Plugin {
  const hadRefreshBoundary = new Map<string, boolean>()
  let sendFullReload: (() => void) | null = null

  return {
    name: 'figma-react-refresh-boundary-fallback',
    apply: 'serve',
    enforce: 'post',
    configureServer(server) {
      sendFullReload = () => server.ws.send({ type: 'full-reload', path: '*' })
    },
    transform(code, id) {
      if (!/\.[jt]sx?(?:\?|$)/.test(id) || id.includes('/node_modules/')) return null

      const moduleId = id.split('?')[0] ?? id
      const hasRefreshBoundary = code.includes('registerExportsForReactRefresh')
      const previousHadRefreshBoundary = hadRefreshBoundary.get(moduleId)
      hadRefreshBoundary.set(moduleId, hasRefreshBoundary)
      if (previousHadRefreshBoundary && !hasRefreshBoundary) {
        queueMicrotask(() => sendFullReload?.())
      }
      return null
    },
  }
}

function figmaMakeKitPlugin(options: { storiesGlob: string | string[] }): Plugin {
  const storiesGlob = Array.isArray(options.storiesGlob)
    ? options.storiesGlob
    : [options.storiesGlob]
  const virtualId = 'virtual:figma-stories'
  const resolvedId = '\0' + virtualId
  const html = `<!doctype html><html><body><div id="figma-make-kit-root"></div><script type="module">import { stories } from 'virtual:figma-stories';window.__FIGMA__=Object.assign(window.__FIGMA__??{},{stories});window.dispatchEvent(new CustomEvent('figma.ready'))</script></body></html>`

  return {
    name: 'figma-make-kit',
    apply: 'serve',
    resolveId(id) {
      return id === virtualId ? resolvedId : null
    },
    load(id) {
      return id === resolvedId
        ? `export const stories = import.meta.glob(${JSON.stringify(storiesGlob)})`
        : null
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (url.split('?')[0] !== '/.figma/make/kit.html') return next()
        try {
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml(url, html))
        } catch (error) {
          next(error as Error)
        }
      })
    },
  }
}
