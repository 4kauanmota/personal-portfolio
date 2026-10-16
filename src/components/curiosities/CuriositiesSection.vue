<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { curiosities, type Curiosity, type DiskColor } from '../../content/curiosities'
import { prefersReducedMotion } from '../../composables/motion'
import { useScene } from '../../composables/scene'
import { playSound } from '../../composables/sound'
import { t, tx } from '../../i18n'
import NightSky from '../atmosphere/NightSky.vue'
import FilmScene from './FilmScene.vue'
import FloppyDisk from './FloppyDisk.vue'

/**
 * Curiosidades: uma TV antiga ligada por um cabo a um leitor de disquetes logo abaixo,
 * e uma caixa de disquetes que flutuam de leve.
 *
 * A inserção segue a física da cena:
 *   1. o disquete sai da caixa e sobe pela FRENTE do leitor;
 *   2. chega diante da fenda, deita (perspectiva) e entra pela fenda: a parte que já
 *      entrou some exatamente na linha da fenda, por trás do lábio da frente;
 *   3. ele assenta (clique), a fenda acende com a cor do disquete, a TV liga com
 *      um glitch e ondas de luz se espalham a partir da tela; os fragmentos de
 *      filme soltos no ar sentem a onda passar, mais os de perto, menos os de longe.
 * Ejetar faz o caminho de volta. Trocar ejeta o atual antes de o novo entrar,
 * então a tela nunca mostra duas lembranças. Cliques durante uma troca ficam na fila (vale o último).
 * Sem disquete, a TV fica "ligada esperando": flutua devagar e os círculos da tela respiram.
 * Quando o texto muda de tamanho, a tela cresce ou encolhe com animação (nada pula).
 * Com "reduzir movimento", a troca é imediata e nada flutua.
 */
const showDrafts = import.meta.env.DEV
const items = computed(() => curiosities.filter((c) => showDrafts || !c.draft))
const PALETTE: DiskColor[] = ['lilac', 'yellow', 'mint', 'peach', 'blue', 'pink']
const GLOW: Record<DiskColor, string> = {
  lilac: '#c9b2ef',
  pink: '#f4b6c8',
  blue: '#a9d3f3',
  mint: '#a8e3c4',
  yellow: '#f6e08e',
  peach: '#f9c29b',
}
const colorOf = (item: Curiosity, index: number) => item.color ?? PALETTE[index % PALETTE.length] ?? 'lilac'
const tiltOf = (index: number) => [-6, 4, -3, 5, -5, 3, -4, 6][index % 8] ?? 0
/** Cada disquete flutua no seu ritmo: altura, giro e velocidade um pouco diferentes. */
const floatOf = (index: number) => ({
  '--tilt': `${tiltOf(index)}deg`,
  '--i': index,
  '--fy': `${-3 - (index % 3) * 1.6}px`,
  '--fx': `${(index % 2 ? 1 : -1) * (1 + (index % 4) * 0.6)}px`,
  '--fr': `${(index % 2 ? -1 : 1) * (0.8 + (index % 3) * 0.5)}deg`,
  '--fd': `${5.2 + ((index * 7) % 5) * 0.75}s`,
  '--fdelay': `${-index * 1.7}s`,
})

const root = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const mouth = ref<HTMLElement | null>(null)
const mouthDiskEl = ref<HTMLElement | null>(null)
const tray = ref<HTMLElement | null>(null)
const screenEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
/** Os fragmentos de filme de lembranças, soltos no ar: sentem a onda quando um disquete entra. */
const film = ref<InstanceType<typeof FilmScene> | null>(null)
/** Glitch forte no instante em que a imagem aparece. */
const glitching = ref(false)
useScene(root)

/** O disquete que está no leitor (depois de entrar por completo). */
const insertedId = ref<string | null>(null)
/** O que a tela mostra. */
const shown = ref<Curiosity | null>(null)
const reading = ref(false)
/** Disquetes fora da caixa (voando ou no leitor): o lugar deles fica vazio. */
const out = reactive(new Set<string>())
/** Disquete na boca da fenda (entrando ou saindo). */
const mouthDisk = ref<Curiosity | null>(null)
const busy = ref(false)
let pending: string | null = null

const insertedColor = computed(() => {
  const id = insertedId.value
  const item = id ? itemById(id) : null
  return item ? GLOW[colorOf(item, indexOf(item.id))] : null
})

interface Flight {
  key: number
  item: Curiosity
  color: DiskColor
  style: Record<string, string>
}
const flights = ref<Flight[]>([])
let flightKey = 0

/** Ondas de luz e brilhos que saem da TV quando um disquete assenta. */
const waves = ref<Array<{ key: number; delay: number; color: string }>>([])
const glints = ref<Array<{ key: number; x: number; y: number; dx: number; dy: number; size: number; delay: number }>>([])
let effectKey = 0

const itemById = (id: string) => items.value.find((c) => c.id === id) ?? null
const indexOf = (id: string) => items.value.findIndex((c) => c.id === id)
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------------------------ */
/* Geometria                                                           */
/* ------------------------------------------------------------------ */

/** Inclinação do disquete ao entrar na fenda (ele "deita" para dentro). */
const TILT = 68
const PERSPECTIVE = 520

function stageBox() {
  return stage.value?.getBoundingClientRect() ?? null
}

/** O disquete da caixa: canto superior central e largura (sem a inclinação da caixa). */
function traySpot(id: string) {
  const base = stageBox()
  const face = tray.value?.querySelector<HTMLElement>(`[data-disk="${id}"] .tray__face`)
  const r = face?.getBoundingClientRect()
  if (!base || !r || !face) return null
  const w = face.offsetWidth
  // Centro do retângulo (a inclinação da caixa gira em torno do centro): o topo central fica w/2 acima.
  return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 - w / 2, w }
}

/** A linha da fenda (onde o disquete some) e o tamanho do disquete ao entrar. */
function slotSpot() {
  const base = stageBox()
  const m = mouth.value?.getBoundingClientRect()
  if (!base || !m) return null
  const w = mouth.value!.offsetWidth / 1.5
  return { x: m.left - base.left + m.width / 2, y: m.top - base.top, w }
}

