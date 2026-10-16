<script setup lang="ts">
import { computed } from 'vue'
import type { FilmStripView } from '../../lib/film'

/**
 * Um fragmento de filme de lembranças, no seu próprio <svg> (só do tamanho dele).
 *
 * A película sai de uma linha central só (o <path> com id `…-c-…`): a borda que pega a
 * luz, a película em rosa antigo (um eco pastel do vermelho do filme revelado) com os
 * furos vazados de verdade (o céu aparece por eles) e as pontas que se dissolvem. Por
 * cima, um quadro a cada passo, com uma luz rosada atravessando, e dentro dele uma
 * lembrança em silhueta escura e suave, enquadrada como numa foto de verdade: às vezes
 * um pedaço fica fora do quadro. Por fim, a granulação, um risco claro ao longo da
 * película e um queimado de luz cor de pêssego nas pontas, como no fim de um rolo.
 * Tudo bem transparente e de pouco contraste: as fitas enfeitam o céu, sem chamar a atenção.
 *
 * O <svg> é um elemento à parte: a deriva no ar (CSS) só desloca a imagem pronta, sem
 * redesenhar. No chicote, o FilmScene troca o `d` da linha e a posição dos quadros.
 */
const props = defineProps<{ strip: FilmStripView; uid: string }>()

const id = (kind: string) => `${props.uid}-${kind}-${props.strip.id}`
const href = computed(() => `#${id('c')}`)
const t = computed(() => props.strip.width)
const n = (v: number) => v.toFixed(2)

/** Quatro furos por quadro, como no filme de 35 mm. */
const holes = computed(() => `${n(props.strip.period / 8)} ${n(props.strip.period / 8)}`)
const edge = computed(() => Math.max(0.8, t.value * 0.035))
/** Lembrança dentro da janela: o tamanho que preenche a janela (o zoom de cada quadro corta um pouco). */
const art = computed(() => Math.min(props.strip.window.w / 100, props.strip.window.h / 80))
const radius = computed(() => Math.max(1, t.value * 0.05))

/** Película: rosa antigo, pastel e pouco saturado (lembra o vermelho do filme revelado), mais fria quanto mais longe. */
function mix(near: number[], far: number[]) {
  const d = props.strip.depth
  const c = near.map((v, i) => Math.round(far[i]! + (v - far[i]!) * d))
  return `rgb(${c[0]} ${c[1]} ${c[2]})`
}
const stock = computed(() => mix([170, 114, 116], [134, 108, 134]))

const frameTransform = (f: FilmStripView['frames'][number]) => `translate(${n(f.x)} ${n(f.y)}) rotate(${n(f.angle + props.strip.offset)})`
const memoryTransform = (f: FilmStripView['frames'][number]) =>
  `translate(${n(f.ox * props.strip.window.w)} ${n(f.oy * props.strip.window.h)}) scale(${(art.value * f.zoom).toFixed(4)})`

const style = computed(() => {
  const { box, drift, tilt } = props.strip
  return {
    left: `${box.x}px`,
    top: `${box.y}px`,
    width: `${box.w}px`,
    height: `${box.h}px`,
    '--dx': `${drift.x}px`,
    '--dy': `${drift.y}px`,
    '--dr': `${drift.r}deg`,
    // Inclinação no espaço, como uma transformação plana (oblíqua): dá a sensação de
    // perspectiva sem o custo de 3D para o navegador.
    '--skx': `${(tilt.y * 0.3).toFixed(2)}deg`,
    '--sky': `${(tilt.x * 0.3).toFixed(2)}deg`,
    '--sc': (1 - (Math.abs(tilt.x) + Math.abs(tilt.y)) * 0.002).toFixed(3),
    animationDuration: `${drift.dur}s`,
    animationDelay: `${drift.delay}s`,
  }
})
</script>

