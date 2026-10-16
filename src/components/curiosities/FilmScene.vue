<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId } from 'vue'
import { prefersReducedMotion, useInView } from '../../composables/motion'
import {
  boundsOf,
  centerline,
  displace,
  finish,
  frameAnchors,
  frameGeometry,
  pathOf,
  uprightOffset,
  whipOffset,
  whipSettle,
  WHIP,
  type Box,
  type Centerline,
  type FilmFrame,
  type FilmLayer,
  type FilmStripView,
  type Pt,
} from '../../lib/film'
import { dealMemories, MEMORIES } from '../../lib/memories'
import { seeded } from '../../lib/sun'
import FilmStrip from './FilmStrip.vue'

/**
 * As fitas de filme das Curiosidades: fragmentos de um filme de lembranças, soltos no ar.
 *
 * Cada fragmento é um pedaço curto de película, com furos vazados, bordas que pegam a luz
 * e um quadro aceso a cada passo, sempre com uma lembrança desenhada (famílias
 * caminhando, pessoas dividindo um momento, guarda-chuvas, paisagens, árvores, pequenos
 * astros). Eles se espalham pelo palco em direções diferentes (em pé, deitados, na diagonal,
 * em curva) e em três profundidades: longe e no meio, atrás da TV e da caixa; perto, na
 * frente de tudo, nos cantos. Ficam pelas bordas da tela (passam do container e saem por
 * elas) e nenhum toca nos aparelhos. São delicados: tons pastéis e pouco saturados (um rosa
 * antigo que lembra o vermelho do filme revelado), bem transparentes e de pouco contraste,
 * e as lembranças aparecem enquadradas, às vezes com um pedaço fora do quadro.
 *
 * A composição se refaz a partir da posição real da TV, do leitor, da caixa e dos textos
 * (nenhuma fita passa por cima de texto). Cada fragmento deriva no seu ritmo, então o céu
 * parece vivo sem que tudo se mova junto.
 *
 * Ao inserir um disquete (whip), uma onda nasce na fenda e atravessa as fitas, primeiro as
 * de perto, depois as de longe, e se dissipa até o repouso exato. Com "reduzir movimento",
 * nada deriva nem balança.
 *
 * Leveza: cada mudança no desenho de uma fita obriga o navegador a redesenhá-la inteira
 * (máscara, furos, quadros, granulação), e no Firefox isso pesa. Então:
 *   - o chicote redesenha ~30 vezes por segundo, só as fitas que a onda está balançando
 *     de verdade, e cada uma para assim que o balanço fica menor que meio pixel;
 *   - quando a tela da TV cresce ou encolhe (glide), as fitas se recompõem uma vez só, já
 *     na posição final, e deslizam até ela junto com os aparelhos, sem redesenhar.
 */
const props = defineProps<{
  /** Textos por onde as fitas não podem passar (seletor, procurado na seção). */
  avoid?: string
}>()

const uid = useId()
const behind = ref<HTMLElement | null>(null)
const ahead = ref<HTMLElement | null>(null)
useInView(behind, { rootMargin: '30% 0px' })
useInView(ahead, { rootMargin: '30% 0px' })

interface StripDef {
  id: string
  layer: FilmLayer
  /** Largura da fita (px). */
  width: number
  /** 0 = distante (fina, apagada); 1 = perto (grande, com toda a luz). */
  depth: number
  control: Pt[]
  /** Fração do comprimento que se dissolve no começo e no fim. */
  fade: [number, number]
  drift: FilmStripView['drift']
  tilt: FilmStripView['tilt']
}

interface Strip extends FilmStripView {
  line: Centerline
  /** Onde o primeiro quadro fica (px desde o começo da fita). */
  first: number
}

const strips = shallowRef<Strip[]>([])
/** Luz da TV no espaço do palco (as bordas das fitas perto dela brilham mais). */
const light = ref({ x: 0, y: 0, r: 600 })