const pose = (x: number, y: number, tilt: number, spin: number, scale: number) =>
  `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) perspective(${PERSPECTIVE}px) rotateX(${tilt}deg) rotate(${spin}deg) scale(${scale.toFixed(3)})`

/**
 * Voo entre a caixa e a fenda. O disquete voador fica posicionado na boca da fenda
 * (topo central na linha da fenda); os quadros-chave levam ele da caixa até lá,
 * passando pela frente do leitor, e no fim ele já está deitado como o da fenda.
 */
async function fly(item: Curiosity, direction: 'in' | 'out', id: string, onLand?: () => void) {
  const from = traySpot(id)
  const slot = slotSpot()
  if (!from || !slot) return
  const key = ++flightKey
  flights.value.push({
    key,
    item,
    color: colorOf(item, indexOf(id)),
    style: { left: `${slot.x - slot.w / 2}px`, top: `${slot.y}px`, width: `${slot.w}px`, height: `${slot.w}px` },
  })
  await nextTick()
  const el = stage.value?.querySelector<HTMLElement>(`[data-flight="${key}"]`)
  if (el) {
    const dx = from.x - slot.x
    const dy = from.y - slot.y
    const s0 = from.w / slot.w
    const spin = tiltOf(indexOf(id))
    // Sobe pela frente (um pouco maior: mais perto de quem olha), alinha embaixo da fenda,
    // já encostado na frente do leitor, e só então deita e encaixa na linha da fenda.
    const frames: Keyframe[] = [
      { transform: pose(dx, dy, 0, spin, s0), offset: 0 },
      { transform: pose(dx * 0.5, dy * 0.52 + slot.w * 0.2, 0, spin * 0.3 - 3, 1.14), offset: 0.4 },
      { transform: pose(dx * 0.04, slot.w * 0.62, 12, 0, 1.08), offset: 0.72 },
      { transform: pose(0, slot.w * 0.18, 46, 0, 1.03), offset: 0.88 },
      { transform: pose(0, 0, TILT, 0, 1), offset: 1 },
    ]
    const backwards = [...frames].reverse().map((f) => ({ ...f, offset: 1 - (f.offset as number) }))
    const animation = el.animate(direction === 'in' ? frames : backwards, {
      duration: direction === 'in' ? 820 : 720,
      easing: direction === 'in' ? 'cubic-bezier(0.4, 0, 0.25, 1)' : 'cubic-bezier(0.35, 0, 0.3, 1)',
      fill: 'forwards',
    })
    await animation.finished.catch(() => undefined)
  }
  onLand?.()
  await nextTick()
  flights.value = flights.value.filter((f) => f.key !== key)
}

/** O disquete na boca da fenda: entra (some na linha da fenda) ou sai. */
async function slide(direction: 'in' | 'out') {
  await nextTick()
  const el = mouthDiskEl.value
  if (!el) return
  const outside = `perspective(${PERSPECTIVE}px) rotateX(${TILT}deg) translateY(0%)`
  const inside = `perspective(${PERSPECTIVE}px) rotateX(${TILT}deg) translateY(-102%)`
  const animation = el.animate(direction === 'in' ? [{ transform: outside }, { transform: inside }] : [{ transform: inside }, { transform: outside }], {
    duration: direction === 'in' ? 380 : 440,
    easing: direction === 'in' ? 'cubic-bezier(0.55, 0, 0.8, 0.35)' : 'cubic-bezier(0.15, 0.85, 0.3, 1.15)',
    fill: 'forwards',
  })
  await animation.finished.catch(() => undefined)
}

/* ------------------------------------------------------------------ */
/* Tela e efeitos                                                      */
/* ------------------------------------------------------------------ */

async function screenOff() {
  if (!shown.value) return
  shown.value = null
  await wait(320)
}

async function screenOn(item: Curiosity) {
  reading.value = true
  await wait(prefersReducedMotion.value ? 0 : 480)
  reading.value = false
  shown.value = item
  if (!prefersReducedMotion.value) {
    glitching.value = false
    await nextTick()
    glitching.value = true
    window.setTimeout(() => (glitching.value = false), 900)
  }
}

/** Ondas de rádio: três anéis de luz na cor do disquete, saindo de trás da tela. */
function broadcast(color: string) {
  if (prefersReducedMotion.value) return
  const base = ++effectKey * 10
  waves.value = [0, 1, 2].map((i) => ({ key: base + i, delay: i * 300, color }))
  // Brilhos de quatro pontas nas bordas da TV.
  const spots = [
    [6, 8],
    [94, 6],
    [-2, 52],
    [102, 46],
    [12, 96],
    [90, 98],
  ] as const
  glints.value = spots.map(([x, y], i) => ({
    key: base + i,
    x,
    y,
    dx: (x - 50) * 0.5,
    dy: (y - 50) * 0.45,
    size: 14 + ((i * 7) % 12),
    delay: 120 + i * 70,
  }))
  window.setTimeout(() => {
    if (waves.value[0]?.key === base) {
      waves.value = []
      glints.value = []
    }
  }, 2800)
}

/* ------------------------------------------------------------------ */
/* Altura da tela                                                      */
/* ------------------------------------------------------------------ */

/*
 * A tela acompanha o tamanho do texto, mas nunca de uma vez: quando o conteúdo
 * muda de altura, a tela anima até a nova altura (e o leitor, o cabo e a caixa
 * descem ou sobem junto, devagar).
 */
