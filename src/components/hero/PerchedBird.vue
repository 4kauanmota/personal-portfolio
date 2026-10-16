<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { prefersReducedMotion } from '../../composables/motion'
import { playSound } from '../../composables/sound'
import { pointOnWire, toBox, type Wire } from '../../lib/wires'

/**
 * Um passarinho pousado no fio do meio-dia.
 *
 * Quando a página abre, ele dá uns passinhos curtos pelo fio (sempre para a frente, para
 * o lado do bico) e para. Parado, observa o céu: respira e, de vez em quando, sem hora
 * marcada, dá um pulinho discreto no lugar. Ele nunca vira de lado nem gira: os pés
 * seguem a curva do fio a cada passo, sem deslizar.
 *
 * Quando o ponteiro chega perto (ou um dedo toca), ele se assusta e voa para fora do
 * quadro, e o fio balança com a saída. Um tempo depois, volta, pousa onde estava no
 * começo e caminha de novo um pouquinho.
 * É enfeite: fica fora da navegação por teclado e dos leitores de tela. Com "reduzir
 * movimento", ele fica parado no fio.
 */
const props = defineProps<{
  wire: Wire
  /** Onde ele pousa no fio (0 = poste, 1 = saída). */
  t: number
  /** Tamanho da caixa em que o desenho dos fios é ajustado. */
  width: number
  height: number
}>()
const emit = defineEmits<{ takeoff: [] }>()

type State = 'perched' | 'flying' | 'away' | 'landing'
const state = ref<State>('perched')
const root = ref<HTMLElement | null>(null)
const bird = ref<SVGSVGElement | null>(null)
const sitting = ref<SVGGElement | null>(null)

/** Ponto atual no fio (muda devagar enquanto ele caminha) e o quanto os pés estão no ar (px). */
const at = ref(props.t)
const lift = ref(0)
const spot = computed(() => {
  const [x, y] = toBox(pointOnWire(props.wire, at.value), props.width, props.height)
  return { x, y: y - lift.value }
})

let timer = 0
let frame = 0
let flight: Animation | null = null
let hop: Animation | null = null
const random = (a: number, b: number) => a + Math.random() * (b - a)

/* ------------------------------------------------------------------ */
/* Caminhar                                                            */
/* ------------------------------------------------------------------ */

/** Uns passinhos para a frente (o lado do bico), cada um com o seu tempo, e para. */
function walk() {
  if (state.value !== 'perched' || prefersReducedMotion.value) return
  const steps = 4 + Math.floor(Math.random() * 3)
  let k = 0
  const step = () => {
    if (state.value !== 'perched') return
    if (k++ >= steps) {
      scheduleHop()
      return
    }
    const from = at.value
    const to = from + random(0.0048, 0.0066)
    const duration = random(170, 240)
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const ease = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2
      at.value = from + (to - from) * ease
      // O pé sai do fio e volta para ele: o corpo sobe um tiquinho no meio do passo.
      lift.value = Math.sin(Math.PI * p) * 1.6
      if (p < 1) frame = requestAnimationFrame(tick)
      else {
        lift.value = 0
        // Pausas desiguais entre os passos: ritmo de bicho, não de relógio.
        timer = window.setTimeout(step, random(80, 280) + (Math.random() < 0.25 ? random(300, 700) : 0))
      }
    }
    frame = requestAnimationFrame(tick)
  }
  step()
}

/* ------------------------------------------------------------------ */
/* Pulinhos                                                            */
/* ------------------------------------------------------------------ */

const HOP: Keyframe[] = [
  { transform: 'none', offset: 0 },
  { transform: 'translateY(4%) scale(1.03, 0.96)', offset: 0.14 },
  { transform: 'translateY(-15%) scale(0.98, 1.03)', offset: 0.46 },
  { transform: 'translateY(2%) scale(1.04, 0.95)', offset: 0.82 },
  { transform: 'none', offset: 1 },
]

/** De vez em quando, sem hora marcada, um pulinho (às vezes dois, bem pequenos). */
function scheduleHop() {
  window.clearTimeout(timer)
  timer = window.setTimeout(doHop, random(4500, 12500))
}

function doHop() {
  if (state.value !== 'perched' || prefersReducedMotion.value || !sitting.value) return
  // Só pula quando dá para ver (aba aberta e passarinho na tela).
  const box = root.value?.getBoundingClientRect()
  const visible = document.visibilityState === 'visible' && box && box.bottom > 0 && box.top < window.innerHeight
  if (visible) {
    const twice = Math.random() < 0.3
    hop = sitting.value.animate(HOP, { duration: twice ? 300 : random(380, 460), easing: 'ease-in-out', iterations: twice ? 2 : 1 })
  }
  scheduleHop()
}

/* ------------------------------------------------------------------ */
/* Voar e voltar                                                       */
/* ------------------------------------------------------------------ */

/** Saída: um impulso para cima e depois para a direita, acelerando, até sumir. */
const PATH = [
  { translate: '0px 0px', rotate: '0deg', offset: 0 },
  { translate: '14px -34px', rotate: '-14deg', offset: 0.18 },
  { translate: '120px -120px', rotate: '-22deg', offset: 0.5 },
  { translate: '420px -320px', rotate: '-30deg', offset: 1 },
]