const byLayer = computed(() => {
  const out: Record<FilmLayer, Strip[]> = { far: [], mid: [], near: [] }
  for (const s of strips.value) out[s.layer].push(s)
  return out
})

/** Granulação da película: um ladrilho pequeno de grãos claros e escuros, sempre o mesmo. */
const GRAIN = (() => {
  const r = seeded(7)
  return Array.from({ length: 24 }, () => ({
    x: +(r() * 24).toFixed(1),
    y: +(r() * 24).toFixed(1),
    r: +(0.4 + r() * 0.8).toFixed(2),
    fill: r() > 0.55 ? '#fff2dc' : '#000',
    a: +(0.05 + r() * 0.12).toFixed(3),
  }))
})()

/* ------------------------------------------------------------------ */
/* Composição                                                          */
/* ------------------------------------------------------------------ */

let tvEl: HTMLElement | null = null
let deckEl: HTMLElement | null = null
let trayEl: HTMLElement | null = null
let slotEl: HTMLElement | null = null
let stageEl: HTMLElement | null = null

/**
 * Posição de um elemento no palco pelo layout (offsetTop/offsetLeft), sem os deslocamentos
 * animados: a TV flutua de leve e faz glitch, mas as fitas se compõem sempre pela posição de
 * repouso, então a mesma tela dá sempre a mesma composição.
 */
function boxOf(el: HTMLElement | null): Box | null {
  if (!el || !stageEl) return null
  let x = 0
  let y = 0
  let node: HTMLElement | null = el
  while (node && node !== stageEl) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  if (node !== stageEl) return null
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

/** Retângulo do texto de verdade (não da caixa inteira do bloco), no espaço do palco. */
function textBox(el: Element, base: DOMRect): Box | null {
  const range = document.createRange()
  range.selectNodeContents(el)
  const r = range.getBoundingClientRect()
  if (!r.width || !r.height) return null
  return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }
}

/** Deriva no ar: amplitudes pequenas e durações diferentes, para nada andar em coro. */
function driftOf(index: number, depth: number): FilmStripView['drift'] {
  const r = seeded(31 + index * 17)
  const amp = 3 + depth * 5
  return {
    x: +((r() - 0.5) * 2 * amp).toFixed(1),
    y: +((r() - 0.5) * 2 * amp).toFixed(1),
    r: +((r() - 0.5) * 2.4).toFixed(2),
    dur: +(13 + r() * 14).toFixed(1),
    delay: -+(r() * 20).toFixed(1),
  }
}

