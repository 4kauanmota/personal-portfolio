import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import { prefersReducedMotion } from './motion'

/**
 * Profundidade na rolagem.
 *
 * Cada seção registra a própria "cena". Elementos com `data-depth` dentro dela
 * se deslocam em velocidades diferentes conforme passam pela tela:
 *   depth  0.3  → anda mais devagar que a página (parece estar longe)
 *   depth -0.2  → anda mais rápido (parece estar perto)
 * O deslocamento é zero quando o elemento está no meio da tela, então nada
 * fica fora do lugar quando você para para ler. A primeira seção usa `anchor: 'top'`:
 * ali o repouso é a página no topo, para a composição de abertura nascer no lugar.
 * A cena também publica `--progress` (0 → 1 enquanto a seção atravessa a tela)
 * no elemento indicado, para efeitos como o sol que se põe.
 *
 * Um único ouvinte de rolagem, um quadro por vez, só seções visíveis e só transform.
 * Com "reduzir movimento", nada se mexe; em telas de toque ou estreitas, menos.
 */
interface Layer {
  el: HTMLElement
  depth: number
  /** Deslocamento aplicado agora (para achar a posição original do elemento). */
  y: number
}

interface Scene {
  root: HTMLElement
  layers: Layer[]
  progressTarget: HTMLElement | null
  onProgress?: (progress: number) => void
  /** Onde fica o repouso: elemento no meio da tela (padrão) ou seção no topo da página. */
  anchor: 'center' | 'top'
  visible: boolean
}

const scenes = new Set<Scene>()
let frame = 0
let observer: IntersectionObserver | null = null
const gentleQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 760px), (hover: none)') : null

function amplitude(): number {
  if (prefersReducedMotion.value) return 0
  // Bem perceptível no computador; no celular, metade disso (a tela é pequena e o dedo rola rápido).
  return gentleQuery?.matches ? 0.7 : 1.45
}

function update() {
  frame = 0
  const vh = window.innerHeight
  const scale = amplitude()
  const active = [...scenes].filter((s) => s.visible)

  // Primeiro todas as leituras, depois todas as escritas (sem idas e voltas de layout).
  const reads = active.map((scene) => ({
    scene,
    rect: scene.root.getBoundingClientRect(),
    layers: scene.layers.map((layer) => ({ layer, rect: layer.el.getBoundingClientRect() })),
  }))

  for (const { scene, rect, layers } of reads) {
    for (const { layer, rect: r } of layers) {
      const center = r.top - layer.y + r.height / 2
      const raw = scene.anchor === 'top' ? rect.top : center - vh / 2
      const offset = Math.max(-vh * 1.4, Math.min(vh * 1.4, raw))
      layer.y = scale ? -offset * layer.depth * scale : 0
      layer.el.style.transform = scale ? `translate3d(0, ${layer.y.toFixed(1)}px, 0)` : ''
    }
    const progress = Math.min(1, Math.max(0, (vh - rect.top) / (rect.height + vh)))
    scene.progressTarget?.style.setProperty('--progress', progress.toFixed(4))
    scene.onProgress?.(progress)
  }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(update)
}

function ensureListeners() {
  if (observer || typeof window === 'undefined') return
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  gentleQuery?.addEventListener('change', schedule)
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', schedule)
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        for (const scene of scenes) if (scene.root === entry.target) scene.visible = entry.isIntersecting
      }
      schedule()
    },
    { rootMargin: '50% 0px' },
  )
}

export function useScene(
  root: Ref<HTMLElement | null>,
  options: { progressTarget?: Ref<HTMLElement | null>; onProgress?: (progress: number) => void; anchor?: 'center' | 'top' } = {},
) {
  let scene: Scene | null = null

  onMounted(() => {
    const el = root.value
    if (!el || typeof window === 'undefined') return
    ensureListeners()
    const layers = [...el.querySelectorAll<HTMLElement>('[data-depth]')].map((layer) => ({ el: layer, depth: Number(layer.dataset.depth) || 0, y: 0 }))
    scene = {
      root: el,
      layers,
      progressTarget: options.progressTarget?.value ?? null,
      onProgress: options.onProgress,
      anchor: options.anchor ?? 'center',
      visible: true,
    }
    scenes.add(scene)
    observer?.observe(el)
    schedule()
  })

  onBeforeUnmount(() => {
    if (!scene) return
    observer?.unobserve(scene.root)
    scenes.delete(scene)
  })

  return { refresh: schedule }
}

/** Reaplica as cenas (ex.: depois que um bloco abriu e a página mudou de altura). */
export function refreshScenes() {
  schedule()
}