function stopWalking() {
  window.clearTimeout(timer)
  cancelAnimationFrame(frame)
  hop?.cancel()
  lift.value = 0
}

function scare() {
  if (state.value !== 'perched' || prefersReducedMotion.value || !bird.value) return
  stopWalking()
  state.value = 'flying'
  emit('takeoff')
  playSound('flutter')
  flight = bird.value.animate(PATH, { duration: 1500, easing: 'cubic-bezier(0.5, 0, 0.75, 0.4)', fill: 'forwards' })
  flight.onfinish = () => {
    state.value = 'away'
    timer = window.setTimeout(comeBack, 9000 + Math.random() * 5000)
  }
}

/** Volta pelo mesmo caminho, freando, assenta no ponto do começo e caminha um pouquinho. */
function comeBack() {
  if (!bird.value) return
  at.value = props.t
  state.value = 'landing'
  flight?.cancel()
  flight = bird.value.animate([...PATH].reverse().map((k) => ({ ...k, offset: 1 - k.offset })), {
    duration: 2600,
    easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
    fill: 'forwards',
  })
  flight.onfinish = () => {
    flight?.cancel()
    flight = null
    state.value = 'perched'
    timer = window.setTimeout(walk, random(900, 1800))
  }
}

watch(
  () => props.t,
  (t) => {
    if (state.value === 'perched') at.value = t
  },
)

onMounted(() => {
  if (prefersReducedMotion.value) return
  // Chega à cena e, depois de um instante, dá os primeiros passos.
  timer = window.setTimeout(walk, random(1600, 2800))
})

onBeforeUnmount(() => {
  stopWalking()
  flight?.cancel()
})
</script>

<template>
  <span
    ref="root"
    class="perch"
    :class="`is-${state}`"
    :style="{ left: `${spot.x}px`, top: `${spot.y}px` }"
    aria-hidden="true"
    @pointerenter="scare"
    @pointerdown="scare"
  >
    <svg ref="bird" class="perch__sprite" viewBox="0 0 40 32">
      <!-- pousado: virado para o céu aberto -->
      <g ref="sitting" class="perch__sitting">
        <g class="perch__body">
          <path d="M8 17 C 9 11, 16 9, 22 11 C 27 12, 30 15, 35 20.5 C 30 19.6, 25.5 21, 21 22.2 C 15 23.6, 8.6 22.4, 8 17 Z" />
          <circle cx="10" cy="12.4" r="4.6" />
          <path d="M5.8 11.6 L1.6 12.9 L5.9 13.9 Z" />
          <circle class="perch__eye" cx="8.6" cy="11.6" r="0.9" />
        </g>
        <path class="perch__legs" d="M15.6 22.6 V 26 M19 22.4 V 26" />
      </g>
      <!-- em voo: o mesmo traço dos outros pássaros do céu -->
      <path class="perch__flying" d="M6 18 q 7 -8 14 0 q 7 -8 14 0" />
    </svg>
  </span>
</template>

<style scoped>
.perch {
  position: absolute;
  z-index: 1;
  width: 2.4rem;
  aspect-ratio: 40 / 32;
  /* Os pés (17, 26 no desenho) ficam exatamente no ponto do fio. */
  translate: -43% -81%;
  padding: 0;
  pointer-events: auto;
  cursor: default;
}

/* Área de toque maior que o desenho. */
.perch::before {
  content: '';
  position: absolute;
  inset: -0.9rem -0.9rem -0.4rem;
}

.perch.is-flying,
.perch.is-away,
.perch.is-landing {
  pointer-events: none;
}

.perch__sprite {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.perch__body path,
.perch__body circle {
  fill: rgb(66 50 28 / 0.72);
}

.perch__body .perch__eye {
  fill: rgb(255 248 224 / 0.9);
}

.perch__legs,
.perch__flying {
  fill: none;
  stroke: rgb(66 50 28 / 0.72);
  stroke-width: 1.3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.perch__flying {
  stroke-width: 1.8;
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
}

/* Pousado: os pulinhos (no script) apoiam nos pés; a respiração é quase imperceptível. */
.perch__sitting {
  transform-box: fill-box;
  transform-origin: 50% 100%;
}

.perch__body {
  transform-box: fill-box;
  transform-origin: 60% 90%;
}

@media (prefers-reduced-motion: no-preference) {
  .perch__body {
    animation: perch-breathe 2.4s ease-in-out infinite alternate;
  }
}

.perch.is-flying .perch__sitting,
.perch.is-away .perch__sitting,
.perch.is-landing .perch__sitting {
  opacity: 0;
}

.perch.is-flying .perch__flying,
.perch.is-landing .perch__flying {
  opacity: 1;
  animation: perch-flap 0.18s ease-in-out infinite alternate;
}

.perch.is-landing .perch__flying {
  animation-duration: 0.32s;
}

@keyframes perch-breathe {
  to {
    transform: scale(1.03, 0.97);
  }
}

@keyframes perch-flap {
  to {
    transform: scaleY(0.35);
  }
}
</style>
