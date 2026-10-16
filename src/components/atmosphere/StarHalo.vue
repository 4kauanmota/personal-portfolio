<script setup lang="ts">
import { ref } from 'vue'
import { playSound } from '../../composables/sound'

/**
 * Auréola de estrelas: uma estrela de quatro pontas no centro e outras menores
 * em órbita numa elipse inclinada. As de trás passam atrás da estrela do centro,
 * menores e mais apagadas; as da frente passam na frente, maiores.
 * Diferente das outras auréolas (anéis de luz): esta é feita só de estrelas,
 * para fechar a trajetória como um ponto de chegada.
 * Tocar faz a estrela do centro brilhar e soar.
 */
const props = withDefaults(defineProps<{ lit?: boolean; label?: string }>(), { lit: true, label: '' })
const ringing = ref(false)
const STARS = 7
const DURATION = 16

function ring() {
  if (ringing.value) return
  ringing.value = true
  playSound('chime')
  window.setTimeout(() => (ringing.value = false), 1300)
}
</script>

<template>
  <button type="button" class="starhalo" :class="{ 'is-lit': props.lit, 'is-ringing': ringing }" :aria-label="props.label" @click="ring">
    <span class="starhalo__glow" aria-hidden="true" />
    <span class="starhalo__ring" aria-hidden="true" />
    <span class="starhalo__ripple" aria-hidden="true" />
    <span
      v-for="k in STARS"
      :key="k"
      class="starhalo__star"
      :style="{ animationDelay: `${(-k * DURATION) / STARS}s`, '--s': `${0.6 + ((k * 3) % 5) * 0.12}`, '--k': k }"
      aria-hidden="true"
    >
      <svg viewBox="-50 -50 100 100"><path d="M0 -50 C 5 -9, 9 -5, 34 0 C 9 5, 5 9, 0 50 C -5 9, -9 5, -34 0 C -9 -5, -5 -9, 0 -50 Z" /></svg>
    </span>
    <svg class="starhalo__core" viewBox="-50 -50 100 100" aria-hidden="true">
      <path d="M0 -50 C 5 -9, 9 -5, 34 0 C 9 5, 5 9, 0 50 C -5 9, -9 5, -34 0 C -9 -5, -5 -9, 0 -50 Z" />
    </svg>
  </button>
</template>

<style scoped>
.starhalo {
  --w: 132px;
  --h: 40px;
  position: relative;
  display: block;
  width: var(--w);
  height: 96px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;
}

.starhalo:focus-visible {
  outline: 2px solid var(--halo);
  outline-offset: 6px;
}

.starhalo__glow {
  position: absolute;
  inset: -30% -20%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(255 244 214 / 0.55), rgb(255 226 190 / 0.18) 55%, transparent);
  opacity: 0;
  transition: opacity 1.2s var(--ease-dream);
}

.is-lit .starhalo__glow {
  opacity: 1;
}

/* A órbita: uma elipse quase invisível, só para o olho seguir. */
.starhalo__ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--w);
  height: var(--h);
  translate: -50% -50%;
  border-radius: 50%;
  border: 1px solid rgb(255 246 222 / 0.45);
  box-shadow: 0 0 10px rgb(255 240 210 / 0.35);
  opacity: 0;
  transition: opacity 1s var(--ease-dream) 0.2s;
}

.is-lit .starhalo__ring {
  opacity: 1;
}

.starhalo__star {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  /* A elipse: atrás (metade de cima) e depois na frente (metade de baixo). */
  offset-path: path('M -66 0 A 66 20 0 1 1 66 0 A 66 20 0 1 1 -66 0');
  offset-rotate: 0deg;
  animation: orbit 16s linear infinite;
}

.starhalo__star svg {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(14px * var(--s));
  max-width: none;
  aspect-ratio: 1;
  translate: -50% -50%;
  overflow: visible;
  filter: drop-shadow(0 0 4px rgb(255 246 214 / 0.95));
  opacity: 0;
  transition: opacity 0.8s var(--ease-dream) calc(0.3s + var(--k) * 90ms);
}

.is-lit .starhalo__star svg {
  opacity: 1;
}

.starhalo__star path,
.starhalo__core path {
  fill: #fff8e4;
}

.starhalo__core {
  position: absolute;
  z-index: 1;
  left: 50%;
  top: 50%;
  width: 46px;
  aspect-ratio: 1;
  translate: -50% -50%;
  overflow: visible;
  filter: drop-shadow(0 0 6px rgb(255 248 228 / 1)) drop-shadow(0 0 18px rgb(255 226 170 / 0.7));
  scale: 0.2;
  opacity: 0;
  transition:
    scale 1.2s var(--ease-surface),
    opacity 0.8s var(--ease-dream);
}

.is-lit .starhalo__core {
  scale: 1;
  opacity: 1;
  animation: core-breathe 4.8s var(--ease-in-out) 1.2s infinite alternate;
}

/* Tocar: a estrela do centro acende e uma onda de luz se abre. */
.starhalo__ripple {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--w);
  height: var(--h);
  translate: -50% -50%;
  border-radius: 50%;
  border: 1.5px solid rgb(255 246 222 / 0.9);
  opacity: 0;
  pointer-events: none;
}

.is-ringing .starhalo__ripple {
  animation: ripple 1.2s var(--ease-dream);
}

.is-ringing .starhalo__core {
  animation: core-flash 1.2s var(--ease-dream);
}

@keyframes orbit {
  0% {
    offset-distance: 0%;
    scale: 0.7;
    opacity: 0.45;
    z-index: 0;
  }
  25% {
    scale: 0.55;
    opacity: 0.35;
  }
  49.9% {
    z-index: 0;
  }
  50% {
    offset-distance: 50%;
    scale: 0.8;
    opacity: 0.8;
    z-index: 2;
  }
  75% {
    scale: 1.2;
    opacity: 1;
  }
  99.9% {
    z-index: 2;
  }
  100% {
    offset-distance: 100%;
    scale: 0.7;
    opacity: 0.45;
    z-index: 0;
  }
}

@keyframes core-breathe {
  from {
    scale: 0.9;
    rotate: -4deg;
  }
  to {
    scale: 1.08;
    rotate: 4deg;
  }
}

@keyframes core-flash {
  30% {
    scale: 1.45;
    rotate: 45deg;
  }
}

@keyframes ripple {
  0% {
    opacity: 0.9;
    scale: 0.6;
  }
  100% {
    opacity: 0;
    scale: 2.2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .starhalo__star {
    animation: none;
    offset-distance: calc(var(--s) * 60%);
  }
}
</style>
