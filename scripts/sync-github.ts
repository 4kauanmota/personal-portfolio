/**
 * Sincroniza os repositórios públicos do GitHub com o portfólio.
 *
 *   npm run sync:github           → busca tudo e falha se a API não responder
 *   npm run build                 → roda isto com --soft antes do build:
 *                                   se a API falhar, mantém o último snapshot
 *
 * Gera src/generated/projects.json: um projeto por repositório, pela data de criação
 * (do mais novo para o mais antigo), com o link publicado ("Website" do repositório
 * ou GitHub Pages) e o endereço do README original. As descrições e o tipo de cada
 * projeto NÃO vêm do GitHub: ficam em src/content/projects.config.ts.
 *
 * Gera também src/generated/readmes/<repositório>.json: o README convertido em HTML
 * e LIMPO aqui (sanitizado), para o leitor do portfólio. O navegador nunca fala com
 * a API do GitHub nem recebe token; só baixa o README de um projeto quando você abre.
 *
 * Requisições: 1 para a lista + 1 por repositório que mudou desde a última sincronização
 * (o README de um repositório sem push novo é reaproveitado). Se o limite da API acabar
 * no meio, a lista e os links novos são gravados mesmo assim e os READMEs que faltaram
 * ficam como estavam.
 *
 * Variáveis de ambiente (todas opcionais; no computador, podem ficar no arquivo .env):
 *   GITHUB_TOKEN        token só de leitura; sem ele o limite é de 60 requisições/hora
 *   SYNC_CHECK_LINKS=0  não testa se os links publicados respondem
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { externalProjects, projectDetails, projectsConfig } from '../src/content/projects.config.ts'
import { site } from '../src/content/site.ts'
import { duplicatedExternals } from '../src/lib/portfolio.ts'
import type { ProjectCategory, ProjectReadme, ProjectsSnapshot, RepoProject } from '../src/lib/types.ts'
import { CATEGORY_PRIORITY, categorize, canonicalTech, guessKind, humanizeRepoName } from './lib/classify.ts'
import { GitHubClient, RateLimitError, mapLimit, type ApiReadme, type ApiRepo } from './lib/github.ts'
import { checkUrl, hostOf, identifySite, isSelfLink, liveKind, normalizeHomepage, pagesUrl, pointsToSite } from './lib/links.ts'
import { renderReadme } from './lib/readme.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SNAPSHOT_FILE = join(ROOT, 'src', 'generated', 'projects.json')
/**
 * Versão do conversor de README (scripts/lib/readme.ts). Mudou a conversão ou a limpeza?
 * Aumente o número: a próxima sincronização refaz todos os READMEs.
 */
const README_FORMAT = 3
const README_DIR = join(ROOT, 'src', 'generated', 'readmes')
/** Saída da versão 1.0 (miniaturas e READMEs em public/), que não é mais usada. */
const LEGACY_DIR = join(ROOT, 'public', 'generated')

// Lê o .env da raiz, se existir. Variáveis já definidas (Vercel, CI) têm prioridade.
try {
  process.loadEnvFile(join(ROOT, '.env'))
} catch {
  /* sem .env: segue com o ambiente */
}

const soft = process.argv.includes('--soft')
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''
const checkLinks = process.env.SYNC_CHECK_LINKS !== '0'

const hostsOf = (values: Array<string | undefined>): ReadonlySet<string> => new Set(values.filter((v): v is string => Boolean(v)).map(hostOf).filter(Boolean))
/** Onde este build vai ser publicado (SITE_URL ou o domínio de produção da Vercel). */
const deployHosts = hostsOf([process.env.SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL])
/** Endereços que podem ser deste portfólio: os do deploy e os de site.ts (o principal e os outros). */
const siteHosts = hostsOf([site.defaultUrl, ...site.otherUrls, ...deployHosts])

const warnings: string[] = []
const warn = (message: string) => {
  warnings.push(message)
  console.warn(`  ⚠ ${message}`)
}

const HIDE_TOPICS = ['portfolio-hide', 'hide-from-portfolio', 'portfolio-hidden']

async function loadPrevious(): Promise<ProjectsSnapshot | null> {
  if (!existsSync(SNAPSHOT_FILE)) return null
  try {
    return JSON.parse(await readFile(SNAPSHOT_FILE, 'utf8')) as ProjectsSnapshot
  } catch {
    return null
  }
}

interface ReadmeResult {
  /** README original no GitHub (null se não houver). */
  url: string | null
  /** Arquivo para o leitor; null quando não há README ou não deu para ler agora. */
  file: ProjectReadme | null
  /** A leitura falhou: mantém o arquivo anterior, se existir. */
  keepPrevious: boolean
}

/** O limite da API acabou durante esta sincronização: os READMEs restantes ficam como estavam. */
let rateLimited = false
let reusedReadmes = 0

/**
 * README sem mudança desde a última sincronização (mesmo último push e mesmo conversor):
 * reaproveita o arquivo já gerado, sem gastar requisição.
 */
