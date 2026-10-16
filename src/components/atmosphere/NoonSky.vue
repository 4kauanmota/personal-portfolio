<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { prefersReducedMotion } from '../../composables/motion'
import { NOON_WIRES, wirePath } from '../../lib/wires'

/**
 * Meio-dia: céu dourado e superexposto, clarão do sol, nuvens pintadas
 * e fios presos a um poste (eles vêm de algum lugar e seguem para fora do quadro).
 * Cada camada tem uma profundidade (data-depth) para a rolagem e o ponteiro.
 * O sol já começa a descer conforme você rola (--progress vem da cena).
 * Os fios balançam devagar no vento; quando o passarinho levanta voo, o fio
 * dele dá um tranco (pluck). De vez em quando um bando atravessa o céu.
 * O pé do céu termina exatamente na cor em que a seção seguinte começa.
 */
withDefaults(defineProps<{ wires?: boolean; ends?: 'section' | 'page' }>(), { wires: true, ends: 'section' })

/* Balanço: as alças do meio sobem e descem um pouco, cada fio no seu ritmo. */
const SPLINE = '0.45 0 0.55 1'
const lines = NOON_WIRES.map((wire, i) => {
  const amp = 3 + (i % 3) * 0.6
  const shape = (phase: number) => wirePath(wire, amp * Math.sin(phase), amp * 0.8 * Math.sin(phase - 0.7))
  const frames = [0, 1, 2, 3].map((k) => shape((k * Math.PI) / 2 + i * 0.8))
  const rest = frames[0]!
  return {
    rest,
    sway: [...frames, rest].join(';'),
    swayDur: `${9 + i * 1.3}s`,
    // O tranco: desce, volta passando um pouco do ponto e assenta.
    pluck: [rest, wirePath(wire, 15, 13), wirePath(wire, -6, -5), wirePath(wire, 2.5, 2), rest].join(';'),
  }
})

const svg = ref<SVGSVGElement | null>(null)
const plucks: SVGAnimationElement[] = []
let visible = true
let observer: IntersectionObserver | null = null

function syncClock() {
  const el = svg.value
  if (!el) return
  if (visible && !prefersReducedMotion.value) el.unpauseAnimations()
  else el.pauseAnimations()
}

/** Dá um tranco no fio (quando o passarinho sai dele). */
function pluck(index: number) {
  if (prefersReducedMotion.value) return
  try {
    plucks[index]?.beginElement()
  } catch {
    /* enfeite: sem SMIL, sem tranco */
  }
}
defineExpose({ pluck })

