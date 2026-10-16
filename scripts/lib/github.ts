/**
 * Cliente mínimo da API REST do GitHub, usado só no build.
 * O token (se houver) vem de variável de ambiente e nunca vai para o navegador.
 */

export interface ApiRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  fork: boolean
  archived: boolean
  disabled?: boolean
  private: boolean
  homepage: string | null
  language: string | null
  topics?: string[]
  stargazers_count: number
  created_at: string
  updated_at: string
  pushed_at: string
  default_branch: string
  has_pages?: boolean
  owner: { login: string }
}

export interface ApiReadme {
  path: string
  /** Endereço do arquivo no GitHub (ex.: …/blob/main/README.md). */
  htmlUrl: string | null
  /** Texto do README (Markdown), já decodificado. */
  content: string | null
}

export class RateLimitError extends Error {
  constructor(public readonly resetAt: Date | null) {
    super(`Limite da API do GitHub atingido${resetAt ? ` (libera às ${resetAt.toLocaleTimeString('pt-BR')})` : ''}.`)
    this.name = 'RateLimitError'
  }
}

export class HttpError extends Error {
  constructor(public readonly status: number, url: string) {
    super(`HTTP ${status} em ${url}`)
    this.name = 'HttpError'
  }
}

export interface ClientOptions {
  token?: string
  apiUrl?: string
  timeoutMs?: number
}

export class GitHubClient {
  readonly apiUrl: string
  private readonly token?: string
  private readonly timeoutMs: number
  requests = 0
  remaining: number | null = null

  constructor(options: ClientOptions = {}) {
    this.apiUrl = (options.apiUrl ?? 'https://api.github.com').replace(/\/$/, '')
    this.token = options.token || undefined
    this.timeoutMs = options.timeoutMs ?? 20_000
  }

  get authenticated(): boolean {
    return Boolean(this.token)
  }

  private async request(url: string, accept = 'application/vnd.github+json'): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': '4kauanmota-portfolio-sync',
    }
    if (this.token && url.startsWith(this.apiUrl)) headers.Authorization = `Bearer ${this.token}`

    let lastError: unknown
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        this.requests++
        const response = await fetch(url, { headers, signal: AbortSignal.timeout(this.timeoutMs) })
        const remaining = response.headers.get('x-ratelimit-remaining')
        if (remaining !== null) this.remaining = Number(remaining)
        if ((response.status === 403 || response.status === 429) && (remaining === '0' || response.headers.has('retry-after'))) {
          const reset = response.headers.get('x-ratelimit-reset')
          throw new RateLimitError(reset ? new Date(Number(reset) * 1000) : null)
        }
        if (response.status >= 500 && attempt < 2) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
          continue
        }
        return response
      } catch (error) {
        if (error instanceof RateLimitError) throw error
        lastError = error
        if (attempt < 2) await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError))
  }

  private async json<T>(url: string): Promise<T> {
    const response = await this.request(url)
    if (!response.ok) throw new HttpError(response.status, url)
    return (await response.json()) as T
  }

  /** Todos os repositórios públicos do usuário (paginado). */
  async listRepos(user: string): Promise<ApiRepo[]> {
    const repos: ApiRepo[] = []
    for (let page = 1; page <= 10; page++) {
      const batch = await this.json<ApiRepo[]>(
        `${this.apiUrl}/users/${encodeURIComponent(user)}/repos?per_page=100&type=owner&sort=pushed&page=${page}`,
      )
      repos.push(...batch)
      if (batch.length < 100) break
    }
    return repos
  }

  /**
   * README da raiz (qualquer variação de nome): onde ele está e o texto.
   * Uma requisição só. Retorna null se o repositório não tiver README.
   */
  async readme(fullName: string): Promise<ApiReadme | null> {
    const url = `${this.apiUrl}/repos/${fullName}/readme`
    const response = await this.request(url)
    if (response.status === 404) return null
    if (!response.ok) throw new HttpError(response.status, url)
    const data = (await response.json()) as { path: string; html_url?: string | null; content?: string; encoding?: string }
    let content: string | null = null
    if (typeof data.content === 'string') {
      content = data.encoding === 'base64' ? Buffer.from(data.content, 'base64').toString('utf8') : data.content
    }
    return { path: data.path, htmlUrl: data.html_url ?? null, content }
  }
}

/** Executa tarefas com concorrência limitada, preservando a ordem dos resultados. */
export async function mapLimit<T, R>(items: T[], limit: number, task: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index] as T, index)
    }
  })
  await Promise.all(workers)
  return results
}
