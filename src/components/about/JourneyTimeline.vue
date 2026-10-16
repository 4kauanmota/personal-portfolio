<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { timeline, timelineOrigin, type Lane, type TimelineEntry } from '../../content/about'
import { logoOf } from '../../composables/companies'
import { prefersReducedMotion } from '../../composables/motion'
import { formatDate, t, tx, useI18n } from '../../i18n'
import { clusterJourney, columnsThatFit, displayColumns, spanTracks, toIso, toMonths, type JourneyCluster } from '../../lib/journey'
import { paragraphs } from '../../lib/text'
import StarHalo from '../atmosphere/StarHalo.vue'

/**
 * Trajetória com distribuição dinâmica.
 *
 * As experiências se agrupam em trechos (o que se sobrepõe no tempo) e cada trecho
 * se divide pelo número de coisas acontecendo juntas: uma só fica centralizada,
 * duas dividem a largura ao meio, três ou mais dividem igualmente. Se não couber
 * na tela, as colunas diminuem; no celular os cards ficam um embaixo do outro, mas
 * fios paralelos na margem continuam mostrando o que aconteceu ao mesmo tempo.
 *
 * Dentro de um trecho, a altura segue o tempo: cada experiência ganha um trilho do
 * início ao fim (lib/journey: spanTracks), com o fio forte acompanhando a duração.
 * A caixa de texto mantém o tamanho natural e anda pelo trilho conforme a rolagem
 * (position: sticky): numa experiência longa, como a formação, ela desce ao longo
 * do fio, acompanhando o tempo, e para no fim do período. O fio continua além da
 * caixa; um intervalo entre duas experiências da mesma coluna aparece pontilhado.
 *
 * Um fio principal sai do "primeiro código", se abre em ramos em cada trecho,
 * volta a se juntar e termina no "agora", numa auréola de estrelas.
 * Trecho forte = algo acontecendo; pontilhado = intervalo. Nada fica solto.
 */
const { locale } = useI18n()

const root = ref<HTMLElement | null>(null)
const originEl = ref<HTMLElement | null>(null)
const nowEl = ref<HTMLElement | null>(null)
const cardEls = ref<HTMLElement[]>([])

const months = (value?: string) => toMonths(value)
const today = new Date()
const NOW = today.getFullYear() * 12 + today.getMonth()

const byId = new Map(timeline.map((e) => [e.id, e]))
const clusters = computed<JourneyCluster[]>(() => clusterJourney(timeline.map((e) => ({ id: e.id, start: months(e.start), end: months(e.end) })), NOW))
/** Ordem de leitura: trecho a trecho, por início. */
const ordered = computed<TimelineEntry[]>(() => clusters.value.flatMap((c) => c.ids.map((id) => byId.get(id) as TimelineEntry)))

function period(entry: TimelineEntry): string {
  void locale.value
  if (!entry.start) return t('about.ongoing')
  const start = formatDate(toIso(entry.start))
  if (!entry.end) return t('about.since', { date: start })
  return t('about.range', { start, end: formatDate(toIso(entry.end)) })
}

/** Para leitores de tela: com quem cada experiência aconteceu ao mesmo tempo. */
function together(entry: TimelineEntry): string {
  void locale.value
  const s = months(entry.start) ?? NOW
  const e = months(entry.end) ?? NOW + 1
  const cluster = clusters.value.find((c) => c.ids.includes(entry.id))
  const others = (cluster?.ids ?? [])
    .filter((id) => id !== entry.id)
    .map((id) => byId.get(id) as TimelineEntry)
    .filter((o) => {
      const os = months(o.start) ?? NOW
      const oe = months(o.end) ?? NOW + 1
      return os < e && s < oe
    })
  return others.length ? t('about.together', { list: others.map((o) => `${tx(o.title)}${o.place ? ` (${o.place})` : ''}`).join('; ') }) : ''
}

/* ------------------------------------------------------------------ */
/* Medidas                                                             */
/* ------------------------------------------------------------------ */

const MIN_COL = 15 * 16
const GAP = 28
const SINGLE_MAX = 36 * 16
const INSET = 26
const SPLIT = 124
const MERGE = 112
/** Altura mínima de cada mês dentro de um trecho (o tempo também ocupa espaço). */
const MONTH = 10
/** Espaço entre cards empilhados na mesma coluna. */
const STACK = 28

