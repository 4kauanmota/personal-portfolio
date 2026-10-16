/**
 * README dos repositórios, preparado no build para o leitor do portfólio.
 *
 * O README é conteúdo externo: qualquer pessoa com acesso ao repositório pode
 * escrever HTML nele. Por isso ele é convertido e LIMPO aqui, no build, e o
 * navegador só recebe HTML já sanitizado (sem scripts, eventos, estilos, iframes,
 * formulários ou endereços perigosos). Nada disso roda no navegador do visitante.
 */
import { Marked, type Token } from 'marked'
import sanitizeHtml from 'sanitize-html'
import type { Locale } from '../../src/lib/types.ts'
import { detectLanguage } from './classify.ts'

/** Onde o README está, para resolver links e imagens relativos. */
export interface RepoContext {
  /** dono/repositório */
  fullName: string
  branch: string
  /** Caminho do README dentro do repositório (ex.: "README.md" ou "docs/README.md"). */
  readmePath: string
}

export interface ReadmeHeading {
  id: string
  text: string
  /** Nível no README original (1 = #). */
  depth: number
}

export interface RenderedReadme {
  html: string
  headings: ReadmeHeading[]
  lang: Locale | null
}

/* ------------------------------------------------------------------ */
/* Endereços                                                           */
/* ------------------------------------------------------------------ */

function joinPath(base: string, relative: string): string {
  const stack = base.split('/').filter(Boolean)
  for (const part of relative.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') stack.pop()
    else stack.push(part)
  }
  return stack.join('/')
}

/**
 * Resolve endereços do README para endereços absolutos e seguros.
 * Imagens relativas vão para raw.githubusercontent.com; links relativos, para a página do arquivo.
 * Qualquer esquema que não seja https, http ou mailto (javascript:, data:, file:…) vira vazio.
 */
export function resolveRepoUrl(raw: string, ctx: RepoContext, kind: 'image' | 'link'): string {
  const url = raw.trim()
  if (!url) return ''
  if (url.startsWith('#')) return url
  if (/^https?:/i.test(url)) {
    // Imagens do GitHub no modo "blob" não abrem como imagem.
    const blob = url.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+)\/blob\/(.+?)(\?raw=true)?$/i)
    if (kind === 'image' && blob) return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}`
    return url.replace(/^http:\/\//i, 'https://')
  }
  if (/^mailto:/i.test(url)) return kind === 'link' ? url : ''
  if (url.startsWith('//')) return `https:${url}`
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return ''
  const readmeDir = ctx.readmePath.includes('/') ? ctx.readmePath.slice(0, ctx.readmePath.lastIndexOf('/')) : ''
  const [pathPart = '', hash = ''] = url.split('#')
  const clean = pathPart.replace(/^\.\//, '')
  const path = clean.startsWith('/') ? joinPath('', clean) : joinPath(readmeDir, clean)
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  if (kind === 'image') return `https://raw.githubusercontent.com/${ctx.fullName}/${ctx.branch}/${encoded}`
  return `https://github.com/${ctx.fullName}/blob/${ctx.branch}/${encoded}${hash ? `#${hash}` : ''}`
}

/* ------------------------------------------------------------------ */
/* Texto                                                               */
/* ------------------------------------------------------------------ */

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

/** Texto puro de tokens inline (para âncoras e para o sumário). */
function inlineText(tokens: Token[] | undefined): string {
  if (!tokens) return ''
  let out = ''
  for (const token of tokens) {
    if (token.type === 'image' || token.type === 'html') continue
    if ('tokens' in token && Array.isArray(token.tokens) && token.tokens.length) out += inlineText(token.tokens as Token[])
    else if ('text' in token && typeof token.text === 'string') out += token.text
  }
  return decodeEntities(out).replace(/\s+/g, ' ').trim()
}

/** Âncora no estilo do GitHub: minúsculas, sem acentos, espaços viram hífens. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    // Como o GitHub: cada espaço vira um hífen ("a & b" → "a--b").
    .replace(/\s/g, '-')
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Texto corrido do README, só para descobrir o idioma. */
function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|~-]/g, ' ')
}

