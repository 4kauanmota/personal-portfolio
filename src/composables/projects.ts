import { computed, ref, shallowRef } from 'vue'
import projectImages from 'virtual:project-images'
import { mergeProjects } from '../lib/portfolio'
import type { Project, ProjectCategory, ProjectImage, ProjectsSnapshot } from '../lib/types'
import { PROJECT_CATEGORIES } from '../lib/types'

export { newestFirst } from '../lib/portfolio'

type Status = 'idle' | 'loading' | 'ready' | 'error'

const status = ref<Status>('idle')
const snapshot = shallowRef<ProjectsSnapshot | null>(null)
const merged = shallowRef<Project[]>([])

/**
 * Carrega os projetos: o snapshot do GitHub (gerado no build) e a configuração do
 * portfólio (descrições, tipos, links e projetos de fora do GitHub), juntos.
 * Vêm em arquivos separados para não pesar no carregamento inicial.
 */
export async function loadProjects(): Promise<void> {
  if (status.value === 'loading' || status.value === 'ready') return
  status.value = 'loading'
  try {
    const [data, config] = await Promise.all([import('../generated/projects.json'), import('../content/projects.config')])
    const snap = data.default as unknown as ProjectsSnapshot
    merged.value = mergeProjects(snap.projects ?? [], {
      details: config.projectDetails,
      external: config.externalProjects,
      hidden: config.projectsConfig.hidden,
    })
    snapshot.value = snap
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
}

/** Sempre do mais novo para o mais antigo, pela data de criação (veja lib/portfolio). */
export function useProjects() {
  const projects = computed(() => merged.value)
  return { status, snapshot, projects }
}

/**
 * Imagem do projeto: a definida na configuração (projetos de fora do GitHub) ou o arquivo
 * src/assets/projects/<id>.<ext>, se existir.
 */
export function imageFor(project: Project): ProjectImage | null {
  if (project.image) return { src: project.image, width: null, height: null }
  return projectImages[project.id.toLowerCase()] ?? null
}

export function categoryCounts(list: Project[]): Array<{ id: ProjectCategory | 'all'; count: number }> {
  const counts = PROJECT_CATEGORIES.map((id) => ({ id, count: list.filter((p) => p.categories.includes(id)).length })).filter((c) => c.count > 0)
  return [{ id: 'all' as const, count: list.length }, ...counts]
}

/** Número estável a partir de um texto (para variar a arte dos projetos sem imagem). */
export function hashOf(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