function compose(): StripDef[] {
  const base = stageEl!.getBoundingClientRect()
  const W = base.width
  const H = base.height
  const tv = boxOf(tvEl)
  const deck = boxOf(deckEl)
  const tray = boxOf(trayEl)
  if (!tv || !deck || !W || !H) return []
  const wide = W >= 1000
  const mid = W >= 640
  const defs: Array<Omit<StripDef, 'drift'>> = []
  const L = tv.x
  const R = tv.x + tv.w
  const tvMid = tv.y + tv.h / 2
  const trayTop = tray ? tray.y : H * 0.7
  const trayMid = tray ? tray.y + tray.h * 0.55 : H * 0.85
  const trayL = tray ? tray.x : W * 0.15
  const trayR = tray ? tray.x + tray.w : W * 0.85
  // As bordas da tela no espaço do palco: as fitas passam do container e vão até elas.
  const ex0 = -base.left
  const ex1 = document.documentElement.clientWidth - base.left
  const bandL = L - ex0
  const bandR = ex1 - R
  const deckR = deck.x + deck.w

  if (wide) {
    const xl = ex0 + bandL * 0.17
    const xr = ex1 - bandR * 0.17
    defs.push(
      // Em pé, perto da borda esquerda da tela, ondulando de cima até a altura da caixa.
      { id: 'edge-l', layer: 'mid', width: 32, depth: 0.5, control: [[xl + 10, tv.y - 40], [xl - 14, tv.y + tv.h * 0.35], [xl + 18, tv.y + tv.h * 0.75], [xl - 6, trayTop + 30]], fade: [0.14, 0.18], tilt: { x: 0, y: 14 } },
      // Em pé na borda direita, que desce e se enrola para dentro.
      { id: 'edge-r', layer: 'mid', width: 32, depth: 0.5, control: [[xr - 8, tv.y + 6], [xr + 16, tv.y + tv.h * 0.4], [xr - 12, tv.y + tv.h * 0.8], [xr - 52, tv.y + tv.h * 1.04], [xr - 96, tv.y + tv.h * 0.98]], fade: [0.14, 0.18], tilt: { x: 0, y: -16 } },
      // Diagonal distante que vem de fora da tela e some atrás da TV.
      { id: 'rise', layer: 'far', width: 24, depth: 0.18, control: [[ex0 - 30, trayTop + 40], [ex0 + bandL * 0.5, tvMid + tv.h * 0.3], [L - 30, tvMid + tv.h * 0.06], [L + 70, tvMid - tv.h * 0.06]], fade: [0.06, 0.05], tilt: { x: 10, y: -8 } },
      // Bem longe, saindo de trás da TV e indo até a borda direita da tela, no alto.
      { id: 'sky', layer: 'far', width: 22, depth: 0.08, control: [[R - tv.w * 0.2, tv.y + 26], [R - tv.w * 0.02, tv.y - 12], [R + bandR * 0.45, tv.y - 34], [ex1 + 30, tv.y - 18]], fade: [0.08, 0.06], tilt: { x: -12, y: 0 } },
      // Deitada e ondulada, do lado do leitor até sair pela direita.
      { id: 'drift', layer: 'far', width: 24, depth: 0.2, control: [[deckR + 70, deck.y + deck.h * 0.6], [deckR + (ex1 - deckR) * 0.45, deck.y + deck.h * 0.1], [ex1 + 30, deck.y + deck.h * 0.4]], fade: [0.16, 0.05], tilt: { x: 16, y: 0 } },
      // Bem longe, atrás das pontas da caixa de disquetes, saindo pelas duas bordas.
      { id: 'under-l', layer: 'far', width: 20, depth: 0.06, control: [[ex0 - 30, trayMid + 10], [ex0 + (trayL + 90 - ex0) * 0.5, trayMid - 14], [trayL + 90, trayMid + 6]], fade: [0.04, 0.2], tilt: { x: 0, y: 0 } },
      { id: 'under-r', layer: 'far', width: 20, depth: 0.06, control: [[trayR - 90, trayMid - 4], [trayR + (ex1 - trayR) * 0.5, trayMid + 14], [ex1 + 30, trayMid - 8]], fade: [0.2, 0.04], tilt: { x: 0, y: 0 } },
    )
    // Os dois mais perto, na frente de tudo, nos cantos de baixo da tela (meio para fora dela).
    if (trayL - ex0 > 120) defs.push({ id: 'near-l', layer: 'near', width: 40, depth: 1, control: [[ex0 - 20, H + 40], [ex0 + Math.min(bandL, trayL - ex0) * 0.42, H * 0.8], [ex0 + Math.min(bandL, trayL - ex0) * 0.3, H * 0.6]], fade: [0.05, 0.2], tilt: { x: 0, y: 12 } })
    if (ex1 - trayR > 120) defs.push({ id: 'near-r', layer: 'near', width: 40, depth: 1, control: [[Math.max(trayR + 30, ex1 - (ex1 - trayR) * 0.5), H + 40], [ex1 - (ex1 - trayR) * 0.2, H * 0.78], [ex1 + 24, H * 0.62]], fade: [0.08, 0.05], tilt: { x: 6, y: -14 } })
  } else if (mid) {
    const gap = (tv.y + tv.h + deck.y) / 2
    if (bandL >= 120) {
      // Margens largas o bastante: uma fita em pé perto de cada borda da tela.
      const xl = ex0 + bandL * 0.28
      const xr = ex1 - bandR * 0.28
      defs.push(
        { id: 'edge-l', layer: 'mid', width: 28, depth: 0.5, control: [[xl + 8, tv.y - 30], [xl - 10, tv.y + tv.h * 0.4], [xl + 12, tv.y + tv.h * 0.8], [xl - 4, tv.y + tv.h * 1.1]], fade: [0.14, 0.18], tilt: { x: 0, y: 14 } },
        { id: 'edge-r', layer: 'mid', width: 28, depth: 0.5, control: [[xr - 6, tv.y + 6], [xr + 10, tv.y + tv.h * 0.5], [xr - 8, tv.y + tv.h * 1.0]], fade: [0.14, 0.18], tilt: { x: 0, y: -14 } },
      )
    } else {
      // Margens estreitas: a fita passa entre a TV e o leitor, de borda a borda, por trás do cabo.
      defs.push({ id: 'between', layer: 'mid', width: 28, depth: 0.45, control: [[ex0 - 20, gap + 12], [W * 0.3, gap - 8], [W * 0.68, gap + 8], [ex1 + 20, gap - 6]], fade: [0.05, 0.05], tilt: { x: 14, y: 0 } })
    }
    defs.push(
      { id: 'sky', layer: 'far', width: 22, depth: 0.08, control: [[R - tv.w * 0.2, tv.y + 22], [R - tv.w * 0.02, tv.y - 12], [ex1 + 30, tv.y - 26]], fade: [0.08, 0.05], tilt: { x: -10, y: 0 } },
      { id: 'under', layer: 'far', width: 20, depth: 0.06, control: [[ex0 - 30, trayMid + 12], [W * 0.3, trayMid - 12], [W * 0.66, trayMid + 12], [ex1 + 30, trayMid - 10]], fade: [0.04, 0.04], tilt: { x: 0, y: 0 } },
    )
    if (ex1 - deckR > 110) defs.push({ id: 'near-r', layer: 'near', width: 36, depth: 1, control: [[deckR + 30, deck.y + deck.h * 1.25], [deckR + (ex1 - deckR) * 0.55, deck.y + deck.h * 0.3], [ex1 + 24, deck.y - 30]], fade: [0.12, 0.05], tilt: { x: 6, y: -12 } })
  } else {
    // Celular: a TV ocupa a largura toda. Uma fita passa entre a TV e o leitor (por trás do
    // cabo), outra bem longe atrás dos disquetes, uma espia da borda direita por trás da TV
    // e um fragmento perto, embaixo, saindo pela borda esquerda.
    const gap = (tv.y + tv.h + deck.y) / 2
    defs.push(
      { id: 'between', layer: 'mid', width: 26, depth: 0.45, control: [[ex0 - 20, gap + 10], [W * 0.3, gap - 8], [W * 0.68, gap + 8], [ex1 + 20, gap - 6]], fade: [0.05, 0.05], tilt: { x: 14, y: 0 } },
      { id: 'under', layer: 'far', width: 20, depth: 0.06, control: [[ex0 - 30, trayMid + 10], [W * 0.36, trayMid - 10], [W * 0.7, trayMid + 10], [ex1 + 30, trayMid - 8]], fade: [0.04, 0.04], tilt: { x: 0, y: 0 } },
      { id: 'peek', layer: 'far', width: 22, depth: 0.15, control: [[ex1 - 4, tv.y - 40], [ex1 - 16, tv.y + tv.h * 0.35], [ex1 - 2, tv.y + tv.h * 0.8]], fade: [0.12, 0.1], tilt: { x: 0, y: -10 } },
      { id: 'near-b', layer: 'near', width: 34, depth: 1, control: [[ex0 - 24, H + 64], [W * 0.3, H + 22], [W * 0.62, H + 40]], fade: [0.05, 0.2], tilt: { x: 12, y: 0 } },
    )
  }

  // Nenhuma fita sobre o texto: o que encostar num título ou parágrafo desce até passar dele.
  const obstacles = props.avoid ? [...(stageEl!.parentElement?.querySelectorAll(props.avoid) ?? [])].map((el) => textBox(el, base)).filter((b): b is Box => !!b) : []
  return defs.map((def, i) => {
    let control = def.control
    for (const o of obstacles) {
      const b = boundsOf(control, def.width / 2 + 14)
      const overlapX = b.x < o.x + o.w && b.x + b.w > o.x
      const overlapY = b.y < o.y + o.h && b.y + b.h > o.y
      if (overlapX && overlapY) {
        const dy = o.y + o.h - b.y
        control = control.map(([x, y]) => [x, y + dy] as Pt)
      }
    }
    return { ...def, control, drift: driftOf(i, def.depth) }
  })
}