let resize: ResizeObserver | null = null
let screenAnim: Animation | null = null
function fitScreen() {
  const screen = screenEl.value
  const content = contentEl.value
  if (!screen || !content) return
  const minH = parseFloat(getComputedStyle(screen).minHeight) || 0
  const target = Math.max(minH, content.offsetHeight)
  const current = screen.getBoundingClientRect().height
  if (!screen.style.height || prefersReducedMotion.value) {
    screen.style.height = `${target}px`
    return
  }
  if (Math.abs(target - current) < 1) return
  // No meio de uma troca a tela só cresce; encolher fica para quando o novo texto chegar.
  if (busy.value && target < current) return
  screenAnim?.cancel()
  screen.style.height = `${target}px`
  const duration = Math.min(900, 380 + Math.abs(target - current) * 1.6)
  const easing = 'cubic-bezier(0.33, 0.7, 0.25, 1)'
  // O layout já tem a altura final: as fitas se recompõem uma vez e deslizam junto com a tela.
  const release = film.value?.glide(duration, easing)
  screenAnim = screen.animate([{ height: `${current}px` }, { height: `${target}px` }], { duration, easing })
  // Libera dois quadros depois do fim: o último aviso de tamanho da tela ainda é da animação.
  void screenAnim.finished
    .catch(() => undefined)
    .then(() => requestAnimationFrame(() => requestAnimationFrame(() => release?.())))
}
onMounted(() => {
  if (typeof ResizeObserver === 'undefined' || !contentEl.value) return
  resize = new ResizeObserver(() => fitScreen())
  resize.observe(contentEl.value)
  fitScreen()
})
onBeforeUnmount(() => {
  resize?.disconnect()
  screenAnim?.cancel()
})

/* ------------------------------------------------------------------ */
/* Inserir, ejetar, trocar                                             */
/* ------------------------------------------------------------------ */

/**
 * Tira o disquete atual: a tela desliga, ele sai da fenda e volta voando para o lugar dele.
 * Retorna a promessa do voo de volta (embrulhada, para a troca não precisar esperar o pouso).
 */
async function ejectCurrent(): Promise<{ back: Promise<void> }> {
  const id = insertedId.value
  const item = id ? itemById(id) : null
  if (!id || !item) return { back: Promise.resolve() }
  await screenOff()
  insertedId.value = null
  playSound('eject')
  mouthDisk.value = item
  await slide('out')
  mouthDisk.value = null
  return { back: fly(item, 'out', id, () => out.delete(id)) }
}

async function insert(id: string) {
  const item = itemById(id)
  if (!item) return
  playSound('pick')
  out.add(id)
  await fly(item, 'in', id, () => (mouthDisk.value = item))
  playSound('insert')
  await slide('in')
  // O disquete assentou: o impulso nasce na fenda e corre pelas fitas como um chicote.
  film.value?.whip()
  mouthDisk.value = null
  insertedId.value = id
  playSound('waves', 60)
  broadcast(GLOW[colorOf(item, indexOf(id))])
  await screenOn(item)
}

async function run(next: string | 'eject') {
  busy.value = true
  try {
    if (prefersReducedMotion.value) {
      shown.value = null
      if (insertedId.value) out.delete(insertedId.value)
      insertedId.value = null
      if (next === 'eject') playSound('eject')
      else {
        out.add(next)
        insertedId.value = next
        shown.value = itemById(next)
        playSound('insert')
      }
    } else if (next === 'eject') {
      const { back } = await ejectCurrent()
      await back
    } else if (insertedId.value) {
      // Troca: o atual sai e volta para a caixa; o novo só sobe depois que a fenda esvaziou.
      const { back } = await ejectCurrent()
      await back
      await insert(next)
    } else {
      await insert(next)
    }
  } finally {
    busy.value = false
    await nextTick()
    fitScreen()
  }
  if (pending) {
    const queued = pending
    pending = null
    if (queued !== insertedId.value) choose(queued)
  }
}

function choose(id: string) {
  if (busy.value) {
    pending = id
    return
  }
  void run(id === insertedId.value ? 'eject' : id)
}

function eject() {
  if (busy.value) {
    pending = null
    return
  }
  if (insertedId.value) void run('eject')
}