function cachedReadme(api: ApiRepo, previous: ProjectsSnapshot | null): ReadmeResult | null {
  if (!previous || previous.readmeFormat !== README_FORMAT) return null
  const known = previous.projects.find((p) => p.id === api.name)
  if (!known || known.pushedAt !== api.pushed_at) return null
  if (known.readmeUrl && !existsSync(join(README_DIR, `${api.name}.json`))) return null
  return { url: known.readmeUrl, file: null, keepPrevious: true }
}

/** Busca o README (uma requisição), descobre o endereço e prepara o HTML seguro. */
async function fetchReadme(client: GitHubClient, api: ApiRepo, previous: ProjectsSnapshot | null): Promise<ReadmeResult> {
  const cached = cachedReadme(api, previous)
  if (cached) {
    reusedReadmes++
    return cached
  }
  const known = previous?.projects.find((p) => p.id === api.name)
  const keep: ReadmeResult = { url: known?.readmeUrl ?? null, file: null, keepPrevious: true }
  if (rateLimited) return keep
  let readme: ApiReadme | null
  try {
    readme = await client.readme(api.full_name)
  } catch (error) {
    if (error instanceof RateLimitError) {
      if (!rateLimited) warn(`limite da API atingido nos READMEs: lista e links atualizados, READMEs restantes mantidos. ${token ? '' : 'Configure GITHUB_TOKEN para evitar isso.'}`.trim())
      rateLimited = true
      return keep
    }
    warn(`${api.name}: não foi possível ler o README agora (${(error as Error).message}); mantendo o anterior`)
    return keep
  }
  if (!readme) return { url: null, file: null, keepPrevious: false }
  const path = readme.path.split('/').map(encodeURIComponent).join('/')
  const url = readme.htmlUrl ?? `${api.html_url}/blob/${encodeURIComponent(api.default_branch)}/${path}`
  if (!readme.content?.trim()) return { url, file: null, keepPrevious: false }
  try {
    const rendered = renderReadme(readme.content, { fullName: api.full_name, branch: api.default_branch, readmePath: readme.path }, { idPrefix: `rd-${api.name}` })
    return { url, file: { id: api.name, sourceUrl: url, lang: rendered.lang, headings: rendered.headings, html: rendered.html }, keepPrevious: false }
  } catch (error) {
    warn(`${api.name}: o README não pôde ser convertido (${(error as Error).message})`)
    return { url, file: null, keepPrevious: true }
  }
}

/** Grava um arquivo por README e apaga os que não pertencem mais a nenhum projeto. */
async function writeReadmes(results: Array<{ id: string; readme: ReadmeResult }>): Promise<number> {
  await mkdir(README_DIR, { recursive: true })
  const keep = new Set<string>()
  let written = 0
  for (const { id, readme } of results) {
    const file = join(README_DIR, `${id}.json`)
    if (readme.file) {
      await writeFile(file, `${JSON.stringify(readme.file)}\n`)
      keep.add(`${id}.json`)
      written++
    } else if (readme.keepPrevious && existsSync(file)) {
      keep.add(`${id}.json`)
    }
  }
  for (const name of await readdir(README_DIR)) {
    if (name.endsWith('.json') && !keep.has(name)) await rm(join(README_DIR, name), { force: true })
  }
  return written
}

/** Filtros sugeridos pelos tópicos, tecnologias e linguagem (nunca pelo nome do repositório). */
function categoriesOf(api: ApiRepo): ProjectCategory[] {
  const topics = api.topics ?? []
  const found = new Set(
    categorize({
      topics,
      technologies: topics.map((t) => canonicalTech(t)).filter((t): t is string => Boolean(t)),
      languages: api.language ? [api.language] : [],
      readmeText: api.description ?? '',
    }),
  )
  if (found.size > 1) found.delete('other')
  return CATEGORY_PRIORITY.filter((c) => found.has(c))
}

async function resolveLiveUrl(api: ApiRepo): Promise<string | null> {
  const candidates: string[] = []
  const homepage = normalizeHomepage({ homepage: api.homepage, name: api.name, owner: api.owner.login, hasPages: Boolean(api.has_pages) })
  if (homepage) candidates.push(homepage)
  if (api.has_pages) candidates.push(pagesUrl(api.owner.login, api.name))
  for (const url of [...new Set(candidates)]) {
    // Mesmo endereço deste portfólio: só some se a página publicada lá for mesmo este portfólio.
    if (pointsToSite(url, siteHosts)) {
      const identity = checkLinks ? await identifySite(url, site.handle) : 'unknown'
      if (isSelfLink(identity, pointsToSite(url, deployHosts))) {
        warn(`${api.name}: o link publicado aponta para este portfólio e foi ignorado (${url})`)
        continue
      }
    }
    const status = checkLinks ? await checkUrl(url) : 'unknown'
    if (status === 'dead') {
      warn(`${api.name}: link fora do ar ignorado (${url})`)
      continue
    }
    return url
  }
  return null
}