function build(defs: StripDef[]): Strip[] {
  const lines = defs.map((def) => centerline(def.control, 6))
  const geometry = defs.map((def, i) => {
    const offset = uprightOffset(lines[i]!)
    return { offset, ...frameGeometry(def.width, offset) }
  })
  const counts = lines.map((line, i) => Math.max(1, Math.floor(line.length / geometry[i]!.period)))
  // Lembranças espalhadas pela cena inteira: nenhuma fita repete desenho enquanto houver outro.
  const dealt = dealMemories(counts, seeded(2024))
  return defs.map((def, i) => {
    const line = lines[i]!
    const { offset, window, period } = geometry[i]!
    const first = (line.length - (counts[i]! - 1) * period) / 2
    const rand = seeded(53 + i * 29)
    // Cada quadro enquadra a sua lembrança do seu jeito: um pouco mais perto, um pouco de lado.
    const frames: FilmFrame[] = frameAnchors(line, period, first)
      .slice(0, counts[i])
      .map((a, k) => ({
        x: a.x,
        y: a.y,
        angle: a.angle,
        memory: dealt[i]![k]!,
        exposure: +(0.78 + rand() * 0.2).toFixed(3),
        ox: +((rand() - 0.5) * 0.34).toFixed(3),
        oy: +((rand() - 0.5) * 0.3).toFixed(3),
        zoom: +(1.12 + rand() * 0.4).toFixed(3),
      }))
    // Risco do projetor: traços longos e falhas curtas, diferentes em cada fita.
    const scratch = Array.from({ length: 6 }, (_, k) => (k % 2 ? 6 + rand() * 40 : 30 + rand() * 160).toFixed(0)).join(' ')
    const burn: [number, number] = rand() > 0.5 ? [0.55, 0.22] : [0.22, 0.5]
    const p0 = line.points[0]!
    const p1 = line.points[line.points.length - 1]!
    const stops: Array<[number, number]> = []
    if (def.fade[0] > 0) stops.push([0, 0], [def.fade[0], 1])
    else stops.push([0, 1])
    if (def.fade[1] > 0) stops.push([1 - def.fade[1], 1], [1, 0])
    else stops.push([1, 1])
    return {
      id: def.id,
      layer: def.layer,
      width: def.width,
      depth: def.depth,
      d: pathOf(line.points),
      period,
      window,
      offset,
      frames,
      gradient: { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], stops },
      // Folga: meia largura e a maior onda do chicote.
      box: boundsOf(line.points, def.width / 2 + 30),
      drift: def.drift,
      tilt: def.tilt,
      burn,
      scratch,
      line,
      first,
    }
  })
}