/* ------------------------------------------------------------------ */
/* Conversão                                                           */
/* ------------------------------------------------------------------ */

type AlertKind = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION'
const ALERT_LABELS: Record<AlertKind, Record<Locale, string>> = {
  NOTE: { 'pt-BR': 'Nota', en: 'Note' },
  TIP: { 'pt-BR': 'Dica', en: 'Tip' },
  IMPORTANT: { 'pt-BR': 'Importante', en: 'Important' },
  WARNING: { 'pt-BR': 'Atenção', en: 'Warning' },
  CAUTION: { 'pt-BR': 'Cuidado', en: 'Caution' },
}

/**
 * Converte o README em HTML seguro:
 *   - títulos descem dois níveis (o leitor já tem o h2 com o nome do projeto) sem pular níveis,
 *     e guardam o nível original numa classe, para manter a hierarquia visual do Markdown;
 *   - links e imagens relativos apontam para o GitHub; âncoras internas ganham prefixo;
 *   - tabelas ganham uma moldura com rolagem horizontal; blocos de código ficam alcançáveis pelo teclado;
 *   - alertas do GitHub (> [!NOTE]) viram quadros de aviso;
 *   - tudo passa pelo sanitize-html com uma lista fechada de tags, atributos e esquemas.
 */
export function renderReadme(markdown: string, ctx: RepoContext, options: { idPrefix: string }): RenderedReadme {
  const { idPrefix } = options
  const lang = detectLanguage(plainText(markdown))
  const headings: ReadmeHeading[] = []
  const usedIds = new Map<string, number>()
  const uniqueId = (text: string) => {
    const base = `${idPrefix}-${slugify(text) || 'secao'}`
    const n = usedIds.get(base) ?? 0
    usedIds.set(base, n + 1)
    return n ? `${base}-${n}` : base
  }
  const anchor = (href: string) => `#${idPrefix}-${slugify(decodeURIComponent(href.slice(1)))}`

  // URLs dentro de HTML cru (<img src>, <a href>, <source srcset>) também são resolvidas.
  const fixHtmlUrls = (html: string) =>
    html
      // O leitor é sempre claro: a versão escura de uma imagem (<picture> com
      // prefers-color-scheme: dark) sairia invisível sobre o papel, então fica de fora,
      // como o GitHub faz no tema claro.
      .replace(/<source\b[^>]*\bmedia\s*=\s*(?:"[^"]*prefers-color-scheme\s*:\s*dark[^"]*"|'[^']*prefers-color-scheme\s*:\s*dark[^']*')[^>]*>/gi, '')
      .replace(/(<img\b[^>]*?\bsrc\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, (_m, start: string, a?: string, b?: string, c?: string) => {
        return `${start}"${escapeHtml(resolveRepoUrl(a ?? b ?? c ?? '', ctx, 'image'))}"`
      })
      .replace(/(<source\b[^>]*?\bsrcset\s*=\s*)(?:"([^"]*)"|'([^']*)')/gi, (_m, start: string, a?: string, b?: string) => {
        const set = (a ?? b ?? '')
          .split(',')
          .map((part) => {
            const [url = '', descriptor = ''] = part.trim().split(/\s+/, 2)
            const resolved = resolveRepoUrl(url, ctx, 'image')
            return resolved ? `${resolved}${descriptor ? ` ${descriptor}` : ''}` : ''
          })
          .filter(Boolean)
          .join(', ')
        return `${start}"${escapeHtml(set)}"`
      })
      .replace(/(<a\b[^>]*?\bhref\s*=\s*)(?:"([^"]*)"|'([^']*)')/gi, (_m, start: string, a?: string, b?: string) => {
        const href = a ?? b ?? ''
        return `${start}"${escapeHtml(href.startsWith('#') ? anchor(href) : resolveRepoUrl(href, ctx, 'link'))}"`
      })

  let lastLevel = 2
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens)
        const level = Math.max(3, Math.min(depth + 2, 6, lastLevel + 1))
        lastLevel = level
        const plain = inlineText(tokens)
        const id = uniqueId(plain)
        if (plain) headings.push({ id, text: plain, depth })
        return `<h${level} id="${id}" class="md-h${depth}">${text}</h${level}>\n`
      },
      image({ href, title, text }) {
        // "#gh-dark-mode-only": a imagem só aparece no tema escuro do GitHub (o leitor é claro).
        if (/#gh-dark-mode-only$/i.test(href)) return ''
        const url = resolveRepoUrl(href.replace(/#gh-light-mode-only$/i, ''), ctx, 'image')
        if (!url) return ''
        const t = title ? ` title="${escapeHtml(title)}"` : ''
        return `<img src="${escapeHtml(url)}" alt="${escapeHtml(decodeEntities(text))}"${t}>`
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens)
        if (!inner.trim()) return ''
        const url = href.startsWith('#') ? anchor(href) : resolveRepoUrl(href, ctx, 'link')
        if (!url) return inner
        const t = title ? ` title="${escapeHtml(title)}"` : ''
        return `<a href="${escapeHtml(url)}"${t}>${inner}</a>`
      },
      blockquote({ tokens }) {
        const body = this.parser.parse(tokens)
        // Alerta do GitHub (> [!NOTE]): o pré-processamento deixou um título marcado no começo.
        const alert = /^\s*<p class="md-alert__title" data-alert="(\w+)">/.exec(body)
        if (alert) return `<blockquote class="md-alert md-alert--${alert[1]}">${body}</blockquote>\n`
        return `<blockquote>${body}</blockquote>\n`
      },
      html({ text }) {
        return fixHtmlUrls(text)
      },
    },
  })

  const prepared = markdown
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    // Alertas do GitHub: "> [!NOTE]" vira um título de aviso dentro da citação.
    .replace(/^(\s*>\s*)\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/gim, (_m, prefix: string, kind: string) => {
      const key = kind.toUpperCase() as AlertKind
      return `${prefix}<p class="md-alert__title" data-alert="${key.toLowerCase()}">${ALERT_LABELS[key][lang ?? 'en']}</p>\n${prefix}`
    })
  const rawHtml = marked.parse(prepared, { async: false }) as string

  const headingTransform = (tagName: string, attribs: Record<string, string>) => {
    // Títulos vindos de HTML cru (<h1 align="center">) também descem de nível.
    const depth = Number(tagName.slice(1)) || 1
    const level = Math.max(3, Math.min(depth + 2, 6))
    const out: Record<string, string> = { class: `md-h${depth}` }
    if (attribs.align) out.align = attribs.align
    if (attribs.id) out.id = attribs.id
    if (attribs.class?.startsWith('md-h')) out.class = attribs.class
    return { tagName: `h${level}`, attribs: out }
  }

  const clean = sanitizeHtml(rawHtml, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'em', 'strong',
      'del', 's', 'sup', 'sub', 'kbd', 'br', 'hr', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'details',
      'summary', 'div', 'span', 'picture', 'source', 'b', 'i', 'u', 'mark', 'figure', 'figcaption', 'dl', 'dt', 'dd',
      'abbr', 'q', 'small', 'center', 'input',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'id', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'align', 'loading', 'decoding', 'referrerpolicy'],
      source: ['srcset', 'media', 'type'],
      code: ['class'],
      pre: ['tabindex'],
      table: ['align'],
      th: ['align', 'colspan', 'rowspan'],
      td: ['align', 'colspan', 'rowspan'],
      h3: ['id', 'class', 'align'],
      h4: ['id', 'class', 'align'],
      h5: ['id', 'class', 'align'],
      h6: ['id', 'class', 'align'],
      p: ['align', 'class'],
      div: ['align'],
      span: ['align'],
      blockquote: ['class'],
      details: ['open'],
      ol: ['start'],
      li: ['class'],
      input: ['type', 'checked', 'disabled'],
      abbr: ['title'],
    },
    allowedClasses: {
      code: ['language-*'],
      h3: ['md-h1', 'md-h2', 'md-h3', 'md-h4', 'md-h5', 'md-h6'],
      h4: ['md-h1', 'md-h2', 'md-h3', 'md-h4', 'md-h5', 'md-h6'],
      h5: ['md-h1', 'md-h2', 'md-h3', 'md-h4', 'md-h5', 'md-h6'],
      h6: ['md-h1', 'md-h2', 'md-h3', 'md-h4', 'md-h5', 'md-h6'],
      blockquote: ['md-alert', 'md-alert--note', 'md-alert--tip', 'md-alert--important', 'md-alert--warning', 'md-alert--caution'],
      p: ['md-alert__title'],
      li: ['task-list-item'],
    },
    allowedSchemes: ['https', 'mailto'],
    allowedSchemesByTag: { img: ['https'], source: ['https'] },
    allowedSchemesAppliedToAttributes: ['href', 'src', 'srcset'],
    allowProtocolRelative: false,
    allowedStyles: {},
    transformTags: {
      h1: headingTransform,
      h2: headingTransform,
      h3: (tagName, attribs) => (attribs.class?.startsWith('md-h') ? { tagName, attribs } : headingTransform(tagName, attribs)),
      h4: (tagName, attribs) => (attribs.class?.startsWith('md-h') ? { tagName, attribs } : headingTransform(tagName, attribs)),
      h5: (tagName, attribs) => (attribs.class?.startsWith('md-h') ? { tagName, attribs } : headingTransform(tagName, attribs)),
      h6: (tagName, attribs) => (attribs.class?.startsWith('md-h') ? { tagName, attribs } : headingTransform(tagName, attribs)),
      center: () => ({ tagName: 'div', attribs: { align: 'center' } }),
      // Blocos de código roláveis precisam ser alcançáveis pelo teclado.
      pre: (tagName, attribs) => ({ tagName, attribs: { ...attribs, tabindex: '0' } }),
      a: (tagName, attribs) => {
        const href = attribs.href ?? ''
        if (!href) return { tagName: 'span', attribs: {} }
        if (href.startsWith('#')) return { tagName, attribs: { href, ...(attribs.title ? { title: attribs.title } : {}) } }
        return { tagName, attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' } }
      },
      img: (tagName, attribs) => {
        const out: Record<string, string> = { ...attribs, loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' }
        // Mesma regra das imagens em Markdown: a versão só do tema escuro do GitHub sai.
        if (/#gh-dark-mode-only$/i.test(out.src ?? '')) return { tagName: 'img', attribs: { src: '' } }
        if (out.src) out.src = out.src.replace(/#gh-light-mode-only$/i, '')
        // Só números puros em largura e altura (nada de "100%" ou expressões).
        for (const key of ['width', 'height'] as const) {
          if (out[key] && !/^\d{1,4}$/.test(out[key] ?? '')) delete out[key]
        }
        return { tagName, attribs: out }
      },
      // Só caixas de seleção desabilitadas (listas de tarefas); qualquer outro input some.
      input: (tagName, attribs) =>
        attribs.type === 'checkbox'
          ? { tagName, attribs: { type: 'checkbox', disabled: '', ...(attribs.checked !== undefined ? { checked: '' } : {}) } }
          : { tagName: 'span', attribs: {} },
    },
    exclusiveFilter: (frame) => (frame.tag === 'img' && !frame.attribs.src) || (frame.tag === 'a' && !frame.text.trim() && !frame.mediaChildren.length),
  })

  const html = clean
    // Tabelas: moldura com rolagem própria em telas pequenas (alcançável pelo teclado).
    .replace(/<table([^>]*)>/g, (_m, attrs: string) =>
      `<div class="md-table${/align="center"/.test(attrs) ? ' md-table--center' : /align="right"/.test(attrs) ? ' md-table--right' : ''}" tabindex="0"><table${attrs}>`,
    )
    // Cabeçalho vazio não é cabeçalho: vira célula comum (leitores de tela agradecem).
    .replace(/<th([^>]*)>\s*<\/th>/g, '<td$1></td>')
    .replace(/<\/table>/g, '</table></div>')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/(<br\s*\/?>\s*){3,}/g, '<br><br>')
    .trim()

  return { html, headings, lang }
}
