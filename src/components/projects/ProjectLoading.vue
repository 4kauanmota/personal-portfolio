<script setup lang="ts">
import { computed } from 'vue'
import { hashOf } from '../../composables/projects'
import { seeded } from '../../lib/sun'

/**
 * Enquanto a imagem de um projeto carrega, a foto revela um pedacinho de céu:
 * uma luz atravessa devagar e uma constelação se forma, estrela por estrela, com os
 * traços ligando uma à outra. Cada projeto tem a sua constelação (sempre a mesma para
 * o mesmo repositório) e o seu próprio tempo, então vários cards carregando juntos
 * nunca piscam em coro. Quando a imagem chega, o céu se dissolve na foto.
 *
 * Só usa transform e opacity em elementos HTML (o navegador anima sem redesenhar).
 * Com "reduzir movimento", a constelação aparece pronta, sem animação.
 */
const props = defineProps<{ seed: string }>()

/** Espaço de 160 × 100 (a proporção da foto, 16:10): 1 unidade vale o mesmo nas duas direções. */
const W = 160
const H = 100

interface Star {
  x: number
  y: number
  size: number
  i: number
}

const sky = computed(() => {
  const h = hashOf(props.seed)
  const rand = seeded(h % 100000)
  const count = 4 + (h % 2)
  // Estrelas da esquerda para a direita, subindo e descendo: uma constelação, não um enfeite em fila.
  const stars: Star[] = []
  const span = (W - 56) / (count - 1)
  let up = rand() > 0.5
  for (let i = 0; i < count; i++) {
    const x = 28 + span * i + (rand() - 0.5) * span * 0.45
    const y = (up ? 30 : 64) + (rand() - 0.5) * 18
    up = !up
    stars.push({ x, y, size: i === 0 || rand() > 0.7 ? 11 : 6.5 + rand() * 3, i })
  }
  const lines = stars.slice(1).map((b, k) => {
    const a = stars[k]!
    const dx = b.x - a.x
    const dy = b.y - a.y
    return { x: a.x, y: a.y, length: Math.hypot(dx, dy), angle: (Math.atan2(dy, dx) * 180) / Math.PI, i: k }
  })
  const brightest = stars.reduce((best, s) => (s.size > best.size ? s : best), stars[0]!)
  return { stars, lines, brightest, phase: -((h >> 4) % 4800) / 1000 }
})

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`
</script>

<template>
  <div class="ld" aria-hidden="true" :style="{ '--phase': `${sky.phase}s` }">
    <span class="ld__light" />
    <i
      v-for="l in sky.lines"
      :key="`l${l.i}`"
      class="ld__line"
      :style="{ left: pct(l.x, W), top: pct(l.y, H), width: pct(l.length, W), rotate: `${l.angle.toFixed(1)}deg`, '--i': l.i }"
    />
    <span class="ld__halo" :style="{ left: pct(sky.brightest.x, W), top: pct(sky.brightest.y, H) }" />
    <svg
      v-for="s in sky.stars"
      :key="`s${s.i}`"
      class="ld__star"
      viewBox="-50 -50 100 100"
      :style="{ left: pct(s.x, W), top: pct(s.y, H), width: pct(s.size, W), '--i': s.i }"
    >
      <path d="M0 -50 C 5 -9, 9 -5, 34 0 C 9 5, 5 9, 0 50 C -5 9, -9 5, -34 0 C -9 -5, -5 -9, 0 -50 Z" />
    </svg>
  </div>
</template>

<style scoped>
/* Um pedaço de céu de fim de tarde, nos tons do site (dourado, pêssego e lilás). */
.ld {
  --cycle: 5.2s;
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(90% 70% at 30% 20%, rgb(255 246 222 / 0.7), transparent 70%),
    linear-gradient(165deg, #f1dcb6, #ebcdb8 48%, #d9c6da);
}

/* A luz que atravessa a foto, devagar. */
.ld__light {
  position: absolute;
  inset: -30% -10%;
  background: radial-gradient(35% 45% at 50% 50%, rgb(255 251 238 / 0.8), rgb(255 247 226 / 0.2) 55%, transparent 75%);
  translate: -28% 0;
}

.ld__line {
  position: absolute;
  height: 1px;
  transform-origin: 0 50%;
  background: linear-gradient(90deg, rgb(255 250 236 / 0.85), rgb(255 246 226 / 0.45));
  box-shadow: 0 0 4px rgb(255 240 205 / 0.7);
}

.ld__star {
  position: absolute;
  aspect-ratio: 1;
  translate: -50% -50%;
  fill: #fffbf0;
  filter: drop-shadow(0 0 2px rgb(255 238 196 / 0.95)) drop-shadow(0 0 6px rgb(244 196 128 / 0.6));
}

/* O anel de luz da identidade, em volta da estrela mais forte. */
.ld__halo {
  position: absolute;
  width: 15%;
  aspect-ratio: 3;
  translate: -50% -50%;
  border-radius: 50%;
  border: 1px solid rgb(255 250 236 / 0.75);
  box-shadow: 0 0 8px rgb(255 240 210 / 0.6);
}

@media (prefers-reduced-motion: no-preference) {
  .ld__light {
    animation: ld-light 6.5s ease-in-out var(--phase) infinite alternate;
  }

  .ld__star {
    opacity: 0;
    animation: ld-star var(--cycle) cubic-bezier(0.3, 0.7, 0.3, 1) calc(var(--phase) + var(--i) * 0.42s) infinite;
  }

  .ld__line {
    transform: scaleX(0);
    animation: ld-line var(--cycle) cubic-bezier(0.45, 0, 0.2, 1) calc(var(--phase) + var(--i) * 0.42s + 0.3s) infinite;
  }

  .ld__halo {
    opacity: 0;
    animation: ld-halo var(--cycle) ease-in-out calc(var(--phase) + 1.6s) infinite;
  }
}

@keyframes ld-light {
  to {
    translate: 28% 0;
  }
}

@keyframes ld-star {
  0% {
    opacity: 0;
    transform: scale(0.2) rotate(-30deg);
  }

  12% {
    opacity: 1;
    transform: scale(1.15) rotate(0deg);
  }

  20%,
  64% {
    opacity: 0.95;
    transform: scale(1);
  }

  40% {
    opacity: 0.75;
    transform: scale(0.88);
  }

  86%,
  100% {
    opacity: 0;
    transform: scale(0.5);
  }
}

@keyframes ld-line {
  0%,
  6% {
    opacity: 0;
    transform: scaleX(0);
  }

  22%,
  62% {
    opacity: 1;
    transform: scaleX(1);
  }

  84%,
  100% {
    opacity: 0;
    transform: scaleX(1);
  }
}

@keyframes ld-halo {
  0%,
  10% {
    opacity: 0;
    transform: scale(0.6);
  }

  34%,
  58% {
    opacity: 0.9;
    transform: scale(1);
  }

  82%,
  100% {
    opacity: 0;
    transform: scale(1.25);
  }
}

/* Quando a imagem chega: o céu clareia um pouco e se dissolve na foto. */
.ld.v-leave-active {
  transition:
    opacity 0.8s var(--ease-dream),
    filter 0.8s var(--ease-dream);
}

.ld.v-leave-to {
  opacity: 0;
  filter: brightness(1.12);
}
</style>
