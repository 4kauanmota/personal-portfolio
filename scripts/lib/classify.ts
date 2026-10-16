import type { Locale, ProjectCategory, ProjectKind } from '../../src/lib/types.ts'

/** Remove acentos, espaços e pontuação para comparar nomes de tecnologias. */
export function techKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9#+]/g, '')
}

/**
 * Nomes canônicos de tecnologias. A chave é o resultado de techKey().
 * Tópicos e listas de README que não estão aqui não viram "tecnologia"
 * (continuam disponíveis como tópicos).
 */
const TECH_NAMES: Record<string, string> = {
  typescript: 'TypeScript', typesc: 'TypeScript', ts: 'TypeScript', javascript: 'JavaScript', js: 'JavaScript',
  html: 'HTML', html5: 'HTML', css: 'CSS', css3: 'CSS', sass: 'Sass', scss: 'Sass', python: 'Python',
  java: 'Java', php: 'PHP', 'c#': 'C#', csharp: 'C#', net: '.NET', dotnet: '.NET', blazor: 'Blazor',
  razor: 'Razor', webassembly: 'WebAssembly', wasm: 'WebAssembly', gdscript: 'GDScript', 'c++': 'C++',
  vue: 'Vue', vuejs: 'Vue', vue3: 'Vue', nuxt: 'Nuxt', nuxtjs: 'Nuxt', nuxt4: 'Nuxt', nuxt3: 'Nuxt',
  vuetify: 'Vuetify', react: 'React', reactjs: 'React', reactnative: 'React Native', expo: 'Expo',
  nextjs: 'Next.js', next: 'Next.js', redux: 'Redux', reduxtoolkit: 'Redux Toolkit', zustand: 'Zustand',
  reactrouterdom: 'React Router', reactrouter: 'React Router', jsx: 'JSX', tailwind: 'Tailwind CSS',
  tailwindcss: 'Tailwind CSS', nuxtjstailwindcss: 'Tailwind CSS', bootstrap: 'Bootstrap', vite: 'Vite',
  webpack: 'Webpack', babel: 'Babel', jest: 'Jest', vitest: 'Vitest', electron: 'Electron',
  electronjs: 'Electron', capacitor: 'Capacitor', codemirror: 'CodeMirror', axios: 'Axios',
  node: 'Node.js', nodejs: 'Node.js', fastify: 'Fastify', express: 'Express', prisma: 'Prisma',
  swagger: 'Swagger', mongodb: 'MongoDB', mysql: 'MySQL', sqlite: 'SQLite', postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL', firebase: 'Firebase', firebaseauth: 'Firebase', supabase: 'Supabase',
  supabasejs: 'Supabase', flask: 'Flask', poetry: 'Poetry', django: 'Django', laravel: 'Laravel',
  blade: 'Blade', spring: 'Spring', maven: 'Maven', thymeleaf: 'Thymeleaf', jpql: 'JPQL', ajax: 'AJAX',
  tensorflow: 'TensorFlow', tensorflowjs: 'TensorFlow', pytorch: 'PyTorch', openai: 'OpenAI',
  chatgpt: 'ChatGPT', mockapi: 'MockAPI', docker: 'Docker', aws: 'AWS', vercel: 'Vercel',
  godot: 'Godot', godotengine: 'Godot', unity: 'Unity', phaser: 'Phaser', nuxtjsi18n: 'Nuxt i18n',
  i18n: 'i18n', fancyapps: 'Fancybox', fancyappsui: 'Fancybox', lucidevuenext: 'Lucide',
  formkitautoanimate: 'AutoAnimate', autoanimate: 'AutoAnimate', markdown: 'Markdown', pinia: 'Pinia',
  elasticsearch: 'Elasticsearch',
}

/** Ferramentas de apoio que não fazem sentido como "tecnologia do projeto". */
const SUPPORT_TOOLS = new Set([
  'visualstudiocode', 'vscode', 'git', 'github', 'gitlab', 'npm', 'yarn', 'pnpm', 'liveshare', 'intelij',
  'intellij', 'dbeaver', 'mysqlworkbench', 'postman', 'trello', 'figma', 'bohr', 'bohrdeployed', 'expogo',
  'androidstudio',
])

