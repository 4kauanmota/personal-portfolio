import { KIND_CATEGORY, PROJECT_CATEGORIES, type ExternalProject, type Project, type ProjectCategory, type ProjectDetails, type ProjectKind, type RepoProject } from './types'
import { liveKindOf, safeUrl, sameRepo } from './urls'

/**
 * Junta as duas fontes da galeria:
 *   - os repositórios públicos do GitHub (snapshot gerado no build), que continuam
 *     sendo a fonte dinâmica da lista;
 *   - a configuração do portfólio (src/content/projects.config.ts): descrições em
 *     português e inglês, tipo de cada projeto, link do site e projetos de fora do GitHub.
 *
 * Função pura (sem Vue nem DOM), testada em tests/portfolio.test.ts.
 */
export interface PortfolioConfig {
  details?: Record<string, ProjectDetails>
  external?: ExternalProject[]
  hidden?: string[]
}

/** Filtros na ordem do site, sem repetição; "outros" só quando não há nenhum outro. */
function orderCategories(list: ProjectCategory[]): ProjectCategory[] {
  const found = new Set(list)
  if (found.size > 1) found.delete('other')
  if (found.size === 0) found.add('other')
  return PROJECT_CATEGORIES.filter((c) => found.has(c))
}

function categoriesFor(kind: ProjectKind | null, also: ProjectCategory[] | undefined, fallback: ProjectCategory[]): ProjectCategory[] {
  const base = kind ? [KIND_CATEGORY[kind]] : fallback
  return orderCategories([...base, ...(also ?? [])])
}

/**
 * Datas da configuração ('AAAA-MM-DD' ou 'AAAA-MM') viram ISO ao meio-dia UTC,
 * para o dia não "voltar" um dia no fuso do Brasil. Datas ISO completas ficam como estão.
 */
export function toCreatedAt(value: string): string {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value.trim())
  if (match) return `${match[1]}-${match[2]}-${match[3] ?? '01'}T12:00:00Z`
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '1970-01-01T12:00:00Z' : date.toISOString()
}

/** Imagem da configuração: endereço https ou arquivo de public/ ("/pasta/arquivo.png"). */
function imageOf(value: string | null | undefined): string | null {
  const raw = value?.trim()
  if (!raw) return null
  if (/^\/[^/]/.test(raw)) return raw
  const url = safeUrl(raw)
  return url?.startsWith('https:') ? url : null
}

/** Descrição só vale com os dois idiomas preenchidos. */
function descriptionOf(value: ProjectDetails['description']): Project['description'] {
  if (!value) return null
  const pt = value['pt-BR']?.trim()
  const en = value.en?.trim()
  return pt && en ? { 'pt-BR': pt, en } : null
}

/** Do mais novo para o mais antigo, pela data de criação. A data de atualização nunca muda a posição. */
export function newestFirst<T extends { createdAt: string; id: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
}

function fromRepo(repo: RepoProject, details: ProjectDetails = {}): Project {
  const kind = details.kind ?? repo.kind ?? null
  // Um link na configuração substitui o do GitHub; null esconde o botão.
  const liveUrl = 'liveUrl' in details ? safeUrl(details.liveUrl) : safeUrl(repo.liveUrl)
  return {
    id: repo.id,
    title: details.title?.trim() || repo.title,
    kind,
    categories: categoriesFor(details.kind ?? null, details.also, repo.categories.length ? repo.categories : kind ? [KIND_CATEGORY[kind]] : []),
    description: descriptionOf(details.description),
    url: safeUrl(repo.url),
    readmeUrl: safeUrl(repo.readmeUrl),
    liveUrl,
    liveKind: liveUrl ? ('liveUrl' in details ? liveKindOf(liveUrl) : (repo.liveKind ?? liveKindOf(liveUrl))) : null,
    language: repo.language,
    createdAt: repo.createdAt,
    archived: repo.archived,
    source: 'github',
    private: false,
    image: null,
  }
}

function fromConfig(entry: ExternalProject): Project {
  const isPrivate = Boolean(entry.private)
  const liveUrl = safeUrl(entry.liveUrl)
  return {
    id: entry.id.trim(),
    title: entry.title.trim(),
    kind: entry.kind,
    categories: categoriesFor(entry.kind, entry.also, []),
    description: descriptionOf(entry.description),
    // Projeto privado nunca leva o link do repositório para a página.
    url: isPrivate ? null : safeUrl(entry.repoUrl),
    readmeUrl: null,
    liveUrl,
    liveKind: liveUrl ? liveKindOf(liveUrl) : null,
    language: entry.language?.trim() || null,
    createdAt: toCreatedAt(entry.createdAt),
    archived: false,
    source: 'config',
    private: isPrivate,
    image: imageOf(entry.image),
  }
}

/**
 * Lista final da galeria, do mais novo para o mais antigo.
 * Um projeto da configuração com o mesmo id ou o mesmo repositório de um projeto
 * público do GitHub é ignorado: o do GitHub vale (sem cards repetidos).
 */
export function mergeProjects(repos: RepoProject[], config: PortfolioConfig = {}): Project[] {
  const hidden = new Set((config.hidden ?? []).map((id) => id.toLowerCase()))
  const details = config.details ?? {}
  const fromGitHub = repos.filter((r) => !hidden.has(r.id.toLowerCase())).map((r) => fromRepo(r, details[r.id]))

  const taken = new Set(fromGitHub.map((p) => p.id.toLowerCase()))
  const extra: Project[] = []
  for (const entry of config.external ?? []) {
    const id = entry.id?.trim().toLowerCase()
    if (!id || !entry.title?.trim() || taken.has(id) || hidden.has(id)) continue
    if (entry.repoUrl && repos.some((r) => sameRepo(r.url, entry.repoUrl))) continue
    taken.add(id)
    extra.push(fromConfig(entry))
  }
  return newestFirst([...fromGitHub, ...extra])
}

/** Projetos da configuração que repetem um repositório público (para avisar no build e nos testes). */
export function duplicatedExternals(repos: RepoProject[], external: ExternalProject[]): string[] {
  const ids = new Set(repos.map((r) => r.id.toLowerCase()))
  return external.filter((e) => ids.has(e.id.trim().toLowerCase()) || (e.repoUrl && repos.some((r) => sameRepo(r.url, e.repoUrl)))).map((e) => e.id)
}