function layout() {
  if (!stageEl) return
  const r = stageEl.getBoundingClientRect()
  const list = build(compose())
  strips.value = list
  nodes.clear()
  const tv = boxOf(tvEl)
  if (tv) light.value = { x: tv.x + tv.w / 2, y: tv.y + tv.h * 0.45, r: Math.max(r.width, 600) * 0.75 }
  // Uma onda em curso continua do ponto onde está, com a geometria nova.
  if (impulses.length) {
    plans = list.map((s) => planFor(s, slotPoint))
    void nextTick(() => paint(performance.now()))
  }
}

/* ------------------------------------------------------------------ */
/* Chicote                                                             */
/* ------------------------------------------------------------------ */

/** Instantes (performance.now) das inserções ainda em curso: as ondas se somam. */
let impulses: number[] = []
let raf = 0
/** O chicote redesenha as fitas a ~30 quadros por segundo: suave para a onda, metade do trabalho. */
const WHIP_FRAME = 1000 / 30
let lastPaint = 0

interface Plan {
  delay: number
  amplitude: number
  fromEnd: boolean
  /** Até quando (s desde o impulso) o balanço desta fita ainda aparece. */
  end: number
}

/** A onda chega primeiro nas fitas perto da fenda, mais forte; nas de longe, depois e mais fraca. */
function planFor(s: Strip, slot: Pt): Plan {
  const pts = s.line.points
  const a = pts[0]!
  const b = pts[pts.length - 1]!
  const da = Math.hypot(a[0] - slot[0], a[1] - slot[1])
  const db = Math.hypot(b[0] - slot[0], b[1] - slot[1])
  const dist = Math.min(da, db)
  const strength = Math.min(1, Math.max(0.3, 1 - dist / 1500))
  const delay = 0.04 + dist / 1600
  const amplitude = 15 * strength * (0.5 + s.depth * 0.6) * (s.width / 36)
  return { delay, amplitude, fromEnd: db < da, end: delay + s.line.length / WHIP.speed + whipSettle(amplitude) }
}

