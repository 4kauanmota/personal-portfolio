<script setup lang="ts">
import { computed, useId } from 'vue'

/**
 * Auréola de luz, desenhada em SVG (fica lisa em qualquer tamanho).
 * Formas:
 *   - ring:   um anel simples, com brilho e traço fino
 *   - crown:  dois anéis e raios curtos de luz
 *   - motes:  um anel de partículas que giram devagar
 *   - broken: um anel partido em fragmentos (lembrança que falha)
 * `tilt` inclina o anel no espaço (0 = de frente, 90 = de lado).
 */
const props = withDefaults(
  defineProps<{
    variant?: 'ring' | 'crown' | 'motes' | 'broken'
    size?: string
    tilt?: number
    /** "light" = luz branca; "iris" = brilho iridescente (o sonho, o agora). */
    tone?: 'light' | 'iris'
    /** Traço fino escuro em volta, para fundos claros. */
    drawn?: boolean
    float?: boolean
  }>(),
  { variant: 'ring', size: '8rem', tilt: 72, tone: 'light', drawn: false, float: false },
)

const uid = useId()
const ids = { glow: `halo-glow-${uid}`, soft: `halo-soft-${uid}`, sheen: `halo-sheen-${uid}`, core: `halo-core-${uid}` }

/** Raio vertical da elipse para a inclinação pedida. */
const ry = computed(() => Math.max(4, 50 * Math.cos((props.tilt * Math.PI) / 180)))
const ry2 = computed(() => ry.value * 0.82)

/** Raios de luz da coroa: pontos ao longo da elipse, saindo para fora. */
const rays = computed(() => {
  const out: Array<{ x1: number; y1: number; x2: number; y2: number; o: number }> = []
  const n = 22
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.12
    const cx = Math.cos(a)
    const cy = Math.sin(a)
    const len = 5 + ((k * 7) % 5) * 1.6
    const back = cy > 0 ? 0.55 : 1
    out.push({ x1: cx * 53, y1: cy * (ry.value + 3), x2: cx * (53 + len), y2: cy * (ry.value + 3 + len * (ry.value / 50)), o: back * (0.35 + ((k * 5) % 4) * 0.12) })
  }
  return out
})

/** Fragmentos do anel partido: arcos com falhas irregulares. */
const fragments = computed(() => {
  const cuts = [0, 0.16, 0.21, 0.43, 0.47, 0.6, 0.66, 0.83, 0.88, 1]
  const arcs: string[] = []
  for (let k = 0; k < cuts.length - 1; k += 2) {
    const a0 = (cuts[k] ?? 0) * Math.PI * 2
    const a1 = (cuts[k + 1] ?? 0) * Math.PI * 2
    const p0 = `${(50 * Math.cos(a0)).toFixed(2)} ${(ry.value * Math.sin(a0)).toFixed(2)}`
    const p1 = `${(50 * Math.cos(a1)).toFixed(2)} ${(ry.value * Math.sin(a1)).toFixed(2)}`
    arcs.push(`M ${p0} A 50 ${ry.value.toFixed(2)} 0 0 1 ${p1}`)
  }
  return arcs
})
</script>

