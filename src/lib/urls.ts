import type { LiveKind } from './types'

/**
 * Endereços vindos de configuração ou do GitHub: só http(s) e bem formados.
 * Qualquer outra coisa (javascript:, texto solto, vazio) vira null e o botão não aparece.
 */
export function safeUrl(value: string | null | undefined): string | null {
  const raw = value?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (!url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

/** Que tipo de destino é o link: site publicado, pacote ou mídia (capturas/vídeo). */
export function liveKindOf(url: string): LiveKind {
  const host = new URL(url).hostname.replace(/^www\./, '')
  if (['npmjs.com', 'pypi.org', 'crates.io', 'pkg.go.dev', 'nuget.org', 'packagist.org'].includes(host)) return 'package'
  if (['imgur.com', 'youtube.com', 'youtu.be', 'vimeo.com', 'drive.google.com', 'figma.com'].includes(host)) return 'media'
  return 'site'
}

/** Mesmo endereço de repositório? (sem diferenciar maiúsculas, barra final ou ".git"). */
export function sameRepo(a: string | null | undefined, b: string | null | undefined): boolean {
  const key = (value: string | null | undefined) => {
    const url = safeUrl(value)
    if (!url) return ''
    const { hostname, pathname } = new URL(url)
    return `${hostname.replace(/^www\./, '')}${pathname}`.toLowerCase().replace(/\.git$/, '').replace(/\/+$/, '')
  }
  const ka = key(a)
  return ka !== '' && ka === key(b)
}