let plans: Plan[] = []
let slotPoint: Pt = [0, 0]

/** Os elementos de cada fita (a linha central e os quadros), guardados para não procurar a cada quadro. */
const nodes = new Map<string, { line: SVGPathElement | null; frames: SVGGElement[] }>()
/** Fitas fora do repouso (a onda passando por elas). */
const moving = new Set<string>()

function nodesOf(s: Strip) {
  let found = nodes.get(s.id)
  if (!found) {
    const el = behind.value?.parentElement?.querySelector(`[data-strip="${s.id}"]`)
    if (!el) return null
    found = {
      line: el.querySelector<SVGPathElement>(`#${CSS.escape(`${uid}-c-${s.id}`)}`),
      frames: [...el.querySelectorAll<SVGGElement>('.frag__frame')],
    }
    nodes.set(s.id, found)
  }
  return found
}

function placeFrames(s: Strip, line: Centerline): FilmFrame[] {
  const anchors = frameAnchors(line, s.period, s.first)
  return s.frames.map((f, k) => {
    const a = anchors[k]
    return a ? { ...f, x: a.x, y: a.y, angle: a.angle } : f
  })
}

const frameTransform = (s: Strip, f: FilmFrame) => `translate(${f.x.toFixed(2)} ${f.y.toFixed(2)}) rotate(${(f.angle + s.offset).toFixed(2)})`

/** Uma fita de volta ao desenho de repouso. */
function settle(s: Strip) {
  const n = nodesOf(s)
  if (!n) return
  n.line?.setAttribute('d', s.d)
  n.frames.forEach((g, k) => {
    const f = s.frames[k]
    if (f) g.setAttribute('transform', frameTransform(s, f))
  })
}

function paint(now: number) {
  strips.value.forEach((s, i) => {
    const plan = plans[i]
    if (!plan) return
    // Só as fitas que a onda está balançando agora: as outras ficam como estão (nada a redesenhar).
    const live = impulses.some((t0) => {
      const t = (now - t0) / 1000
      return t > plan.delay && t < plan.end
    })
    if (!live) {
      if (moving.delete(s.id)) settle(s)
      return
    }
    const n = nodesOf(s)
    if (!n) return
    moving.add(s.id)
    const offset = (u: number) => {
      const from = plan.fromEnd ? 1 - u : u
      let sum = 0
      for (const t0 of impulses) sum += whipOffset(from, s.line.length, (now - t0) / 1000, plan.delay, plan.amplitude, 'free')
      return sum
    }
    const pts = displace(s.line, offset)
    n.line?.setAttribute('d', pathOf(pts))
    const moved = placeFrames(s, finish(pts))
    n.frames.forEach((g, k) => {
      const f = moved[k]
      if (f) g.setAttribute('transform', frameTransform(s, f))
    })
  })
}

