import { site } from '../content/site.ts'
import { DEFAULT_LOCALE, LOCALES, type Locale } from '../lib/types.ts'

/**
 * Rotas e metadados de cada página nos dois idiomas.
 * Usado no build (para gerar um HTML por rota/idioma) e no navegador (troca de idioma sem recarregar).
 */
export type PageId = 'home' | 'links' | 'notfound'

const PAGE_SEGMENT: Record<Exclude<PageId, 'notfound'>, string> = { home: '', links: 'links/' }

/** Caminho relativo à base do site, ex.: "" , "en/", "links/", "en/links/". */
export function pathFor(page: PageId, locale: Locale): string {
  const prefix = locale === DEFAULT_LOCALE ? '' : 'en/'
  if (page === 'notfound') return `${prefix}`
  return `${prefix}${PAGE_SEGMENT[page]}`
}

/** Descobre página e idioma a partir do endereço. */
export function parsePath(pathname: string, base = '/'): { page: PageId; locale: Locale; explicitLocale: boolean } {
  let rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, '')
  rest = rest.replace(/index\.html$/, '')
  let locale: Locale = DEFAULT_LOCALE
  let explicitLocale = false
  const [first] = rest.split('/')
  const prefixed = LOCALES.find((l) => l !== DEFAULT_LOCALE && l === first)
  if (prefixed) {
    locale = prefixed
    explicitLocale = true
    rest = rest.slice(prefixed.length + 1)
  }
  const page: PageId = rest === '' ? 'home' : rest.replace(/\/$/, '') === 'links' ? 'links' : 'notfound'
  return { page, locale, explicitLocale }
}

export const OG_LOCALE: Record<Locale, string> = { 'pt-BR': 'pt_BR', en: 'en_US' }

export const META: Record<Locale, Record<PageId, { title: string; description: string }>> = {
  'pt-BR': {
    home: {
      title: `${site.handle} | ${site.name}`,
      description:
        'Portfólio de Kauan Soares Mota (4kauanmota): engenheiro de software que passou pela web, mobile, CLIs e IA e agora desenvolve jogos no Pixel Mole, seu estúdio independente.',
    },
    links: {
      title: `Links | ${site.handle}`,
      description: 'Os links de 4kauanmota: GitHub, LinkedIn e e-mail.',
    },
    notfound: {
      title: `Página não encontrada | ${site.handle}`,
      description: 'Esta página não existe no portfólio de 4kauanmota.',
    },
  },
  en: {
    home: {
      title: `${site.handle} | ${site.name}`,
      description:
        'Portfolio of Kauan Soares Mota (4kauanmota): a software engineer who has worked across web, mobile, CLIs and AI, now making games at Pixel Mole, his independent studio.',
    },
    links: {
      title: `Links | ${site.handle}`,
      description: '4kauanmota’s links: GitHub, LinkedIn and email.',
    },
    notfound: {
      title: `Page not found | ${site.handle}`,
      description: "This page doesn't exist on 4kauanmota's portfolio.",
    },
  },
}
