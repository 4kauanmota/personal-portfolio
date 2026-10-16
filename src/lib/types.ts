/**
 * Tipos compartilhados entre o site (navegador) e o script de sincronização (Node).
 * Não importe nada específico de DOM ou de Node aqui.
 */

export const LOCALES = ['pt-BR', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'pt-BR'

/** Texto com uma versão para cada idioma do site. */
export type Localized<T = string> = Record<Locale, T>

/**
 * Áreas dos projetos, na ordem dos filtros. Os nomes que aparecem no site
 * (Jogos, Sites, Aplicativos…) ficam nas traduções, sem siglas.
 *   apps    = celular e computador
 *   tools   = ferramentas de linha de comando e pacotes
 *   servers = APIs e serviços de back-end
 */
export const PROJECT_CATEGORIES = ['games', 'web', 'apps', 'tools', 'servers', 'ai', 'other'] as const
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number]

/**
 * O que o projeto é. Aparece em letras maiúsculas ao lado do nome (WEB, APP, JOGO…)
 * e define o filtro principal. Os rótulos de cada idioma ficam nas traduções.
 *   web  = site ou sistema que roda no navegador
 *   app  = aplicativo de celular ou de computador
 *   game = jogo
 *   cli  = ferramenta de linha de comando
 *   api  = API ou serviço de back-end
 *   ai   = inteligência artificial
 *   lib  = biblioteca ou pacote
 */
export const PROJECT_KINDS = ['web', 'app', 'game', 'cli', 'api', 'ai', 'lib'] as const
export type ProjectKind = (typeof PROJECT_KINDS)[number]

/** Filtro em que cada tipo de projeto entra. */
export const KIND_CATEGORY: Record<ProjectKind, ProjectCategory> = {
  web: 'web',
  app: 'apps',
  game: 'games',
  cli: 'tools',
  lib: 'tools',
  api: 'servers',
  ai: 'ai',
}

/** O que o link publicado é: site, pacote (npm…) ou mídia (capturas, vídeo). */
export type LiveKind = 'site' | 'package' | 'media'

/**
 * Um repositório público do GitHub, do jeito que a sincronização grava
 * (src/generated/projects.json). Só dados do GitHub: as descrições e a
 * classificação de cada projeto ficam em src/content/projects.config.ts.
 */
export interface RepoProject {
  /** Nome do repositório (identificador estável e nome da imagem personalizada). */
  id: string
  /** Nome legível, derivado do nome do repositório (sem -web, -app, -api…). */
  title: string
  url: string
  /** README original no GitHub (null se o repositório não tiver README). */
  readmeUrl: string | null
  /** Link publicado (campo "homepage" do GitHub ou GitHub Pages). */
  liveUrl: string | null
  liveKind: LiveKind | null
  /** Tipo sugerido pelos tópicos e pela linguagem do repositório (vale só se a configuração não disser). */
  kind: ProjectKind | null
  /** Filtros sugeridos pelos tópicos e pela linguagem (idem). */
  categories: ProjectCategory[]
  /** Linguagem principal segundo o GitHub. */
  language: string | null
  createdAt: string
  pushedAt: string
  archived: boolean
}

export interface ProjectsSnapshot {
  /** Data ISO da última sincronização bem-sucedida. */
  generatedAt: string
  username: string
  profileUrl: string
  repoCount: number
  /** Versão do conversor de README que gerou os arquivos (muda → todos são refeitos). */
  readmeFormat?: number
  /** Pela data de criação no GitHub, do mais novo para o mais antigo. */
  projects: RepoProject[]
}

/**
 * Ajustes de um repositório do GitHub (src/content/projects.config.ts).
 * Tudo é opcional: o que faltar vem do GitHub.
 */
export interface ProjectDetails {
  /** Tipo do projeto (a etiqueta ao lado do nome e o filtro principal). */
  kind?: ProjectKind
  /** Nome no site, se o derivado do repositório não servir. */
  title?: string
  /** Descrição em português e em inglês. null ou ausente: o card fica sem descrição. */
  description?: Localized | null
  /**
   * Link do botão "Ver site". Um endereço substitui o do GitHub; null esconde o botão.
   * Ausente: vale o campo "Website" (homepage) do repositório ou o GitHub Pages.
   */
  liveUrl?: string | null
  /** Outros filtros em que o projeto também aparece (ex.: um site de estúdio em "Jogos"). */
  also?: ProjectCategory[]
}

/**
 * Projeto que não vem do GitHub: privado, de cliente, em outro serviço…
 * Entra na mesma galeria, com os mesmos cards, filtros e animações.
 */
export interface ExternalProject {
  /** Obrigatório. Único, em minúsculas e com hífens. Também é o nome da imagem em src/assets/projects. */
  id: string
  /** Obrigatório. Nome do projeto. */
  title: string
  /** Obrigatório. Tipo do projeto. */
  kind: ProjectKind
  /** Obrigatório. Quando o projeto começou: 'AAAA-MM-DD' ou 'AAAA-MM' (define a posição na galeria). */
  createdAt: string
  /** Obrigatório (pode ser null). Descrição em português e em inglês. */
  description: Localized | null
  /** Opcional. Código fechado: mostra "Código privado" e nunca mostra o link do repositório. */
  private?: boolean
  /** Opcional. Endereço do botão "Ver site". */
  liveUrl?: string | null
  /** Opcional. Repositório em outro lugar (GitLab, Bitbucket…). Ignorado se o projeto for privado. */
  repoUrl?: string | null
  /** Opcional. Imagem: endereço https ou caminho de um arquivo em public/ (ex.: '/projetos/loja.png'). */
  image?: string | null
  /** Opcional. Linguagem principal (aparece na arte genérica, quando não há imagem). */
  language?: string | null
  /** Opcional. Outros filtros em que o projeto também aparece. */
  also?: ProjectCategory[]
}

/** Um projeto como o site mostra: repositório do GitHub ou projeto da configuração. */
export interface Project {
  id: string
  title: string
  kind: ProjectKind | null
  categories: ProjectCategory[]
  description: Localized | null
  /** Repositório (null em projetos privados ou sem código público). */
  url: string | null
  /** README original no GitHub (null se não houver; projetos da configuração não têm). */
  readmeUrl: string | null
  liveUrl: string | null
  liveKind: LiveKind | null
  language: string | null
  createdAt: string
  archived: boolean
  /** De onde o projeto veio. */
  source: 'github' | 'config'
  private: boolean
  /** Imagem definida na configuração; sem ela, vale a pasta src/assets/projects. */
  image: string | null
}

/** Imagem personalizada de um projeto (pasta src/assets/projects). */
export interface ProjectImage {
  src: string
  width: number | null
  height: number | null
}

/** README de um projeto, já convertido e sanitizado no build (src/generated/readmes/<id>.json). */
export interface ProjectReadme {
  id: string
  /** O arquivo original no GitHub. */
  sourceUrl: string
  /** Idioma detectado do texto (para o atributo lang). */
  lang: Locale | null
  /** Títulos do README, para o sumário do leitor. */
  headings: Array<{ id: string; text: string; depth: number }>
  /** HTML seguro: passou pelo sanitize-html no build. */
  html: string
}