function loop(now: number) {
  raf = 0
  // Ondas que já se dissiparam saem da soma.
  const longest = Math.max(0, ...plans.map((p) => p.end))
  impulses = impulses.filter((t0) => (now - t0) / 1000 < longest)
  if (!impulses.length) {
    rest()
    return
  }
  // Um quadro sim, outro não (em telas de 60 Hz): a margem de 4 ms absorve a variação do relógio.
  if (now - lastPaint >= WHIP_FRAME - 4) {
    lastPaint = now
    paint(now)
  }
  raf = requestAnimationFrame(loop)
}

/** Tudo de volta ao repouso exato. */
function rest() {
  impulses = []
  cancelAnimationFrame(raf)
  raf = 0
  for (const s of strips.value) if (moving.has(s.id)) settle(s)
  moving.clear()
}

/** O disquete assentou no leitor: a onda nasce na fenda. */
function whip() {
  if (prefersReducedMotion.value || !stageEl) return
  const base = stageEl.getBoundingClientRect()
  const slot = slotEl?.getBoundingClientRect()
  slotPoint = slot ? [slot.left - base.left + slot.width / 2, slot.top - base.top + slot.height / 2] : [base.width / 2, base.height / 2]
  plans = strips.value.map((s) => planFor(s, slotPoint))
  impulses.push(performance.now())
  if (!raf) raf = requestAnimationFrame(loop)
}

/* ------------------------------------------------------------------ */
/* A tela muda de tamanho                                              */
/* ------------------------------------------------------------------ */

/** A tela está animando: as mudanças de tamanho do palco são dela (as fitas já estão no lugar final). */
let holding = false
/** Alguma mudança de tamanho chegou durante a animação (vale conferir no fim). */
let missed = false
let glideToken = 0

/**
 * A tela da TV vai crescer ou encolher com animação (quem chama já deixou a altura final no
 * layout e ainda não começou a animar). As fitas se recompõem agora, já para o tamanho
 * final, e cada uma desliza do lugar antigo até o novo no mesmo tempo e na mesma curva da
 * tela: só um deslocamento, sem redesenhar a fita a cada quadro. Até a animação acabar
 * (quem chama avisa pela função devolvida), as mudanças de tamanho do palco são ignoradas.
 */
