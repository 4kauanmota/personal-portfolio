import type { ProjectReadme } from '../lib/types'

/**
 * READMEs dos projetos, já convertidos e sanitizados no build (src/generated/readmes).
 * Cada um vira um pedacinho separado do site, baixado só quando você abre o leitor:
 * o carregamento inicial não fica mais pesado e o navegador nunca fala com a API do GitHub.
 */
const files = import.meta.glob<ProjectReadme>('../generated/readmes/*.json', { import: 'default' })
const cache = new Map<string, ProjectReadme>()

const keyOf = (id: string) => `../generated/readmes/${id}.json`

/** Existe um README preparado para este projeto? */
export function hasReadme(id: string): boolean {
  return keyOf(id) in files
}

/**
 * Carrega o README de um projeto. `null` = o projeto não tem README preparado.
 * Erros de rede (conexão caiu, deploy novo trocou os arquivos) são lançados para o leitor tratar.
 */
export async function loadReadme(id: string): Promise<ProjectReadme | null> {
  const cached = cache.get(id)
  if (cached) return cached
  const loader = files[keyOf(id)]
  if (!loader) return null
  const doc = await loader()
  cache.set(id, doc)
  return doc
}