<template>
  <span class="halo" :class="[`halo--${variant}`, `halo--${tone}`, { 'halo--float': float }]" :style="{ '--halo-size': size }" aria-hidden="true">
    <svg class="halo__svg" viewBox="-72 -72 144 144" overflow="visible">
      <defs>
        <filter :id="ids.glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4.2" /></filter>
        <filter :id="ids.soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.1" /></filter>
        <linearGradient :id="ids.sheen" x1="0" y1="0" x2="1" y2="0.4" gradientUnits="objectBoundingBox">
          <stop offset="0" stop-color="#63b8c8" />
          <stop offset="0.3" stop-color="#a75eb6" />
          <stop offset="0.55" stop-color="#fff6d8" />
          <stop offset="0.75" stop-color="#6dc768" />
          <stop offset="1" stop-color="#e9d055" />
        </linearGradient>
        <linearGradient :id="ids.core" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fffdf4" />
          <stop offset="0.5" stop-color="#fff3c9" />
          <stop offset="1" stop-color="#fffdf4" />
        </linearGradient>
      </defs>

      <g class="halo__body">
        <!-- brilho difuso -->
        <ellipse class="halo__glow" cx="0" cy="0" rx="50" :ry="ry" :filter="`url(#${ids.glow})`" />

        <template v-if="variant === 'broken'">
          <path v-for="(d, k) in fragments" :key="k" class="halo__core" :d="d" :filter="`url(#${ids.soft})`" />
          <path v-for="(d, k) in fragments" :key="`l${k}`" class="halo__core halo__core--crisp" :d="d" :stroke="`url(#${ids.core})`" />
        </template>

        <template v-else-if="variant === 'motes'">
          <ellipse class="halo__track" cx="0" cy="0" rx="50" :ry="ry" />
          <g class="halo__orbit">
            <ellipse class="halo__motes" cx="0" cy="0" rx="50" :ry="ry" :filter="`url(#${ids.soft})`" />
            <ellipse class="halo__motes halo__motes--crisp" cx="0" cy="0" rx="50" :ry="ry" />
          </g>
        </template>

        <template v-else>
          <ellipse class="halo__core" cx="0" cy="0" rx="50" :ry="ry" :filter="`url(#${ids.soft})`" />
          <ellipse class="halo__core halo__core--crisp" cx="0" cy="0" rx="50" :ry="ry" :stroke="`url(#${ids.core})`" />
          <ellipse v-if="tone === 'iris'" class="halo__sheen" cx="0" cy="0" rx="50" :ry="ry" :stroke="`url(#${ids.sheen})`" />
          <template v-if="variant === 'crown'">
            <ellipse class="halo__inner" cx="0" cy="0" rx="41" :ry="ry2" />
            <g class="halo__rays">
              <line v-for="(r, k) in rays" :key="k" :x1="r.x1" :y1="r.y1" :x2="r.x2" :y2="r.y2" :style="{ opacity: r.o }" />
            </g>
          </template>
        </template>

        <!-- traço desenhado, para fundos claros -->
        <template v-if="drawn && variant !== 'motes'">
          <ellipse class="halo__line" cx="0" cy="0" rx="52.6" :ry="ry + 2.6" />
          <ellipse class="halo__line" cx="0" cy="0" rx="47.4" :ry="Math.max(1, ry - 2.6)" />
        </template>
      </g>
    </svg>
  </span>
</template>

<style scoped>
.halo {
  position: relative;
  display: inline-block;
  width: var(--halo-size);
  aspect-ratio: 1;
  pointer-events: none;
}

.halo__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* Flutua o desenho inteiro (só transform e opacidade: o navegador não redesenha a luz). */
.halo--float .halo__svg {
  animation: halo-float 7.5s var(--ease-dream) infinite alternate;
}

.halo__glow {
  fill: none;
  stroke: var(--halo);
  stroke-width: 9;
  opacity: 0.85;
}

.halo__core {
  fill: none;
  stroke: #fffdf2;
  stroke-width: 4.2;
  stroke-linecap: round;
}

.halo__core--crisp {
  stroke-width: 2.2;
}

.halo__sheen {
  fill: none;
  stroke-width: 2.6;
  opacity: 0.75;
  mix-blend-mode: screen;
}

.halo__inner {
  fill: none;
  stroke: rgb(255 251 234 / 0.75);
  stroke-width: 1.1;
  filter: drop-shadow(0 0 2px rgb(255 251 234 / 0.9));
}

.halo__rays line {
  stroke: #fffbea;
  stroke-width: 1;
  stroke-linecap: round;
}

.halo__rays {
  opacity: 0.8;
}

.halo__track {
  fill: none;
  stroke: rgb(255 251 234 / 0.35);
  stroke-width: 0.8;
}

.halo__motes {
  fill: none;
  stroke: #fffdf2;
  stroke-width: 3.4;
  stroke-linecap: round;
  stroke-dasharray: 0.1 11.5;
}

.halo__motes--crisp {
  stroke-width: 2.2;
}

.halo__orbit {
  animation: halo-orbit 24s linear infinite;
}

.halo__line {
  fill: none;
  stroke: rgb(58 44 28 / 0.4);
  stroke-width: 0.7;
  vector-effect: non-scaling-stroke;
}

.halo--iris .halo__glow {
  stroke: #fff4d8;
}

@keyframes halo-float {
  to {
    translate: 0 -4.5%;
    opacity: 0.84;
  }
}

@keyframes halo-orbit {
  to {
    stroke-dashoffset: -116;
  }
}
</style>