function glide(duration: number, easing: string): () => void {
  if (!stageEl) return () => undefined
  const token = ++glideToken
  const before = new Map(strips.value.map((s) => [s.id, s.box]))
  layout()
  if (prefersReducedMotion.value) return () => undefined
  holding = true
  missed = false
  const release = () => {
    // Uma animação nova (a tela mudou de novo no meio) assume daqui.
    if (token !== glideToken) return
    holding = false
    if (missed) schedule()
  }
  const after = strips.value
  void nextTick(() => {
    const root = behind.value?.parentElement
    if (!root) return
    for (const s of after) {
      const old = before.get(s.id)
      if (!old) continue
      const dx = old.x + old.w / 2 - (s.box.x + s.box.w / 2)
      const dy = old.y + old.h / 2 - (s.box.y + s.box.h / 2)
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue
      const el = root.querySelector<SVGSVGElement>(`[data-strip="${s.id}"]`)
      if (!el) continue
      // A inclinação de cada fita fica no transform: o deslize vai antes dela.
      const tilt = getComputedStyle(el).transform
      const resting = tilt === 'none' ? '' : tilt
      el.animate([{ transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) ${resting}` }, { transform: resting || 'none' }], { duration, easing })
    }
  })
  return release
}

defineExpose({ whip, layout, glide })

let observer: ResizeObserver | null = null
let pending = 0
const schedule = () => {
  cancelAnimationFrame(pending)
  // Durante a animação da tela as fitas já estão no lugar final: recompõe só no fim, por garantia.
  if (holding) {
    missed = true
    return
  }
  pending = requestAnimationFrame(layout)
}

onMounted(() => {
  stageEl = behind.value?.parentElement ?? null
  if (!stageEl) return
  tvEl = stageEl.querySelector('.monitor')
  deckEl = stageEl.querySelector('.console')
  trayEl = stageEl.querySelector('.tray')
  slotEl = stageEl.querySelector('.console__slot')
  layout()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(schedule)
    observer.observe(stageEl)
  }
  // As fitas vão até as bordas da tela: se só a janela muda (o palco tem largura máxima), recompõe.
  window.addEventListener('resize', schedule)
  void document.fonts?.ready.then(schedule)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', schedule)
  cancelAnimationFrame(pending)
  rest()
})
</script>

<template>
  <div ref="behind" class="film film--behind" aria-hidden="true">
    <!-- O que todos os fragmentos usam: as lembranças, a luz da TV, a luz dos quadros e a granulação. -->
    <svg class="film__defs" width="0" height="0" focusable="false">
      <defs>
        <g v-for="m in MEMORIES" :id="`${uid}-mem-${m.id}`" :key="m.id">
          <template v-for="(shape, k) in m.shapes" :key="k">
            <path v-if="shape.w" :d="shape.d" fill="none" stroke="currentColor" :stroke-width="shape.w" stroke-linecap="round" stroke-linejoin="round" />
            <path v-else :d="shape.d" fill="currentColor" fill-rule="evenodd" />
          </template>
        </g>
        <radialGradient :id="`${uid}-light`" gradientUnits="userSpaceOnUse" :cx="light.x" :cy="light.y" :r="light.r">
          <stop offset="0" stop-color="#fff0d6" stop-opacity="0.9" />
          <stop offset="0.45" stop-color="#ffe6c4" stop-opacity="0.42" />
          <stop offset="1" stop-color="#cfd2ff" stop-opacity="0.16" />
        </radialGradient>
        <!-- A luz atravessando o filme: pêssego claro no centro, rosa antigo nas bordas (tons pastéis). -->
        <radialGradient :id="`${uid}-window`" cx="0.5" cy="0.45" r="0.78">
          <stop offset="0" stop-color="#f7dac6" />
          <stop offset="0.55" stop-color="#e9b5a5" />
          <stop offset="1" stop-color="#b6858b" />
        </radialGradient>
        <pattern :id="`${uid}-grain`" patternUnits="userSpaceOnUse" width="24" height="24">
          <circle v-for="(g, k) in GRAIN" :key="k" :cx="g.x" :cy="g.y" :r="g.r" :fill="g.fill" :fill-opacity="g.a" />
        </pattern>
      </defs>
    </svg>
    <div class="film__layer film__layer--far" data-depth="0.12">
      <FilmStrip v-for="s in byLayer.far" :key="s.id" :strip="s" :uid="uid" />
    </div>
    <div class="film__layer film__layer--mid" data-depth="0.05">
      <FilmStrip v-for="s in byLayer.mid" :key="s.id" :strip="s" :uid="uid" />
    </div>
  </div>
  <div ref="ahead" class="film film--ahead" aria-hidden="true">
    <div class="film__layer film__layer--near" data-depth="-0.05">
      <FilmStrip v-for="s in byLayer.near" :key="s.id" :strip="s" :uid="uid" />
    </div>
  </div>
</template>

<style scoped>
.film {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.film--behind {
  z-index: 0;
}

/* Na frente dos aparelhos e da caixa (só os fragmentos dos cantos, longe dos botões). */
.film--ahead {
  z-index: 2;
}

.film__defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

.film__layer {
  position: absolute;
  inset: 0;
}

/*
 * Profundidade e discrição: as fitas acompanham o cenário, sem disputar com a TV e os
 * disquetes. A transparência vale para cada fragmento (não para a camada inteira), assim
 * o navegador não precisa compor a camada à parte a cada quadro da deriva.
 */
.film__layer--far {
  --frag-opacity: 0.28;
}

.film__layer--mid {
  --frag-opacity: 0.46;
}

.film__layer--near {
  --frag-opacity: 0.55;
}
</style>