onMounted(() => {
  if (!svg.value) return
  syncClock()
  if (typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting)
    syncClock()
  })
  observer.observe(svg.value)
})
watch(prefersReducedMotion, syncClock)
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="noon" :class="`noon--${ends}`" aria-hidden="true">
    <div class="noon__base" />
    <div class="noon__layer" data-depth="0.5"><div class="noon__sun" /></div>
    <div class="noon__layer noon__layer--far" data-depth="0.32"><div class="noon__clouds noon__clouds--far" /></div>
    <div class="noon__layer" data-depth="0.24">
      <svg class="noon__flock" viewBox="0 0 120 40">
        <path class="bird" d="M10 20 q 6 -6 12 0 q 6 -6 12 0" />
        <path class="bird bird--2" d="M46 10 q 5 -5 10 0 q 5 -5 10 0" />
        <path class="bird bird--3" d="M74 28 q 4 -4 8 0 q 4 -4 8 0" />
      </svg>
    </div>
    <div v-if="wires" class="noon__layer noon__layer--lines" data-depth="0.16">
      <svg ref="svg" class="noon__lines" viewBox="0 0 1600 900" preserveAspectRatio="xMaxYMin slice">
        <defs>
          <linearGradient id="noon-pole" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#4b3a20" stop-opacity="0.5" />
            <stop offset="0.6" stop-color="#5d4826" stop-opacity="0.42" />
            <stop offset="1" stop-color="#f6e7b0" stop-opacity="0.35" />
          </linearGradient>
          <linearGradient id="noon-pole-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff" />
            <stop offset="0.38" stop-color="#fff" />
            <stop offset="0.66" stop-color="#fff" stop-opacity="0" />
          </linearGradient>
          <mask id="noon-pole-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900">
            <rect width="1600" height="900" fill="url(#noon-pole-fade)" />
          </mask>
        </defs>
        <!-- poste (à direita): sobe da névoa, com duas cruzetas e isoladores -->
        <g class="noon__pole" mask="url(#noon-pole-mask)" transform="translate(1600 0) scale(-1 1)">
          <path d="M66 40 L76 40 L82 900 L60 900 Z" fill="url(#noon-pole)" />
          <rect x="8" y="84" width="140" height="7" rx="2" fill="#4b3a20" fill-opacity="0.42" />
          <rect x="24" y="138" width="98" height="6" rx="2" fill="#4b3a20" fill-opacity="0.38" />
          <g fill="#4b3a20" fill-opacity="0.5">
            <rect x="20" y="70" width="7" height="15" rx="3" />
            <rect x="67" y="68" width="7" height="17" rx="3" />
            <rect x="117" y="70" width="7" height="15" rx="3" />
            <rect x="32" y="125" width="6" height="14" rx="3" />
            <rect x="106" y="125" width="6" height="14" rx="3" />
          </g>
        </g>
        <!-- fios: saem dos isoladores e cruzam o alto do céu até sair pela esquerda -->
        <g class="noon__wires" transform="translate(1600 0) scale(-1 1)">
          <path v-for="(line, i) in lines" :key="i" pathLength="1" :d="line.rest">
            <animate attributeName="d" :values="line.sway" :dur="line.swayDur" repeatCount="indefinite" calcMode="spline" :keySplines="Array(4).fill(SPLINE).join(';')" />
            <animate
              :ref="(el) => el && (plucks[i] = el as SVGAnimationElement)"
              attributeName="d"
              :values="line.pluck"
              dur="1.5s"
              begin="indefinite"
              keyTimes="0;0.2;0.5;0.76;1"
              calcMode="spline"
              :keySplines="Array(4).fill(SPLINE).join(';')"
            />
          </path>
        </g>
      </svg>
    </div>
    <div class="noon__layer noon__layer--near" data-depth="0.08"><div class="noon__clouds noon__clouds--near" /></div>
    <div class="noon__haze" />
    <div class="noon__exposure" />
  </div>
</template>

<style scoped>
.noon {
  position: absolute;
  inset: 0 0 -2px;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.noon__base {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    var(--noon-haze) 0%,
    #f1df8a 12%,
    var(--sun) 30%,
    #eed777 52%,
    #f1e2a4 74%,
    #f3e6c2 90%,
    var(--b-hero-projects) 100%
  );
}

.noon--page .noon__base {
  background: linear-gradient(180deg, var(--noon-haze) 0%, #f1df8a 14%, var(--sun) 34%, #eed777 58%, #f3e5b8 84%, var(--sun-bloom) 100%);
}

.noon__layer {
  position: absolute;
  inset: 0;
}

/* O sol: respira e, conforme a página desce, começa a baixar para a tarde. */
.noon__sun {
  position: absolute;
  top: -30%;
  right: -14%;
  width: 82vmax;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(255 253 240 / 0.95), rgb(255 248 214 / 0.5) 40%, transparent 72%);
  translate:
    calc(var(--px, 0) * -10px + (var(--progress, 0.5) - 0.5) * -10vw)
    calc(var(--py, 0) * -6px + (var(--progress, 0.5) - 0.5) * 40vh);
  animation: sun-breathe 14s var(--ease-dream) infinite alternate;
}

.noon__clouds {
  position: absolute;
  inset: -6% -8%;
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
}

