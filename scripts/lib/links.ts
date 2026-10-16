import { liveKindOf } from '../../src/lib/urls.ts'

export type LinkStatus = 'ok' | 'dead' | 'unknown'
export type { LiveKind } from '../../src/lib/types.ts'

export interface HomepageInput {
  homepage: string | null
  name: string
  owner: string
  hasPages: boolean
}

/** URL do GitHub Pages do repositório (segue o nome atual do repositório). */
export function pagesUrl(owner: string, name: string): string {
  return `https://${owner.toLowerCase()}.github.io/${name}/`
}

/**
 * Corrige o campo "homepage" do GitHub:
 * - adiciona https:// quando falta;
 * - troca links antigos do GitHub Pages quando o repositório foi renomeado
 *   (o endereço do Pages acompanha o nome do repositório).
 */
export function normalizeHomepage({ homepage, name, owner, hasPages }: HomepageInput): string | null {
  const raw = homepage?.trim()
  if (!raw) return null
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
  if (url.protocol === 'http:') url.protocol = 'https:'
  const pagesHost = `${owner.toLowerCase()}.github.io`
  if (url.hostname.toLowerCase() === pagesHost) {
    const firstSegment = url.pathname.split('/').filter(Boolean)[0] ?? ''
    if (firstSegment && firstSegment.toLowerCase() !== name.toLowerCase() && hasPages) return pagesUrl(owner, name)
  }
  return url.toString()
}

/** Host normalizado (sem "www."), ou '' se o endereço for inválido. Aceita endereço sem protocolo. */
export function hostOf(value: string): string {
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** O endereço usa um dos hosts deste portfólio? (só compara o endereço, não o que está publicado nele) */
export function pointsToSite(url: string, siteHosts: ReadonlySet<string>): boolean {
  const host = hostOf(url)
  return host !== '' && siteHosts.has(host)
}

/** O que está publicado num endereço: este portfólio, outro site ou não deu para saber. */
export type SiteIdentity = 'this-site' | 'other-site' | 'unknown'

/**
 * A página tem a assinatura deste portfólio? Todo HTML gerado aqui leva
 * <meta property="og:site_name" content="(handle)">; outro site no mesmo endereço não leva.
 */
export function pageIsThisSite(html: string, handle: string): boolean {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? []
  return tags.some((tag) => /\bproperty\s*=\s*["']og:site_name["']/i.test(tag) && new RegExp(`\\bcontent\\s*=\\s*["']\\s*${handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*["']`, 'i').test(tag))
}

/** Abre o endereço e confere se é este portfólio (rede fora do ar ou erro viram "unknown"). */
export async function identifySite(url: string, handle: string, timeoutMs = 8000): Promise<SiteIdentity> {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 4kauanmota-portfolio-link-check)', Accept: 'text/html' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) {
      await response.body?.cancel()
      return 'unknown'
    }
    const html = (await response.text()).slice(0, 200_000)
    return pageIsThisSite(html, handle) ? 'this-site' : 'other-site'
  } catch {
    return 'unknown'
  }
}

/**
 * Um link de projeto que usa um endereço deste portfólio deve sumir?
 * Só quando o endereço de fato mostra este portfólio. O endereço sozinho não basta:
 * o domínio padrão (site.ts) pode ainda estar com outro site, como o portfólio antigo
 * (space-portfolio-web), e aí o "Ver site" é legítimo.
 * Sem conseguir abrir a página, vale o que se sabe do deploy: some se o endereço é onde
 * este build vai ser publicado (SITE_URL ou o domínio de produção da Vercel).
 */
export function isSelfLink(identity: SiteIdentity, deployedHere: boolean): boolean {
  if (identity === 'this-site') return true
  if (identity === 'other-site') return false
  return deployedHere
}

/** Que tipo de destino é o link: site publicado, pacote ou mídia (capturas/vídeo). O mesmo critério do site. */
export const liveKind = liveKindOf

/** Confere se um endereço responde. Erros de rede viram "unknown" (o link é mantido). */
export async function checkUrl(url: string, timeoutMs = 8000): Promise<LinkStatus> {
  const attempt = async (method: 'HEAD' | 'GET'): Promise<number | null> => {
    try {
      const response = await fetch(url, {
        method,
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 4kauanmota-portfolio-link-check)' },
        signal: AbortSignal.timeout(timeoutMs),
      })
      await response.body?.cancel()
      return response.status
    } catch {
      return null
    }
  }
  let status = await attempt('HEAD')
  if (status === null || status === 405 || status === 403 || status === 400 || status === 501) status = (await attempt('GET')) ?? status
  if (status === null) return 'unknown'
  if (status >= 200 && status < 400) return 'ok'
  if (status === 404 || status === 410) return 'dead'
  return 'unknown'
}