<template>
  <svg
    :data-strip="strip.id"
    class="frag"
    :class="`frag--${strip.layer}`"
    :viewBox="`${strip.box.x} ${strip.box.y} ${strip.box.w} ${strip.box.h}`"
    :width="strip.box.w"
    :height="strip.box.h"
    :style="style"
    aria-hidden="true"
  >
    <defs>
      <path :id="id('c')" :d="strip.d" />
      <linearGradient :id="id('f')" gradientUnits="userSpaceOnUse" :x1="strip.gradient.x1" :y1="strip.gradient.y1" :x2="strip.gradient.x2" :y2="strip.gradient.y2">
        <stop v-for="([o, a], k) in strip.gradient.stops" :key="k" :offset="o" stop-color="#fff" :stop-opacity="a" />
      </linearGradient>
      <mask :id="id('m')" maskUnits="userSpaceOnUse" :x="strip.box.x" :y="strip.box.y" :width="strip.box.w" :height="strip.box.h">
        <use :href="href" fill="none" :stroke="`url(#${id('f')})`" :stroke-width="t + 2" />
        <use :href="href" fill="none" stroke="#000" :stroke-width="t * 0.86" :stroke-dasharray="holes" />
        <use :href="href" fill="none" :stroke="`url(#${id('f')})`" :stroke-width="t * 0.7" />
      </mask>
      <!-- A janela do quadro, no espaço de cada quadro: o desenho fica recortado por ela. -->
      <clipPath :id="id('w')">
        <rect :x="-strip.window.w / 2" :y="-strip.window.h / 2" :width="strip.window.w" :height="strip.window.h" :rx="radius" />
      </clipPath>
      <!-- Queimado de luz nas pontas: um pêssego claro que some antes do meio. -->
      <linearGradient :id="id('b')" gradientUnits="userSpaceOnUse" :x1="strip.gradient.x1" :y1="strip.gradient.y1" :x2="strip.gradient.x2" :y2="strip.gradient.y2">
        <stop offset="0" stop-color="#f6cdb9" :stop-opacity="strip.burn[0] * 0.7" />
        <stop offset="0.22" stop-color="#eebaa8" stop-opacity="0" />
        <stop offset="0.78" stop-color="#eebaa8" stop-opacity="0" />
        <stop offset="1" stop-color="#f6cdb9" :stop-opacity="strip.burn[1] * 0.7" />
      </linearGradient>
    </defs>
    <g :mask="`url(#${id('m')})`">
      <use :href="href" class="frag__line frag__rim" :stroke="`url(#${uid}-light)`" :stroke-width="t" />
      <use :href="href" class="frag__line" :stroke="stock" :stroke-width="t - edge * 2" />
      <g v-for="(f, k) in strip.frames" :key="k" class="frag__frame" :transform="frameTransform(f)">
        <rect
          class="frag__window"
          :x="-strip.window.w / 2"
          :y="-strip.window.h / 2"
          :width="strip.window.w"
          :height="strip.window.h"
          :rx="radius"
          :fill="`url(#${uid}-window)`"
          :opacity="f.exposure"
        />
        <g :clip-path="`url(#${id('w')})`">
          <use class="frag__memory" :href="`#${uid}-mem-${f.memory}`" :transform="memoryTransform(f)" />
        </g>
      </g>
      <use :href="href" class="frag__line" :stroke="`url(#${uid}-grain)`" :stroke-width="t * 0.86" />
      <use :href="href" class="frag__line frag__scratch" :stroke-dasharray="strip.scratch" />
      <use :href="href" class="frag__line" :stroke="`url(#${id('b')})`" :stroke-width="t" />
    </g>
  </svg>
</template>

<style scoped>
.frag {
  position: absolute;
  overflow: visible;
  /* A profundidade (camada de longe, do meio ou de perto) define a transparência. */
  opacity: var(--frag-opacity, 1);
  transform-origin: 50% 50%;
  /* Perspectiva: cada fragmento um pouco inclinado no espaço, como solto no ar. */
  transform: skew(var(--skx), var(--sky)) scale(var(--sc));
}

.frag use {
  fill: none;
}

.frag__line {
  stroke-linecap: butt;
  stroke-linejoin: round;
}

/* A borda pega só um pouco da luz da TV: a fita acompanha o cenário, sem brilhar. */
.frag__rim {
  stroke-opacity: 0.3;
}

/* As lembranças: silhuetas escuras e suaves (ameixa) sobre a luz rosada do quadro. */
.frag__memory {
  color: #553846;
  opacity: 0.7;
}

/* Um risco fino ao longo da película, como de projetor. */
.frag__scratch {
  stroke: rgb(255 238 228 / 0.14);
  stroke-width: 0.7;
}

/*
 * Deriva lenta: cada fragmento no seu próprio ritmo (duração e atraso vêm do FilmScene).
 * Os de longe ficam parados (só andam com a profundidade da rolagem): nem tudo se move ao
 * mesmo tempo, e o navegador tem menos camadas para mover a cada quadro.
 */
@media (prefers-reduced-motion: no-preference) {
  .frag:not(.frag--far) {
    animation-name: frag-drift;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    animation-direction: alternate;
  }
}

@keyframes frag-drift {
  to {
    translate: var(--dx) var(--dy);
    rotate: var(--dr);
  }
}
</style>