.noon__clouds--far {
  background-image: url('../../assets/textures/clouds-far.webp');
  /* A textura tem borda em cima e embaixo: some antes, para a rolagem nunca mostrar a beirada. */
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 16%, #000 80%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0%, #000 16%, #000 80%, transparent 100%);
  opacity: 0.8;
  translate: calc(var(--px, 0) * -8px) calc(var(--py, 0) * -4px);
  animation: drift-far 80s linear infinite alternate;
}

.noon__clouds--near {
  background-image: url('../../assets/textures/clouds-near.webp');
  /* As nuvens de baixo se desfazem antes da borda: nada termina cortado. */
  -webkit-mask-image: linear-gradient(180deg, #000 70%, transparent 98%);
  mask-image: linear-gradient(180deg, #000 70%, transparent 98%);
  translate: calc(var(--px, 0) * -24px) calc(var(--py, 0) * -10px);
  animation: drift-near 64s linear infinite alternate;
}

/* Um bando pequeno cruza o céu de tempos em tempos, longe, atrás dos fios. */
.noon__flock {
  position: absolute;
  left: 0;
  top: 17%;
  width: clamp(4.5rem, 3rem + 4vw, 7rem);
  overflow: visible;
  translate: -12vw 0;
  animation: flock-cross 52s linear 5s infinite backwards;
}

.bird {
  fill: none;
  stroke: rgb(77 60 34 / 0.42);
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  transform-box: fill-box;
  transform-origin: center;
  animation: flap 1.3s ease-in-out infinite alternate;
}

.bird--2 {
  animation-delay: -0.45s;
}

.bird--3 {
  animation-delay: -0.9s;
}

.noon__layer--lines {
  translate: calc(var(--px, 0) * -4px) 0;
}

.noon__lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.noon__wires path {
  fill: none;
  stroke: #4d3c22;
  stroke-opacity: 0.32;
  stroke-width: 1.2;
  vector-effect: non-scaling-stroke;
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
  animation: wire-draw 2.6s var(--ease-dream) 0.5s backwards;
}

.noon__wires path:nth-child(2n) {
  animation-delay: 0.65s;
}

.noon__haze {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 62%, rgb(243 232 205 / 0.5) 86%, var(--b-hero-projects) 100%);
}

.noon--page .noon__haze {
  background: linear-gradient(180deg, transparent 60%, rgb(246 236 189 / 0.6) 88%, var(--sun-bloom) 100%);
}

/* Abertura: a lembrança começa superexposta e a cor aparece aos poucos. */
.noon__exposure {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 90% at 70% 30%, #fffef8, #fff9e4 60%, #fbf1cc);
  animation: exposure 2.2s var(--ease-dream) both;
  pointer-events: none;
}

@keyframes exposure {
  0%,
  12% {
    opacity: 1;
  }
  to {
    opacity: 0;
    visibility: hidden;
  }
}

@keyframes wire-draw {
  from {
    stroke-dashoffset: 1;
  }
}

/* A deriva usa transform; o ponteiro usa translate; a rolagem fica na camada de fora. */
@keyframes drift-far {
  to {
    transform: translateX(-3%);
  }
}

@keyframes drift-near {
  to {
    transform: translate(4%, -1%);
  }
}

@keyframes sun-breathe {
  to {
    opacity: 0.82;
    scale: 1.05;
  }
}

@keyframes flap {
  to {
    transform: scaleY(0.5);
  }
}

/* Atravessa em pouco mais da metade do ciclo e some; o resto do tempo, céu vazio. */
@keyframes flock-cross {
  0% {
    translate: -12vw 0;
  }
  30% {
    translate: 34vw -2.5vh;
  }
  62% {
    translate: 112vw 1vh;
  }
  100% {
    translate: 112vw 1vh;
  }
}

@media (max-width: 760px) {
  .noon__lines {
    opacity: 0.75;
  }
}

@media (prefers-reduced-motion: reduce) {
  .noon__flock {
    display: none;
  }
}
</style>