/** Setas esquerda/direita andam entre os disquetes. */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
  const buttons = [...(tray.value?.querySelectorAll<HTMLButtonElement>('.tray__disk') ?? [])]
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  if (index < 0) return
  event.preventDefault()
  buttons[(index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
}

function imageSrc(src: string) {
  return /^(https?:|data:)/.test(src) ? src : `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`
}

const status = computed(() =>
  shown.value ? `${t('curiosities.inserted', { topic: tx(shown.value.topic) })}. ${tx(shown.value.answer)}. ${tx(shown.value.note)}` : '',
)

</script>

<template>
  <section id="curiosidades" ref="root" class="night theme-night" aria-labelledby="curiosities-title">
    <NightSky />
    <div class="wrap night__inner">
      <header class="night__head">
        <h2 id="curiosities-title" v-reveal class="display night__title">{{ t('curiosities.title') }}</h2>
        <p class="night__lead">{{ t('curiosities.lead') }}</p>
      </header>

      <div ref="stage" class="stage" :class="{ 'is-busy': busy }">
        <!-- Fragmentos de filme de lembranças, soltos no ar (atrás dos aparelhos e, nos cantos, na frente). -->
        <FilmScene ref="film" avoid=".night__head > *" />

        <div class="set" :class="{ 'is-on': shown || reading, 'is-waiting': !insertedId && !busy }">
          <div class="set__glow" aria-hidden="true" />

          <!-- Ondas de rádio: anéis de luz que saem de trás da tela. -->
          <div class="set__waves" aria-hidden="true">
            <span v-for="w in waves" :key="w.key" class="wave" :style="{ '--wave': w.color, animationDelay: `${w.delay}ms` }" />
          </div>

          <div class="monitor" :class="{ 'is-on': shown || reading, 'is-glitching': glitching }">
            <div ref="screenEl" class="monitor__screen">
              <!-- Os círculos da tela: respiram e se abrem devagar, em compasso. -->
              <div class="monitor__noise-wrap" aria-hidden="true"><div class="monitor__noise" /></div>
              <div class="monitor__rings" aria-hidden="true">
                <span v-for="n in 3" :key="n" class="ring" :style="{ animationDelay: `${(n - 1) * -2.4}s` }" />
              </div>
              <div class="monitor__sweep" aria-hidden="true" />
              <div class="monitor__scan" aria-hidden="true" />
              <div class="monitor__glitch" aria-hidden="true" />
              <div ref="contentEl" class="monitor__content">
                <Transition name="crt" mode="out-in">
                  <div v-if="shown" :key="shown.id" class="memory">
                    <p class="memory__topic">{{ tx(shown.topic) }}</p>
                    <p class="memory__answer">{{ tx(shown.answer) }}</p>
                    <p class="memory__note">{{ tx(shown.note) }}</p>
                    <img v-if="shown.image" class="memory__image" :src="imageSrc(shown.image.src)" :alt="tx(shown.image.alt)" loading="lazy" />
                    <p v-if="shown.draft" class="memory__draft">{{ t('curiosities.draft') }}</p>
                  </div>
                  <p v-else-if="reading" key="reading" class="monitor__idle">{{ t('curiosities.reading') }}</p>
                  <div v-else key="idle" class="monitor__wait">
                    <svg class="monitor__hint" viewBox="0 0 64 44" aria-hidden="true">
                      <path class="hint__slot" d="M14 34h36" />
                      <g class="hint__disk">
                        <rect x="22" y="4" width="20" height="20" rx="2.5" />
                        <rect x="27" y="4" width="10" height="7" rx="1" class="hint__metal" />
                      </g>
                    </svg>
                    <p class="monitor__idle monitor__idle--blink">{{ t('curiosities.idle') }}</p>
                  </div>
                </Transition>
              </div>
            </div>
          </div>

          <!-- O cabo: sai de trás da TV e entra no leitor, com uma curva solta que balança. -->
          <div class="set__link" aria-hidden="true">
            <svg class="cable" viewBox="0 0 400 100" preserveAspectRatio="none">
              <path class="cable__shadow" d="M332 0 C 338 34, 398 30, 376 62 C 356 90, 306 70, 300 100">
                <animate attributeName="d" dur="7s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
                  values="M332 0 C 338 34, 398 30, 376 62 C 356 90, 306 70, 300 100;M332 0 C 342 30, 392 40, 370 66 C 350 88, 304 76, 300 100;M332 0 C 338 34, 398 30, 376 62 C 356 90, 306 70, 300 100" />
              </path>
              <path class="cable__wire" d="M332 0 C 338 34, 398 30, 376 62 C 356 90, 306 70, 300 100">
                <animate attributeName="d" dur="7s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
                  values="M332 0 C 338 34, 398 30, 376 62 C 356 90, 306 70, 300 100;M332 0 C 342 30, 392 40, 370 66 C 350 88, 304 76, 300 100;M332 0 C 338 34, 398 30, 376 62 C 356 90, 306 70, 300 100" />
              </path>
            </svg>
            <span class="plug plug--tv" />
            <span class="plug plug--console" />
          </div>

          <div class="console">
            <div class="console__top" aria-hidden="true" />
            <div class="console__front">
              <span class="console__led" :class="{ 'is-busy': busy || reading, 'is-on': insertedId }" aria-hidden="true" />
              <div class="console__slot" :style="{ '--slot-glow': insertedColor ?? 'transparent' }" aria-hidden="true">
                <span class="console__opening" />
                <!-- A boca da fenda: o que estiver acima da linha da fenda já está dentro do leitor. -->
                <div ref="mouth" class="console__mouth">
                  <div v-if="mouthDisk" ref="mouthDiskEl" class="mouth__disk">
                    <FloppyDisk :label="tx(mouthDisk.topic)" :color="colorOf(mouthDisk, indexOf(mouthDisk.id))" :draft="mouthDisk.draft" />
                  </div>
                </div>
                <span class="console__lip" />
              </div>
              <span class="console__grille" aria-hidden="true" />
              <button type="button" class="console__eject" :disabled="!insertedId && !busy" @click="eject">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15h14L12 6.5Z M5 18.5h14" /></svg>
                <span class="sr-only">{{ t('curiosities.eject') }}</span>
              </button>
            </div>
          </div>

          <div class="set__glints" aria-hidden="true">
            <svg
              v-for="g in glints"
              :key="g.key"
              class="glint"
              viewBox="-50 -50 100 100"
              :style="{ left: `${g.x}%`, top: `${g.y}%`, width: `${g.size}px`, '--dx': `${g.dx}px`, '--dy': `${g.dy}px`, animationDelay: `${g.delay}ms` }"
            >
              <path d="M0 -50 C 5 -9, 9 -5, 34 0 C 9 5, 5 9, 0 50 C -5 9, -9 5, -34 0 C -9 -5, -5 -9, 0 -50 Z" />
            </svg>
          </div>
        </div>

        <ul v-if="items.length" ref="tray" role="list" class="tray" :aria-label="t('curiosities.boxLabel')" @keydown="onKeydown">
          <li v-for="(item, i) in items" :key="item.id" :data-disk="item.id" class="tray__slot" :style="floatOf(i)">
            <button
              type="button"
              class="tray__disk"
              :class="{ 'is-out': out.has(item.id), 'is-draft': item.draft }"
              :aria-pressed="insertedId === item.id"
              @click="choose(item.id)"
            >
              <span class="tray__face"><FloppyDisk :label="tx(item.topic)" :color="colorOf(item, i)" :draft="item.draft" /></span>
            </button>
          </li>
        </ul>
        <p v-else class="monitor__idle">{{ t('curiosities.empty') }}</p>

        <!-- O disquete em voo passa pela frente de tudo: ele vem da caixa, que está na frente do leitor. -->
        <div class="stage__flights" aria-hidden="true">
          <div v-for="f in flights" :key="f.key" :data-flight="f.key" class="flight" :style="f.style">
            <FloppyDisk :label="tx(f.item.topic)" :color="f.color" :draft="f.item.draft" />
          </div>
        </div>
      </div>
      <p class="sr-only" aria-live="polite">{{ status }}</p>
    </div>
  </section>
</template>

<style scoped>
.night {
  position: relative;
  padding-top: clamp(4rem, 2rem + 5vw, 7rem);
  padding-bottom: clamp(5rem, 3rem + 5vw, 8rem);
}

.night__inner {
  display: grid;
  gap: clamp(2rem, 1.5rem + 2vw, 3.5rem);
}

.night__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 24rem);
  align-items: end;
  gap: 1rem 3rem;
}