interface Box {
  left: number
  top: number
  width: number
  /** Comprimento do trilho (a duração na linha do tempo); a caixa de texto fica com a altura natural. */
  height?: number
}
interface Thread {
  d: string
  kind: 'spine' | 'branch' | 'active' | 'gap' | 'merge' | 'quiet'
  lane?: Lane
}

const width = ref(0)
const height = ref(0)
const narrow = ref(false)
const ready = ref(false)
const boxes = ref<Record<string, Box>>({})
const originBox = ref<Box>({ left: 0, top: 0, width: 0 })
const nowBox = ref<Box>({ left: 0, top: 0, width: 0 })
const threads = ref<Thread[]>([])
const nodes = ref<Array<{ x: number; y: number; lane: Lane }>>([])
const originHub = ref({ x: 0, y: 0 })

const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const my = (y1 + y2) / 2
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${x1.toFixed(1)} ${my.toFixed(1)}, ${x2.toFixed(1)} ${my.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`
}
/** Fio vertical com uma ondulação leve, como linha de verdade (nunca uma régua). */
const line = (x: number, y1: number, y2: number) => {
  const len = y2 - y1
  if (len < 24) return `M ${x.toFixed(1)} ${y1.toFixed(1)} L ${x.toFixed(1)} ${y2.toFixed(1)}`
  const steps = Math.max(1, Math.round(len / 96))
  const step = len / steps
  let d = `M ${x.toFixed(1)} ${y1.toFixed(1)}`
  for (let k = 0; k < steps; k++) {
    const a = (k % 2 ? -1 : 1) * 2.4
    const y = y1 + k * step
    d += ` C ${(x + a).toFixed(1)} ${(y + step / 3).toFixed(1)}, ${(x - a).toFixed(1)} ${(y + (2 * step) / 3).toFixed(1)}, ${x.toFixed(1)} ${(y + step).toFixed(1)}`
  }
  return d
}

async function layout() {
  const el = root.value
  if (!el) return
  const w = el.clientWidth
  if (!w) return
  const fit = columnsThatFit(w, MIN_COL, GAP)
  const isNarrow = fit < 2
  narrow.value = isNarrow
  width.value = w
  const maxCols = Math.max(...clusters.value.map((c) => c.columns), 1)
  const gutter = 10
  const narrowLeft = gutter + (maxCols - 1) * 11 + 24

  // 1) colunas e larguras de cada trecho (as alturas dependem da largura).
  const plan = clusters.value.map((cluster) => {
    if (isNarrow) return { cluster, count: 1, of: Object.fromEntries(cluster.ids.map((id) => [id, 0])) as Record<string, number>, colW: w - narrowLeft, colX: () => narrowLeft - INSET }
    const { count, of } = displayColumns(cluster, fit)
    const colW = count === 1 ? Math.min(w, SINGLE_MAX) : (w - GAP * (count - 1)) / count
    const colX = (c: number) => (count === 1 ? (w - colW) / 2 : c * (colW + GAP))
    return { cluster, count, of, colW, colX }
  })

  const next: Record<string, Box> = {}
  for (const p of plan) {
    for (const id of p.cluster.ids) {
      const c = p.of[id] ?? 0
      next[id] = { left: p.colX(c) + INSET, top: 0, width: p.colW - INSET }
    }
  }
  const originW = isNarrow ? w - narrowLeft : Math.min(22 * 16, w)
  originBox.value = { left: isNarrow ? narrowLeft : (w - originW) / 2, top: 0, width: originW }
  boxes.value = next
  await nextTick()

  // Altura natural da caixa de texto (nunca a do trilho).
  const heightOf = (id: string) => cardEls.value.find((c) => c.dataset.id === id)?.querySelector<HTMLElement>('.journey__box')?.offsetHeight ?? 120
  const originH = originEl.value?.offsetHeight ?? 80
  const nowH = nowEl.value?.offsetHeight ?? 120

  // 2) posições verticais e fios.
  const spineX = isNarrow ? gutter : w / 2
  const out: Thread[] = []
  const dots: typeof nodes.value = []
  let cursor = originH + (isNarrow ? 18 : 22)
  originHub.value = { x: spineX, y: originH + 6 }
  let spineFrom = originH + 6
  let prevEnd: number | null = null

  for (const p of plan) {
    const { cluster, count, of, colX } = p
    const threadX = (c: number) => (isNarrow ? gutter + c * 11 : colX(c) + 8)
    const clusterTop = cursor + (isNarrow ? 26 : SPLIT)
    const splitY = clusterTop - (isNarrow ? 16 : SPLIT * 0.78)
    // Fio principal até o trecho: pontilhado se houve intervalo desde o trecho anterior.
    const quiet = prevEnd !== null && cluster.start > prevEnd
    out.push({ d: line(spineX, spineFrom, splitY), kind: quiet ? 'quiet' : 'spine' })

    // Colunas de fios: no celular, uma por coluna original do trecho (fios paralelos).
    const threadCols = isNarrow ? cluster.columns : count
    const colOf = (id: string) => (isNarrow ? (cluster.column[id] ?? 0) : (of[id] ?? 0))

    const tops: Record<string, number> = {}
    const heights: Record<string, number> = {}
    let narrowCursor = clusterTop
    let spreadBottom = clusterTop
    if (isNarrow) {
      for (const id of cluster.ids) {
        tops[id] = narrowCursor
        heights[id] = heightOf(id)
        narrowCursor = narrowCursor + heights[id] + 22
        ;(next[id] as Box).top = Math.round(tops[id])
      }
    } else {
      // Trilhos pelo tempo: o comprimento segue a duração; a caixa só precisa caber.
      const startOf = (id: string) => months(byId.get(id)?.start) ?? cluster.start
      const endOf = (id: string) => Math.max(months(byId.get(id)?.end) ?? cluster.end, startOf(id) + 1)
      const { tracks, bottom } = spanTracks(
        cluster.ids.map((id) => ({ id, start: startOf(id), end: endOf(id), height: heightOf(id) })),
        { top: clusterTop, month: MONTH, minRow: 18, stack: STACK },
      )
      for (const id of cluster.ids) {
        const track = tracks[id] as { top: number; length: number }
        tops[id] = track.top
        heights[id] = track.length
        const box = next[id] as Box
        box.top = Math.round(track.top)
        box.height = Math.round(track.length)
      }
      spreadBottom = bottom
    }
    const clusterBottom = isNarrow ? narrowCursor - 22 : spreadBottom
    const mergeY = clusterBottom + (isNarrow ? 26 : MERGE)
    // Onde cada coluna começa a curva de volta ao fio principal.
    const bendY = isNarrow ? mergeY - 12 : clusterBottom + 14

    // Ramos: do fio principal para cada coluna; fio da coluna; e de volta ao principal.
    for (let c = 0; c < threadCols; c++) {
      const ids = cluster.ids.filter((id) => colOf(id) === c)
      if (!ids.length) continue
      const x = threadX(c)
      const firstTop = (tops[ids[0] as string] as number) + 14
      const firstLane = (byId.get(ids[0] as string) as TimelineEntry).lane
      out.push({ d: curve(spineX, splitY, x, firstTop), kind: 'branch', lane: firstLane })
      ids.forEach((id, i) => {
        const entry = byId.get(id) as TimelineEntry
        const top = (tops[id] as number) + 14
        const nextId = ids[i + 1]
        const bottom = nextId ? (tops[nextId] as number) + 14 : bendY
        dots.push({ x, y: top, lane: entry.lane })
        const end = months(entry.end) ?? NOW + 1
        const nextStart = nextId ? (months(byId.get(nextId)?.start) ?? NOW) : cluster.end
        // Enquanto acontece, o fio é forte; se a coluna fica parada até o próximo, pontilhado.
        const cardBottom = top - 14 + (heights[id] as number)
        if (end >= nextStart) {
          out.push({ d: line(x, top, bottom), kind: 'active', lane: entry.lane })
        } else {
          const split = Math.min(bottom, Math.max(top + 20, cardBottom))
          out.push({ d: line(x, top, split), kind: 'active', lane: entry.lane })
          if (bottom > split + 2) out.push({ d: line(x, split, bottom), kind: 'gap', lane: entry.lane })
        }
      })
      const lastLane = (byId.get(ids[ids.length - 1] as string) as TimelineEntry).lane
      out.push({ d: curve(x, bendY, spineX, mergeY), kind: 'merge', lane: lastLane })
    }

    spineFrom = mergeY
    prevEnd = cluster.end
    cursor = mergeY
  }

  // Fim: o fio principal chega ao "agora".
  const nowTop = cursor + (isNarrow ? 18 : 30)
  const nowW = isNarrow ? 132 : 16 * 16
  nowBox.value = { left: isNarrow ? 0 : (w - nowW) / 2, top: nowTop, width: nowW }
  // O fio termina no centro da auréola (atrás da estrela do meio).
  const haloX = isNarrow ? nowW / 2 : w / 2
  const haloY = nowTop + 40
  out.push({ d: haloX === spineX ? line(spineX, spineFrom, haloY) : curve(spineX, spineFrom, haloX, haloY), kind: 'spine' })
  height.value = Math.ceil(nowTop + nowH + 8)
  boxes.value = { ...next }
  threads.value = out
  nodes.value = dots
  ready.value = true
  updateDraw()
}

/* ------------------------------------------------------------------ */
/* Desenho conforme a rolagem                                          */
/* ------------------------------------------------------------------ */

const drawn = ref(1)
let frame = 0
let visible = false

function updateDraw() {
  frame = 0
  const el = root.value
  if (!el) return
  if (prefersReducedMotion.value) {
    drawn.value = 1
    return
  }
  const rect = el.getBoundingClientRect()
  const front = window.innerHeight * 0.8 - rect.top
  drawn.value = Math.max(0, Math.min(1, front / Math.max(1, rect.height)))
}

const onScroll = () => {
  if (visible && !frame) frame = requestAnimationFrame(updateDraw)
}

const drawY = computed(() => drawn.value * height.value)
const isLit = (top: number) => drawY.value >= top + 8 || drawn.value >= 0.999

let resizeObserver: ResizeObserver | null = null
let intersection: IntersectionObserver | null = null
let pending = 0
const scheduleLayout = () => {
  cancelAnimationFrame(pending)
  pending = requestAnimationFrame(() => void layout())
}

onMounted(() => {
  void layout()
  if (typeof ResizeObserver !== 'undefined' && root.value) {
    resizeObserver = new ResizeObserver(scheduleLayout)
    resizeObserver.observe(root.value)
  }
  intersection = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting)
    onScroll()
  })
  if (root.value) intersection.observe(root.value)
  window.addEventListener('scroll', onScroll, { passive: true })
  void document.fonts?.ready.then(scheduleLayout)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  intersection?.disconnect()
  window.removeEventListener('scroll', onScroll)
  cancelAnimationFrame(frame)
  cancelAnimationFrame(pending)
})

watch(locale, () => nextTick(scheduleLayout))
watch(prefersReducedMotion, updateDraw)

const laneClass = (lane?: Lane) => (lane ? `lane-${lane}` : '')
const boxStyle = (box?: Box) =>
  box ? { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: box.height ? `${box.height}px` : undefined } : undefined
</script>

<template>
  <div ref="root" class="journey" :class="{ 'is-ready': ready, 'is-narrow': narrow }" :style="{ height: height ? `${height}px` : undefined }">
    <svg v-if="width" class="journey__threads" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" aria-hidden="true">
      <defs>
        <linearGradient id="journey-gold" x1="0" y1="0" x2="0" :y2="height" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#e2a93a" />
          <stop offset="0.6" stop-color="#c98a1c" />
          <stop offset="1" stop-color="#f2c45a" />
        </linearGradient>
        <clipPath id="journey-draw">
          <rect x="-20" y="-20" :width="width + 40" :height="drawY + 20" />
        </clipPath>
      </defs>
      <g clip-path="url(#journey-draw)">
        <path v-for="(p, i) in threads" :key="i" :d="p.d" class="thread" :class="[`thread--${p.kind}`, laneClass(p.lane)]" />
        <circle v-for="(n, i) in nodes" :key="`n${i}`" :cx="n.x" :cy="n.y" r="4.5" class="node" :class="laneClass(n.lane)" />
        <circle :cx="originHub.x" :cy="originHub.y" r="5" class="node node--origin" />
      </g>
    </svg>

    <div ref="originEl" class="journey__origin" :class="{ 'is-lit': isLit(0) }" :style="{ left: `${originBox.left}px`, top: `${originBox.top}px`, width: `${originBox.width}px` }">
      <p class="journey__period">{{ t('about.origin') }}</p>
      <h4 class="journey__title">{{ tx(timelineOrigin.title) }}</h4>
      <p class="journey__text">{{ tx(timelineOrigin.text) }}</p>
    </div>

    <ol role="list" class="journey__list">
      <li
        v-for="entry in ordered"
        :key="entry.id"
        ref="cardEls"
        :data-id="entry.id"
        class="journey__card"
        :class="[laneClass(entry.lane), { 'is-lit': isLit(boxes[entry.id]?.top ?? 0), 'is-ongoing': !entry.end, 'has-logo': logoOf(entry.company) }]"
        :style="boxStyle(boxes[entry.id])"
      >
        <!-- O trilho (li) tem o comprimento da experiência; a caixa tem o tamanho do texto e anda por ele. -->
        <div class="journey__box">
          <span v-if="!narrow" class="journey__bead" :class="laneClass(entry.lane)" aria-hidden="true" />
          <span v-if="logoOf(entry.company)" class="journey__logo"><img :src="logoOf(entry.company)!" alt="" loading="lazy" decoding="async" /></span>
          <p class="journey__meta">
            <span class="journey__lane" :class="laneClass(entry.lane)">{{ t(`about.lanes.${entry.lane}`) }}</span>
            <span class="journey__period">{{ period(entry) }}</span>
          </p>
          <h4 class="journey__title">{{ tx(entry.title) }}</h4>
          <p v-if="entry.place || entry.mode" class="journey__place">
            <span v-if="entry.place">{{ entry.place }}</span>
            <span v-if="entry.mode">{{ tx(entry.mode) }}</span>
          </p>
          <template v-if="entry.text">
            <p v-for="(paragraph, k) in paragraphs(tx(entry.text))" :key="k" class="journey__text">{{ paragraph }}</p>
          </template>
          <p v-if="together(entry)" class="sr-only">{{ together(entry) }}</p>
        </div>
      </li>
    </ol>

    <div ref="nowEl" class="journey__now" :class="{ 'is-lit': drawn >= 0.97 }" :style="{ left: `${nowBox.left}px`, top: `${nowBox.top}px`, width: `${nowBox.width}px` }">
      <StarHalo :lit="drawn >= 0.97" :label="t('about.nowHalo')" />
      <p class="journey__now-label">{{ t('about.now') }}</p>
    </div>
  </div>
</template>

<style scoped>
.journey {
  /* Cores das trilhas na paleta do pôr do sol (nada de roxo no meio do laranja). */
  --study: #b4506c;
  --work: #8a461c;
  --games: #c98a1c;
  position: relative;
  min-height: 20rem;
  opacity: 0;
  transition: opacity 0.6s var(--ease-dream);
}

.journey.is-ready {
  opacity: 1;
}

.journey__threads {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}

.thread {
  fill: none;
  stroke-linecap: round;
}

.thread--spine {
  stroke: rgb(94 52 30 / 0.5);
  stroke-width: 1.6;
}

.thread--quiet {
  stroke: rgb(94 52 30 / 0.45);
  stroke-width: 1.4;
  stroke-dasharray: 2 6;
}

.thread--active {
  stroke-width: 2.6;
}

.thread--branch,
.thread--merge {
  stroke-width: 1.6;
  opacity: 0.75;
}

.thread--gap {
  stroke-width: 1.4;
  stroke-dasharray: 2 6;
  opacity: 0.55;
}

.thread.lane-study {
  stroke: var(--study);
}

.thread.lane-work {
  stroke: var(--work);
}

.thread.lane-games {
  stroke: url(#journey-gold);
  filter: drop-shadow(0 0 3px rgb(255 240 220 / 0.9));
}

.node {
  fill: #fff7ea;
  stroke-width: 2;
}

.node.lane-study {
  stroke: var(--study);
}

.node.lane-work {
  stroke: var(--work);
}

.node.lane-games {
  stroke: var(--games);
}

.node--origin {
  fill: #fffaf0;
  stroke: var(--fg-2);
  stroke-width: 1.5;
  filter: drop-shadow(0 0 6px rgb(255 248 230 / 1));
}

/* Cards */
.journey__card,
.journey__origin,
.journey__now {
  position: absolute;
  opacity: 0.001;
  translate: 0 10px;
  transition:
    opacity 0.8s var(--ease-dream),
    translate 0.9s var(--ease-surface);
}

.journey__card.is-lit,
.journey__origin.is-lit,
.journey__now.is-lit {
  opacity: 1;
  translate: 0 0;
}

/* O trilho: invisível, só delimita por onde a caixa pode andar. */
.journey__card {
  margin: 0;
}

/*
 * A caixa: tamanho natural. Gruda logo abaixo do cabeçalho enquanto o trilho passa pela
 * tela e para no fim dele, então desce ao longo do fio acompanhando a duração.
 */
.journey__box {
  position: sticky;
  top: calc(var(--header-h) + 1.25rem);
  display: grid;
  align-content: start;
  gap: 0.2rem;
  padding: 0.85rem 1.05rem 1rem;
  border-radius: 12px;
  background: rgb(255 246 236 / 0.8);
  box-shadow:
    0 0 0 1px rgb(255 250 240 / 0.7),
    0 16px 34px -24px rgb(98 40 20 / 0.45);
}

.journey__card.is-ongoing .journey__box {
  box-shadow:
    0 0 0 1px rgb(255 250 240 / 0.9),
    0 0 26px rgb(255 236 206 / 0.6),
    0 16px 34px -24px rgb(98 40 20 / 0.45);
}

/* Uma conta de luz no fio, presa à caixa: mostra em que ponto da duração ela está. */
.journey__bead {
  position: absolute;
  left: -23px;
  top: 9px;
  width: 10px;
  height: 10px;
  border: 2px solid var(--work);
  border-radius: 50%;
  background: #fff7ea;
  box-shadow: 0 0 8px rgb(255 240 214 / 0.9);
}

.journey__bead.lane-study {
  border-color: var(--study);
}

.journey__bead.lane-games {
  border-color: var(--games);
}

/*
 * A logo da empresa num selo claro: lê bem sobre qualquer cor e nunca domina o card.
 * A altura da logo é fixa e a largura segue o formato do arquivo, então o selo abraça
 * a logo, seja ela quadrada ou comprida. Os cantos da logo são de leve arredondados,
 * no mesmo desenho dos cantos do selo.
 */
.journey__logo {
  position: absolute;
  top: 0.7rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 2.5rem;
  max-width: 5rem;
  padding: 0.3rem;
  border-radius: 11px;
  background: rgb(255 252 246 / 0.92);
  box-shadow: 0 0 0 1px rgb(255 255 255 / 0.9), 0 4px 10px -6px rgb(98 40 20 / 0.45);
}

.journey__logo img {
  display: block;
  height: 100%;
  width: auto;
  max-width: 4.4rem;
  object-fit: contain;
  border-radius: 6px;
}

.journey__card.has-logo .journey__meta,
.journey__card.has-logo .journey__title {
  padding-right: 5.4rem;
}

.journey__origin {
  display: grid;
  justify-items: center;
  gap: 0.15rem;
  text-align: center;
}

.journey__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.1rem 0.8rem;
}

.journey__lane {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--fg-2);
}

.journey__lane::before {
  content: '';
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  margin-right: 0.4rem;
  border-radius: 50%;
  vertical-align: 0.02em;
}

.journey__lane.lane-study::before {
  background: var(--study);
}

.journey__lane.lane-work::before {
  background: var(--work);
}

.journey__lane.lane-games::before {
  background: var(--games);
  box-shadow: 0 0 6px rgb(255 214 120 / 0.9);
}

.journey__period {
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--fg-2);
}

.journey__title {
  font-size: 1.2rem;
  font-weight: 450;
  line-height: 1.25;
}

.journey__place {
  display: flex;
  flex-wrap: wrap;
  gap: 0 0.75rem;
  font-size: var(--text-sm);
  color: var(--fg-2);
}

.journey__place span:first-child {
  font-weight: 500;
  color: var(--fg);
}

.journey__text {
  margin-top: 0.2rem;
  text-wrap: pretty;
  font-family: var(--font-prose);
  font-size: 0.98rem;
  line-height: 1.5;
  color: var(--fg-2);
}

/* Um texto em mais de um parágrafo respira entre eles, sem virar outro bloco. */
.journey__text + .journey__text {
  margin-top: 0.55rem;
}

.journey__list {
  margin: 0;
}

/* Agora: a auréola de estrelas fecha a trajetória. */
.journey__now {
  display: grid;
  justify-items: center;
  gap: 0;
  text-align: center;
}

.journey__now-label {
  margin-top: -0.6rem;
  font-size: var(--text-lg);
  font-weight: 300;
  letter-spacing: 0.02em;
}

.journey.is-narrow .journey__origin {
  justify-items: start;
  text-align: left;
}

@media (prefers-reduced-motion: reduce) {
  .journey__card,
  .journey__origin,
  .journey__now {
    opacity: 1;
    translate: none;
  }
}
</style>