async function main(): Promise<void> {
  const started = Date.now()
  const client = new GitHubClient({ token, apiUrl: process.env.GITHUB_API_URL })
  const previous = await loadPrevious()
  console.log(`\n◯ Sincronizando projetos de github.com/${site.githubUser} ${token ? '(com token)' : '(sem token: limite de 60 req/h)'}`)

  const all = await client.listRepos(site.githubUser)
  const repos = all
    .filter((r) => {
      if (r.private || r.disabled) return false
      if (r.fork && !projectsConfig.includeForks) return false
      if (r.name.toLowerCase() === site.githubUser.toLowerCase()) return false // repositório de perfil
      if (projectsConfig.hidden.includes(r.name)) return false
      if ((r.topics ?? []).some((t) => HIDE_TOPICS.includes(t))) return false
      return true
    })
    // Data de criação no GitHub, do mais novo para o mais antigo (a atualização não muda a ordem).
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.name.localeCompare(b.name))
  console.log(`  ${all.length} repositórios públicos, ${repos.length} no portfólio`)

  const readmes: Array<{ id: string; readme: ReadmeResult }> = []
  const projects: RepoProject[] = await mapLimit(repos, 4, async (api) => {
    const liveUrl = await resolveLiveUrl(api)
    const readme = await fetchReadme(client, api, previous)
    readmes.push({ id: api.name, readme })
    const categories = categoriesOf(api)
    return {
      id: api.name,
      title: humanizeRepoName(api.name),
      url: api.html_url,
      readmeUrl: readme.url,
      liveUrl,
      liveKind: liveUrl ? liveKind(liveUrl) : null,
      kind: guessKind(categories, api.topics ?? []),
      categories,
      language: api.language,
      createdAt: api.created_at,
      pushedAt: api.pushed_at,
      archived: api.archived,
    }
  })

  const snapshot: ProjectsSnapshot = {
    generatedAt: new Date().toISOString(),
    username: site.githubUser,
    profileUrl: `https://github.com/${site.githubUser}`,
    repoCount: projects.length,
    readmeFormat: README_FORMAT,
    projects,
  }
  await mkdir(dirname(SNAPSHOT_FILE), { recursive: true })
  await writeFile(SNAPSHOT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`)
  const readmeCount = await writeReadmes(readmes)
  if (existsSync(LEGACY_DIR)) await rm(LEGACY_DIR, { recursive: true, force: true })

  report(projects)
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  const reused = reusedReadmes ? `, ${reusedReadmes} sem mudança reaproveitados` : ''
  console.log(`  ✓ ${projects.length} projetos, ${readmeCount} READMEs novos${reused}, em ${seconds}s com ${client.requests} requisições`)
  if (warnings.length) console.log(`  ${warnings.length} aviso(s) acima.`)
}

/**
 * Resumo para conferir no log do build (Vercel ou computador): que projetos têm o botão
 * "Ver site" e de onde veio o link, e o que ainda falta na configuração.
 */
function report(projects: RepoProject[]): void {
  console.log('\n  Botão "Ver site":')
  for (const p of projects) {
    const details = projectDetails[p.id]
    if (details && 'liveUrl' in details) {
      console.log(`    ${details.liveUrl ? '↗' : '·'} ${p.id}: ${details.liveUrl ?? 'escondido'} (configuração)`)
    } else if (p.liveUrl) {
      console.log(`    ↗ ${p.id}: ${p.liveUrl}`)
    }
  }
  const without = projects.filter((p) => !p.liveUrl && !projectDetails[p.id]?.liveUrl).length
  if (without) console.log(`    ${without} sem link (preencha "Website" no repositório do GitHub ou liveUrl na configuração)`)

  const ids = new Set(projects.map((p) => p.id))
  const missing = projects.filter((p) => !projectDetails[p.id])
  for (const p of missing) warn(`${p.id}: sem entrada em projectDetails (src/content/projects.config.ts); aparece sem descrição e com o tipo sugerido "${p.kind ?? 'nenhum'}"`)
  const empty = projects.filter((p) => projectDetails[p.id] && !projectDetails[p.id]?.description).map((p) => p.id)
  if (empty.length) console.log(`  Sem descrição na configuração: ${empty.join(', ')}`)
  for (const id of Object.keys(projectDetails)) {
    if (!ids.has(id)) warn(`projectDetails["${id}"] não corresponde a nenhum repositório público (renomeado, privado ou escondido?)`)
  }
  for (const id of duplicatedExternals(projects, externalProjects)) {
    warn(`externalProjects["${id}"] repete um repositório público e será ignorado (vale o do GitHub)`)
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  if (soft) {
    console.warn(`\n⚠ Sincronização com o GitHub falhou: ${message}`)
    console.warn(existsSync(SNAPSHOT_FILE) ? '  Usando o último snapshot salvo em src/generated/projects.json.\n' : '  Nenhum snapshot salvo: a seção de projetos ficará vazia.\n')
    process.exit(0)
  }
  console.error(`\n✗ Sincronização com o GitHub falhou: ${message}\n`)
  process.exit(1)
})