.night__title {
  transition:
    opacity 1.2s var(--ease-dream),
    filter 1.4s var(--ease-dream),
    letter-spacing 1.6s var(--ease-surface);
}

.night__title[data-reveal]:not([data-revealed]) {
  opacity: 0;
  filter: blur(10px);
  letter-spacing: 0.06em;
}

.night__lead {
  font-family: var(--font-prose);
  font-size: var(--text-prose);
  line-height: 1.55;
  color: var(--fg-2);
}

/* ---------------- Palco ---------------- */
.stage {
  --disk-size: 6.5rem;
  --tv-w: min(100%, 36rem);
  position: relative;
  display: grid;
  justify-items: center;
  padding-top: clamp(2.5rem, 1rem + 4vw, 5rem);
}

/* TV e leitor: um conjunto só, flutuando devagar no céu da noite (nada o prende). */
.set {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  width: var(--tv-w);
}

@media (prefers-reduced-motion: no-preference) {
  .set {
    animation: set-float 11s var(--ease-in-out) infinite alternate;
  }

  /* Durante uma inserção, o conjunto fica parado: o disquete encontra a fenda no lugar certo. */
  .stage.is-busy .set {
    animation-play-state: paused;
  }
}

@keyframes set-float {
  from {
    translate: 0 -2px;
  }

  to {
    translate: 0 3px;
  }
}


/* Luz da tela no ar à volta (respira enquanto espera). */
.set__glow {
  position: absolute;
  z-index: -1;
  left: 50%;
  top: 40%;
  width: 150%;
  aspect-ratio: 1.6;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(214 220 255 / 0.13), rgb(214 220 255 / 0.04) 55%, transparent);
  pointer-events: none;
}

.set.is-waiting .set__glow {
  animation: glow-breathe 4.5s var(--ease-in-out) infinite alternate;
}

.set.is-on .set__glow {
  background: radial-gradient(closest-side, rgb(255 244 214 / 0.18), rgb(255 244 214 / 0.05) 55%, transparent);
}

/* Ondas de rádio */
.set__waves {
  position: absolute;
  z-index: -1;
  left: 50%;
  top: 37%;
  width: 92%;
  aspect-ratio: 1;
  translate: -50% -50%;
  pointer-events: none;
}

.wave {
  position: absolute;
  /* Um pouco maior que o anel: o brilho de fora cabe dentro do próprio desenho. */
  inset: -6%;
  border-radius: 50%;
  /*
   * O anel e o brilho dos dois lados num gradiente só, sem borda nem sombra desfocada:
   * a onda cresce e some sem o navegador precisar refazer um desfoque a cada quadro.
   * O anel fica a 89% do raio (onde ficava a borda) e o brilho imita o desfoque de antes.
   */
  background: radial-gradient(
    closest-side,
    transparent 68.9%,
    color-mix(in srgb, var(--wave) 20%, transparent) 80%,
    color-mix(in srgb, var(--wave) 36%, transparent) 85.5%,
    color-mix(in srgb, var(--wave) 36%, transparent) 88.3%,
    var(--wave) 88.6% 89.1%,
    color-mix(in srgb, var(--wave) 50%, transparent) 89.4%,
    color-mix(in srgb, var(--wave) 16%, transparent) 93.8%,
    color-mix(in srgb, var(--wave) 2%, transparent) 98.3%,
    transparent
  );
  opacity: 0;
  animation: wave-out 2.2s cubic-bezier(0.2, 0.6, 0.3, 1) both;
}

/* Brilhos de quatro pontas nas bordas da TV */
.set__glints {
  position: absolute;
  inset: 0 0 auto;
  height: 80%;
  z-index: 3;
  pointer-events: none;
}

.glint {
  position: absolute;
  aspect-ratio: 1;
  translate: -50% -50%;
  overflow: visible;
  opacity: 0;
  filter: drop-shadow(0 0 6px rgb(255 246 214 / 0.95));
  animation: glint-pop 1s var(--ease-dream) both;
}

.glint path {
  fill: #fff7df;
}