export function canonicalTech(raw: string): string | null {
  const key = techKey(raw)
  if (!key || SUPPORT_TOOLS.has(key)) return null
  if (TECH_NAMES[key]) return TECH_NAMES[key]
  // "Nuxt 4 + Vue 3" → tratado por quem chama (split em "+").
  const withoutVersion = techKey(raw.replace(/\s+v?\d+(\.\d+)*\s*$/i, ''))
  return TECH_NAMES[withoutVersion] ?? null
}

/** Lista de tecnologias sem duplicatas, na ordem em que aparecem. */
export function normalizeTechnologies(values: string[]): string[] {
  const out: string[] = []
  for (const value of values) {
    for (const part of value.split(/\s+\+\s+|\s*,\s*|\s+&\s+/)) {
      const name = canonicalTech(part.trim())
      if (name && !out.includes(name)) out.push(name)
    }
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Idioma                                                              */
/* ------------------------------------------------------------------ */

const PT_WORDS = ['de', 'que', 'não', 'para', 'com', 'uma', 'os', 'as', 'do', 'da', 'dos', 'das', 'em', 'é', 'você', 'seu', 'sua', 'no', 'na', 'um', 'por', 'mais', 'como', 'também', 'são', 'ao', 'pelo', 'pela', 'site', 'projeto', 'aplicativo']
const EN_WORDS = ['the', 'and', 'to', 'of', 'is', 'you', 'with', 'for', 'this', 'that', 'your', 'are', 'in', 'it', 'on', 'by', 'from', 'an', 'be', 'can', 'was', 'my', 'project', 'about', 'using']

/** Detecta português ou inglês por frequência de palavras comuns. */
export function detectLanguage(text: string): Locale | null {
  const words = text
    .toLowerCase()
    .replace(/[`*_#>[\]()!|~-]/g, ' ')
    .split(/[^a-zà-ÿ]+/i)
    .filter(Boolean)
  if (words.length < 4) return null
  const pt = new Set(PT_WORDS)
  const en = new Set(EN_WORDS)
  let ptScore = 0
  let enScore = 0
  for (const word of words) {
    if (pt.has(word)) ptScore++
    if (en.has(word)) enScore++
  }
  // Acentos e cedilha são sinais fortes de português.
  ptScore += (text.match(/[ãõçáéíóúâêô]/gi)?.length ?? 0) * 0.5
  if (ptScore === 0 && enScore === 0) return null
  if (ptScore > enScore * 1.15) return 'pt-BR'
  if (enScore > ptScore * 1.15) return 'en'
  return null
}

/* ------------------------------------------------------------------ */
/* Categorias                                                          */
/* ------------------------------------------------------------------ */

const TOPIC_RULES: Array<[ProjectCategory, string[]]> = [
  ['games', ['game', 'games', 'gamedev', 'game-dev', 'game-development', 'godot', 'godot-engine', 'godotengine', 'gdscript', 'unity', 'unity3d', 'game-jam', 'gamejam', 'indie-game', 'indie-games', 'game-studio', 'visual-novel', 'renpy', 'phaser', 'pygame', 'love2d', 'pixel-art', 'itch-io']],
  ['ai', ['ai', 'ml', 'machine-learning', 'deep-learning', 'neural-network', 'neural-networks', 'tensorflow', 'tensorflowjs', 'pytorch', 'openai', 'llm', 'gpt', 'chatbot', 'nlp', 'computer-vision', 'artificial-intelligence', 'perceptron']],
  ['tools', ['cli', 'command-line', 'terminal', 'tui', 'shell', 'npm-package', 'library', 'tool', 'tools', 'devtools', 'developer-tools']],
  ['apps', ['android', 'ios', 'react-native', 'expo', 'flutter', 'capacitor', 'mobile', 'kotlin', 'swift', 'ionic', 'desktop', 'desktop-app', 'electron', 'electronjs', 'tauri', 'windows']],
  ['servers', ['api', 'rest-api', 'graphql', 'fastify', 'express', 'flask', 'django', 'nestjs', 'backend', 'back-end']],
]

/** Sinais de web que valem sempre. */
const STRONG_WEB_TOPICS = ['web', 'website', 'site', 'landing-page', 'portfolio', 'frontend', 'front-end', 'html', 'css', 'sass', 'tailwindcss', 'nextjs']
/** Sinais de web que também aparecem em apps (React Native, Electron…), então só valem sem mobile/desktop. */
const WEAK_WEB_TOPICS = ['vue', 'vuejs', 'nuxt', 'nuxtjs', 'react', 'vite']

/** Prioridade (a primeira categoria é a principal). */
export const CATEGORY_PRIORITY: ProjectCategory[] = ['games', 'ai', 'tools', 'apps', 'servers', 'web', 'other']

/**
 * Pistas para sugerir filtros e tipo de um repositório SEM entrada na configuração.
 * O nome do repositório não entra: palavras como "game" ou "app" no nome não classificam nada.
 * A classificação de verdade fica em src/content/projects.config.ts.
 */
export interface CategoryInput {
  topics: string[]
  technologies: string[]
  languages: string[]
  readmeText: string
}

/** Uma ou mais categorias sugeridas, em ordem de prioridade. */
export function categorize(input: CategoryInput): ProjectCategory[] {
  const found = new Set<ProjectCategory>()
  const topics = input.topics.map((t) => t.toLowerCase())

  for (const [category, keys] of TOPIC_RULES) {
    if (topics.some((t) => keys.includes(t))) found.add(category)
  }

  const tech = new Set(input.technologies)
  if (tech.has('React Native') || tech.has('Expo') || tech.has('Capacitor') || tech.has('Electron')) found.add('apps')
  if (tech.has('TensorFlow') || tech.has('PyTorch')) found.add('ai')
  if (tech.has('Godot') || tech.has('Unity') || tech.has('Phaser') || input.languages.includes('GDScript')) found.add('games')

  const text = input.readmeText.toLowerCase()
  if (/\b(jogo|game)\b/.test(text) && /\b(godot|unity|phaser|game jam|gamejam|jogar|play the game|guess|adivinh)/.test(text)) {
    found.add('games')
  }
  if (/\bnpx\s+[\w@/.-]+/.test(text) && /\bcli\b|command[- ]line|linha de comando/.test(text)) found.add('tools')

  const isApp = found.has('apps')
  if (topics.some((t) => STRONG_WEB_TOPICS.includes(t)) || (!isApp && topics.some((t) => WEAK_WEB_TOPICS.includes(t)))) {
    found.add('web')
  }

  if (found.size === 0) {
    const langs = input.languages
    if (langs.some((l) => ['HTML', 'CSS', 'Vue', 'SCSS', 'Svelte'].includes(l))) found.add('web')
  }
  if (found.size === 0) found.add('other')

  return CATEGORY_PRIORITY.filter((c) => found.has(c))
}

const LIBRARY_TOPICS = ['library', 'lib', 'npm-package', 'package', 'sdk', 'framework']

/**
 * Tipo sugerido (WEB, APP, JOGO…) a partir das categorias sugeridas.
 * null quando não há pista nenhuma: o card fica sem etiqueta até a configuração dizer.
 */
export function guessKind(categories: ProjectCategory[], topics: string[] = []): ProjectKind | null {
  const main = categories[0]
  switch (main) {
    case 'games':
      return 'game'
    case 'ai':
      return 'ai'
    case 'tools':
      return topics.some((t) => LIBRARY_TOPICS.includes(t.toLowerCase())) ? 'lib' : 'cli'
    case 'apps':
      return 'app'
    case 'servers':
      return 'api'
    case 'web':
      return 'web'
    default:
      return null
  }
}

/**
 * Sufixos da convenção de nomes dos repositórios (-web, -app, -api, -cli, -ai…).
 * Saem do nome legível: o tipo já aparece na etiqueta ao lado do nome, sem repetir.
 */
const PLATFORM_SUFFIX = /[-_](web|app|site|website|mobile|api|cli|ai)$/i

function titleCase(text: string): string {
  const small = new Set(['and', 'or', 'of', 'the', 'e', 'de', 'do', 'da'])
  const upper: Record<string, string> = { ai: 'AI', api: 'API', cli: 'CLI', ui: 'UI', ia: 'IA', ux: 'UX' }
  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word, i) => {
      const lower = word.toLowerCase()
      if (upper[lower]) return upper[lower]
      if (i > 0 && small.has(lower)) return lower
      if (/^\d/.test(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

/** Nome do repositório legível: "dev-calc-web" → "Dev Calc", "food-api" → "Food". */
export function humanizeRepoName(name: string): string {
  return titleCase(name.replace(PLATFORM_SUFFIX, '') || name)
}
