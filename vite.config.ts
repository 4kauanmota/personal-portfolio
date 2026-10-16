import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'
import { projectImages } from './scripts/vite/project-images.ts'
import { site } from './src/content/site.ts'
import { META, OG_LOCALE, parsePath, pathFor, type PageId } from './src/i18n/meta.ts'
import { DEFAULT_LOCALE, LOCALES, type Locale } from './src/lib/types.ts'

// SITE_URL e BASE_PATH também podem vir do .env (variáveis já definidas têm prioridade).
// Nada daqui vai para o navegador: só variáveis com prefixo VITE_ chegariam lá, e não há nenhuma.
try {
  process.loadEnvFile()
} catch {
  /* sem .env */
}

/** Base do site: "/" na Vercel; "/nome-do-repositorio/" se publicar como projeto no GitHub Pages. */
const base = process.env.BASE_PATH ?? '/'

/** Endereço público (tags canônicas e de compartilhamento). Na Vercel é detectado sozinho. */
const origin = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : site.defaultUrl)
).replace(/\/+$/, '')
const siteUrl = `${origin}${base}`

const NOSCRIPT: Record<Locale, string> = {
  'pt-BR': 'Este portfólio usa JavaScript para mostrar projetos e animações. Enquanto isso, você me encontra aqui:',
  en: 'This portfolio uses JavaScript for its projects and animations. Meanwhile, you can find me here:',
}

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** Preenche os metadados do HTML para uma página e um idioma. */
function localize(html: string, page: PageId, locale: Locale): string {
  const meta = META[locale][page]
  const canonical = `${siteUrl}${pathFor(page, locale)}`
  const alternates =
    page === 'notfound'
      ? '<meta name="robots" content="noindex" />'
      : [
          ...LOCALES.map((l) => `<link rel="alternate" hreflang="${l}" href="${siteUrl}${pathFor(page, l)}" />`),
          `<link rel="alternate" hreflang="x-default" href="${siteUrl}${pathFor(page, DEFAULT_LOCALE)}" />`,
        ].join('\n    ')
  const values: Record<string, string> = {
    LANG: locale,
    PAGE: page,
    TITLE: escapeAttr(meta.title),
    DESCRIPTION: escapeAttr(meta.description),
    CANONICAL: canonical,
    ALTERNATES: alternates,
    OG_LOCALE: OG_LOCALE[locale],
    SITE_URL: siteUrl,
    NOSCRIPT: NOSCRIPT[locale],
  }
  return html.replace(/@@([A-Z_]+)@@/g, (match, key: string) => values[key] ?? match)
}

/**
 * Um HTML por página e idioma (/, /en/, /links/, /en/links/ e 404.html),
 * cada um com título, descrição, idioma e links alternativos corretos,
 * para buscadores e prévias de link (que não executam JavaScript).
 */
function localizedPages(): Plugin {
  let outDir = 'dist'
  return {
    name: 'localized-pages',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!ctx.server) return html // no build, as cópias são geradas no closeBundle
        const { page, locale } = parsePath(ctx.originalUrl?.split('?')[0] ?? '/', base)
        return localize(html, page, locale)
      },
    },
    async closeBundle() {
      const template = await readFile(join(outDir, 'index.html'), 'utf8').catch(() => null)
      if (!template) return
      const targets: Array<[PageId, Locale, string]> = [
        ['home', 'pt-BR', 'index.html'],
        ['home', 'en', 'en/index.html'],
        ['links', 'pt-BR', 'links/index.html'],
        ['links', 'en', 'en/links/index.html'],
        ['notfound', 'pt-BR', '404.html'],
      ]
      for (const [page, locale, file] of targets) {
        const target = join(outDir, file)
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, localize(template, page, locale))
      }

      // Mapa do site com as versões em cada idioma, e robots.txt apontando para ele.
      const today = new Date().toISOString().slice(0, 10)
      const urls = (['home', 'links'] as const).flatMap((page) =>
        LOCALES.map((locale) => {
          const alternates = LOCALES.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${siteUrl}${pathFor(page, l)}" />`).join('\n')
          return `  <url>\n    <loc>${siteUrl}${pathFor(page, locale)}</loc>\n    <lastmod>${today}</lastmod>\n${alternates}\n  </url>`
        }),
      )
      await writeFile(
        join(outDir, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`,
      )
      await writeFile(join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`)
    },
  }
}

export default defineConfig({
  base,
  plugins: [vue(), projectImages({ dir: 'src/assets/projects' }), localizedPages()],
  build: {
    target: 'es2022',
    cssTarget: ['chrome111', 'edge111', 'firefox113', 'safari16.4'],
  },
  server: {
    port: 5173,
  },
})