/* Tela */
.monitor {
  position: relative;
  width: 100%;
  padding: 1rem 1rem 1.35rem;
  border-radius: 22px;
  background: linear-gradient(180deg, #e9e2d2, #d2c7b0 70%, #bfb299);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    inset 0 -3px 0 rgb(0 0 0 / 0.12),
    0 30px 60px -20px rgb(0 0 0 / 0.7),
    0 0 0 1px rgb(0 0 0 / 0.25);
}

.monitor__screen {
  position: relative;
  min-height: 17.5rem;
  border-radius: 14px / 18px;
  background: radial-gradient(120% 90% at 50% 40%, #1c2433, #0b0f18);
  box-shadow:
    inset 0 0 0 2px rgb(0 0 0 / 0.55),
    inset 0 0 50px rgb(0 0 0 / 0.75);
  overflow: hidden;
  transition: box-shadow 0.6s var(--ease-dream);
}

.monitor.is-on .monitor__screen {
  box-shadow:
    inset 0 0 0 2px rgb(0 0 0 / 0.55),
    inset 0 0 40px rgb(0 0 0 / 0.6),
    0 0 40px rgb(255 247 222 / 0.18);
}

/* Sem sinal: um moiré colorido e lento, como TVs antigas esperando; o conjunto respira. */
.monitor__noise-wrap {
  position: absolute;
  inset: 0;
  animation: noise-breathe 7.2s var(--ease-in-out) infinite alternate;
}

.monitor__noise {
  position: absolute;
  inset: -30%;
  /*
   * Os anéis já vêm suaves e com a cor mais viva no próprio gradiente (antes um filtro de
   * desfoque e saturação fazia isso a cada quadro, enquanto o moiré se move).
   */
  background:
    repeating-radial-gradient(
      ellipse at 32% 44%,
      rgb(79 189 210 / 0.35) 0,
      rgb(79 189 210 / 0.7) 2.4px 4.2px,
      transparent 7.8px 13.6px,
      rgb(79 189 210 / 0.35) 16px
    ),
    repeating-radial-gradient(
      ellipse at 70% 58%,
      rgb(182 87 202 / 0.3) 0,
      rgb(182 87 202 / 0.6) 2.4px 5.2px,
      transparent 8.8px 16.6px,
      rgb(182 87 202 / 0.3) 19px
    ),
    radial-gradient(60% 50% at 50% 50%, rgb(90 207 83 / 0.25), transparent 70%);
  opacity: 0.2;
  animation: moire 26s ease-in-out infinite alternate;
  transition: opacity 0.9s var(--ease-dream);
}

.monitor.is-on .monitor__noise {
  opacity: 0.05;
}

/* Anéis de luz que nascem no centro da tela e se abrem devagar, no mesmo compasso. */
.monitor__rings {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  opacity: 1;
  transition: opacity 0.8s var(--ease-dream);
  pointer-events: none;
}

.monitor.is-on .monitor__rings {
  opacity: 0;
}

.ring {
  position: absolute;
  width: 34%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1px solid rgb(176 204 255 / 0.32);
  box-shadow:
    0 0 14px rgb(150 190 255 / 0.18),
    inset 0 0 14px rgb(190 150 255 / 0.12);
  opacity: 0;
  animation: ring-open 7.2s cubic-bezier(0.25, 0.4, 0.35, 1) infinite;
}

/* Uma faixa de luz que desce a tela de tempos em tempos (a TV "procurando sinal"). */
.monitor__sweep {
  position: absolute;
  inset: -20% 0 auto;
  height: 22%;
  background: linear-gradient(180deg, transparent, rgb(214 228 255 / 0.07) 45%, rgb(214 228 255 / 0.12) 50%, transparent);
  opacity: 0;
  pointer-events: none;
}

.set.is-waiting .monitor__sweep {
  animation: sweep 5.5s linear infinite;
}

.monitor__scan {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(180deg, rgb(255 255 255 / 0.035) 0 1px, transparent 1px 3px);
  pointer-events: none;
}

/*
 * Glitch ao ligar: faixas coloridas atravessando, a imagem se desloca e se separa em
 * cores por menos de um segundo. Forte, mas sem clarões grandes piscando.
 */
.monitor__glitch {
  position: absolute;
  inset: 0;
  z-index: 2;
  background:
    linear-gradient(
      180deg,
      transparent 0 16%,
      rgb(120 220 255 / 0.42) 16% 19%,
      transparent 19% 44%,
      rgb(255 92 168 / 0.36) 44% 46.5%,
      transparent 46.5% 70%,
      rgb(255 250 230 / 0.32) 70% 71.5%,
      transparent 71.5% 86%,
      rgb(150 255 200 / 0.28) 86% 88%,
      transparent 88%
    );
  mix-blend-mode: screen;
  opacity: 0;
  pointer-events: none;
}

.monitor.is-glitching .monitor__glitch {
  animation: glitch-bands 0.85s steps(1, end) both;
}

.monitor.is-glitching .monitor__content {
  animation: glitch-image 0.85s steps(1, end) both;
}

.monitor.is-glitching {
  animation: tv-jolt 0.42s cubic-bezier(0.3, 0.7, 0.3, 1);
}

.monitor__content {
  position: relative;
  display: grid;
  min-height: inherit;
  padding: clamp(1.5rem, 1rem + 2vw, 2.4rem);
  place-items: center;
  text-align: center;
}

.monitor__wait {
  display: grid;
  justify-items: center;
  gap: 0.6rem;
}

/* Pictograma: um disquete descendo até uma fenda, em laço. */
.monitor__hint {
  width: 4rem;
  height: auto;
  overflow: visible;
}

.hint__slot {
  stroke: rgb(214 220 255 / 0.55);
  stroke-width: 2.5;
  stroke-linecap: round;
}

.hint__disk rect {
  fill: none;
  stroke: rgb(214 220 255 / 0.7);
  stroke-width: 1.6;
}

.hint__disk .hint__metal {
  fill: rgb(214 220 255 / 0.35);
}

.hint__disk {
  animation: hint 2.6s var(--ease-in-out) infinite;
}

.monitor__idle {
  font-size: var(--text-sm);
  letter-spacing: 0.06em;
  color: var(--fg-2);
}

.monitor__idle--blink {
  animation: idle-blink 2.4s steps(2) infinite;
}

.memory {
  display: grid;
  justify-items: center;
  gap: 0.6rem;
  max-width: 32rem;
}

.memory__topic {
  font-family: var(--font-hand);
  font-size: 1.55rem;
  line-height: 1;
  color: var(--fg-2);
}

.memory__answer {
  font-size: clamp(1.8rem, 1.3rem + 2vw, 2.7rem);
  font-weight: 300;
  line-height: 1.1;
  color: var(--halo);
  text-shadow: 0 0 22px rgb(255 251 234 / 0.35);
  text-wrap: balance;
}

.memory__note {
  font-family: var(--font-prose);
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--fg);
  text-wrap: pretty;
}

.memory__image {
  max-height: 12rem;
  margin-top: 0.5rem;
  border-radius: 8px;
}

.memory__draft {
  font-size: var(--text-xs);
  color: var(--dawn-gold);
}

/* Liga e desliga como tubo: a imagem abre de uma linha e volta para ela. */
.crt-enter-active {
  animation: crt-on 0.55s var(--ease-surface);
}

.crt-leave-active {
  animation: crt-off 0.3s var(--ease-in-out) forwards;
}

/* ---------------- Cabo entre a TV e o leitor ---------------- */
.set__link {
  position: relative;
  width: 100%;
  height: clamp(3.25rem, 2.25rem + 3vw, 5rem);
}

.cable {
  position: absolute;
  left: 0;
  top: -0.6rem;
  width: 100%;
  height: calc(100% + 1rem);
  overflow: visible;
}

.cable path {
  fill: none;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}

.cable__shadow {
  stroke: rgb(0 0 0 / 0.35);
  stroke-width: 7;
  filter: blur(2px);
  translate: 0 4px;
}

.cable__wire {
  stroke: #232633;
  stroke-width: 3.4;
}

/* Os encaixes: o cabo entra de verdade nos dois aparelhos. */
.plug {
  position: absolute;
  width: 0.95rem;
  height: 0.7rem;
  translate: -50% 0;
  border-radius: 3px;
  background: linear-gradient(180deg, #3a3d4a, #1b1d26);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.18);
}

.plug--tv {
  left: 83%;
  top: -0.75rem;
}

.plug--console {
  left: 75%;
  bottom: -0.35rem;
}

/* ---------------- Leitor (embaixo da TV, ligado pelo cabo) ---------------- */
.console {
  position: relative;
  width: 74%;
}

/* Tampa vista um pouco de cima: dá a profundidade do aparelho. */
.console__top {
  height: 0.7rem;
  margin: 0 2.5%;
  border-radius: 6px 6px 0 0;
  background: linear-gradient(180deg, #c9bea6, #e4dccb);
  clip-path: polygon(3% 0, 97% 0, 100% 100%, 0 100%);
}

.console__front {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  height: 3.6rem;
  padding: 0 1rem;
  border-radius: 3px 3px 12px 12px;
  background: linear-gradient(180deg, #e2d9c6, #cbbfa5 60%, #b8ab90);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.5),
    inset 0 -2px 0 rgb(0 0 0 / 0.12),
    0 22px 40px -18px rgb(0 0 0 / 0.75);
}

.console__led {
  flex: none;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #4a4436;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.3);
}

.console__led.is-on {
  background: #9be38a;
  box-shadow: 0 0 8px #9be38a;
}

.console__led.is-busy {
  background: #ffb347;
  box-shadow: 0 0 10px #ffb347;
  animation: led 0.24s steps(2) infinite;
}

/* A fenda: abertura escura com lábio claro embaixo; acende com a cor do disquete inserido. */
.console__slot {
  position: relative;
  flex: none;
  width: calc(var(--disk-size) + 1.3rem);
  height: 0.9rem;
}

.console__opening {
  position: absolute;
  inset: 0.15rem 0 0.25rem;
  border-radius: 4px;
  background: linear-gradient(180deg, #07090f, #1d1f26);
  box-shadow:
    inset 0 2px 3px rgb(0 0 0 / 0.8),
    0 0 14px var(--slot-glow),
    inset 0 -1px 6px var(--slot-glow);
  transition: box-shadow 0.8s var(--ease-dream);
}

.console__lip {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 0.25rem;
  border-radius: 0 0 4px 4px;
  background: linear-gradient(180deg, rgb(255 255 255 / 0.55), rgb(255 255 255 / 0.1));
  pointer-events: none;
}

/* A boca: começa na linha da fenda e recorta tudo o que já entrou. */
.console__mouth {
  position: absolute;
  z-index: 2;
  left: 50%;
  top: 0.5rem;
  width: calc(var(--disk-size) * 1.5);
  height: calc(var(--disk-size) * 0.85);
  translate: -50% 0;
  overflow: hidden;
  pointer-events: none;
}

.mouth__disk {
  position: absolute;
  left: calc(var(--disk-size) * 0.25);
  top: 0;
  width: var(--disk-size);
  height: var(--disk-size);
  transform-origin: 50% 0;
  transform: perspective(520px) rotateX(68deg);
}

.console__grille {
  flex: 1;
  height: 1rem;
  background: repeating-linear-gradient(90deg, rgb(0 0 0 / 0.16) 0 2px, transparent 2px 6px);
  border-radius: 2px;
  opacity: 0.55;
}

.console__eject {
  flex: none;
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.2rem;
  border: 0;
  border-radius: 7px;
  background: linear-gradient(180deg, #ece5d6, #d2c7af);
  box-shadow:
    0 2px 0 rgb(0 0 0 / 0.22),
    inset 0 1px 0 rgb(255 255 255 / 0.6);
  color: #4a4334;
  transition:
    translate var(--dur-quick),
    box-shadow var(--dur-quick);
}

.console__eject svg {
  width: 1.1rem;
  height: 1.1rem;
  fill: currentColor;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linejoin: round;
}

.console__eject:active:not(:disabled) {
  translate: 0 2px;
  box-shadow: 0 0 0 rgb(0 0 0 / 0.2);
}

.console__eject:disabled {
  cursor: default;
  opacity: 0.55;
}

.console__eject:focus-visible {
  outline-color: var(--halo);
}

/* ---------------- Caixa de disquetes ---------------- */
.tray {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem 1.3rem;
  max-width: 54rem;
  margin-top: clamp(2.5rem, 2rem + 2vw, 3.5rem);
  padding: 1.25rem 1.5rem 1.6rem;
}

/* A mesa onde os disquetes estão: uma faixa de luz suave, sem borda dura. */
.tray::before {
  content: '';
  position: absolute;
  inset: 30% -6% -8%;
  z-index: -1;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(255 240 210 / 0.12), transparent);
}

.tray__slot {
  width: var(--disk-size);
}

.tray__disk {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: none;
  rotate: var(--tilt);
  transition:
    translate 0.5s var(--ease-surface),
    rotate 0.5s var(--ease-surface);
}

.tray__face {
  display: block;
  filter: drop-shadow(0 10px 12px rgb(0 0 0 / 0.45));
  transition: opacity 0.2s;
  /* Suspensos no espaço: cada um no seu ritmo. */
  animation: disk-float var(--fd, 6s) var(--ease-in-out) var(--fdelay, 0s) infinite alternate;
}

.stage.is-busy .tray__face {
  animation-play-state: paused;
}

.tray__disk:hover {
  translate: 0 -8px;
  rotate: 0deg;
}

.tray__disk:focus-visible {
  outline-color: var(--halo);
  outline-offset: 6px;
}

/* O lugar de um disquete que saiu fica marcado, como um encaixe vazio. */
.tray__disk::after {
  content: '';
  position: absolute;
  inset: 4%;
  border-radius: 8px;
  border: 1.5px dashed rgb(236 232 244 / 0.35);
  opacity: 0;
  transition: opacity 0.4s;
}

.tray__disk.is-out .tray__face {
  opacity: 0;
}

.tray__disk.is-out::after {
  opacity: 1;
}

.tray__disk.is-out:hover {
  translate: none;
}

.tray__disk.is-draft .tray__face {
  opacity: 0.6;
}

.stage__flights {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
}

.flight {
  position: absolute;
  transform-origin: 50% 0;
  filter: drop-shadow(0 12px 14px rgb(0 0 0 / 0.4));
  will-change: transform;
}

/* ---------------- Animações ---------------- */
@keyframes disk-float {
  from {
    transform: translate(0, 0) rotate(0deg);
  }
  to {
    transform: translate(var(--fx, 1px), var(--fy, -4px)) rotate(var(--fr, 1deg));
  }
}

@keyframes noise-breathe {
  from {
    scale: 1;
    opacity: 0.8;
  }
  to {
    scale: 1.08;
    opacity: 1;
  }
}

@keyframes ring-open {
  0% {
    opacity: 0;
    transform: scale(0.25);
  }
  20% {
    opacity: 0.85;
  }
  100% {
    opacity: 0;
    transform: scale(3.2);
  }
}

@keyframes glitch-bands {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  10% {
    transform: translateY(-14%);
  }
  22% {
    opacity: 0.85;
    transform: translateY(24%) scaleY(1.5);
  }
  34% {
    transform: translateY(-8%);
  }
  46% {
    opacity: 0.9;
    transform: translateY(36%) scaleY(0.7);
  }
  58% {
    opacity: 0.55;
    transform: translateY(6%);
  }
  72% {
    opacity: 0.45;
    transform: translateY(-22%);
  }
  86% {
    opacity: 0.2;
  }
  100% {
    opacity: 0;
  }
}

@keyframes glitch-image {
  0% {
    transform: translate(-7px, 0) skewX(-7deg);
    filter: drop-shadow(3px 0 0 rgb(255 70 130 / 0.85)) drop-shadow(-3px 0 0 rgb(70 220 255 / 0.85));
  }
  12% {
    transform: translate(6px, 1px);
    clip-path: inset(8% 0 52% 0);
  }
  24% {
    transform: translate(-4px, -1px) skewX(5deg);
    clip-path: inset(46% 0 18% 0);
  }
  36% {
    transform: translate(9px, 0);
    clip-path: none;
    filter: drop-shadow(4px 0 0 rgb(255 70 130 / 0.75)) drop-shadow(-4px 0 0 rgb(70 220 255 / 0.75)) brightness(1.35);
  }
  50% {
    transform: translate(-3px, 0);
    filter: drop-shadow(2px 0 0 rgb(255 70 130 / 0.6)) drop-shadow(-2px 0 0 rgb(70 220 255 / 0.6));
  }
  64% {
    transform: translate(4px, 0) skewX(-3deg);
    clip-path: inset(0 0 66% 0);
  }
  78% {
    transform: none;
    clip-path: none;
    filter: drop-shadow(1px 0 0 rgb(255 70 130 / 0.4)) drop-shadow(-1px 0 0 rgb(70 220 255 / 0.4));
  }
  100% {
    transform: none;
    clip-path: none;
    filter: none;
  }
}

@keyframes tv-jolt {
  20% {
    translate: -3px 1px;
  }
  45% {
    translate: 3px -1px;
  }
  70% {
    translate: -1px 0;
  }
}

@keyframes glow-breathe {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}

@keyframes wave-out {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  14% {
    opacity: 0.85;
  }
  100% {
    opacity: 0;
    transform: scale(2.3);
  }
}

@keyframes glint-pop {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.2) rotate(0deg);
  }
  35% {
    opacity: 1;
    transform: translate(calc(var(--dx) * 0.4), calc(var(--dy) * 0.4)) scale(1) rotate(20deg);
  }
  100% {
    opacity: 0;
    transform: translate(var(--dx), var(--dy)) scale(0.4) rotate(45deg);
  }
}

@keyframes sweep {
  0%,
  55% {
    opacity: 0;
    transform: translateY(0);
  }
  60% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
    transform: translateY(560%);
  }
}

@keyframes hint {
  0%,
  12% {
    transform: translateY(-4px);
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
  62% {
    transform: translateY(14px);
    opacity: 1;
  }
  78%,
  100% {
    transform: translateY(20px);
    opacity: 0;
  }
}

/* Só brilho (sem desfoque): enquanto a imagem é uma linha fina, um desfoque nem aparece e pesa. */
@keyframes crt-on {
  0% {
    opacity: 0;
    transform: scale(1.04, 0.02);
    filter: brightness(3);
  }
  45% {
    opacity: 1;
    transform: scale(1, 0.06);
    filter: brightness(2.2);
  }
  100% {
    opacity: 1;
    transform: scale(1, 1);
    filter: none;
  }
}

@keyframes crt-off {
  0% {
    opacity: 1;
    transform: scale(1, 1);
  }
  60% {
    opacity: 1;
    transform: scale(1.02, 0.03);
    filter: brightness(2.4);
  }
  100% {
    opacity: 0;
    transform: scale(0.1, 0.01);
    filter: brightness(3);
  }
}

@keyframes moire {
  to {
    translate: 5% -3%;
    rotate: 8deg;
  }
}

@keyframes idle-blink {
  50% {
    opacity: 0.45;
  }
}

@keyframes led {
  50% {
    opacity: 0.35;
  }
}

@media (max-width: 860px) {
  .night__head {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .stage {
    --disk-size: 5.4rem;
  }

  .console {
    width: 92%;
  }

  .console__front {
    gap: 0.6rem;
    padding: 0 0.7rem;
  }

  .tray {
    gap: 0.9rem 1rem;
    padding-inline: 0;
  }

  .monitor__screen {
    min-height: 16rem;
  }
}
</style>
