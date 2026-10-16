<script setup lang="ts">
import { useId } from 'vue'
import type { DiskColor } from '../../content/curiosities'

/** Desenho de um disquete de 3,5" em tom pastel, com a etiqueta escrita à mão. Só visual. */
withDefaults(defineProps<{ label: string; color?: DiskColor; draft?: boolean }>(), { color: 'lilac', draft: false })
const uid = useId()
const ids = { shell: `disk-shell-${uid}`, metal: `disk-metal-${uid}` }
</script>

<template>
  <span class="disk" :class="[`disk--${color}`, { 'disk--draft': draft }]">
    <svg class="disk__body" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient :id="ids.shell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" class="disk__shell-light" />
          <stop offset="1" class="disk__shell-dark" />
        </linearGradient>
        <linearGradient :id="ids.metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#c9ced6" />
          <stop offset="0.45" stop-color="#f2f4f7" />
          <stop offset="0.7" stop-color="#d4d8de" />
          <stop offset="1" stop-color="#b8bec8" />
        </linearGradient>
      </defs>
      <path class="disk__shell" :fill="`url(#${ids.shell})`" d="M7 2h80l11 11v80a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z" />
      <path class="disk__edge" d="M7 2h80l11 11v80a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z" />
      <rect x="25" y="2" width="50" height="31" rx="1.5" :fill="`url(#${ids.metal})`" />
      <rect x="58" y="8" width="10" height="19" rx="1" class="disk__window" />
      <rect x="13" y="44" width="74" height="48" rx="2.5" class="disk__label" />
      <rect x="13" y="44" width="74" height="7" rx="2.5" class="disk__stripe" />
      <path class="disk__rule" d="M19 64h62M19 74h62M19 84h62" />
      <rect class="disk__notch" x="7" y="87" width="5" height="6" rx="0.8" />
    </svg>
    <span class="disk__text">{{ label }}</span>
  </span>
</template>

<style scoped>
.disk {
  --shell: #cbb8e6;
  --shell-light: #ddd0f0;
  --stripe: #9d86c9;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1;
}

.disk__body {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.disk__shell-light {
  stop-color: var(--shell-light);
}

.disk__shell-dark {
  stop-color: var(--shell);
}

.disk__edge {
  fill: none;
  stroke: rgb(40 30 60 / 0.22);
  stroke-width: 0.8;
}

.disk__window {
  fill: rgb(40 36 54 / 0.55);
}

.disk__label {
  fill: #fbf8f1;
}

.disk__stripe {
  fill: var(--stripe);
}

.disk__rule {
  stroke: rgb(99 140 200 / 0.3);
  stroke-width: 0.6;
}

.disk__notch {
  fill: rgb(40 30 50 / 0.4);
}

.disk__text {
  position: absolute;
  left: 15%;
  right: 15%;
  top: 52%;
  bottom: 9%;
  display: grid;
  place-items: center;
  font-family: var(--font-hand);
  font-size: calc(var(--disk-size, 6.75rem) * 0.17);
  line-height: 0.95;
  text-align: center;
  color: #2d2a3a;
  overflow-wrap: anywhere;
}

.disk--lilac {
  --shell: #c3aee2;
  --shell-light: #ddd0f0;
  --stripe: #9a82c8;
}

.disk--pink {
  --shell: #efb7c6;
  --shell-light: #f8d6df;
  --stripe: #d98ea3;
}

.disk--blue {
  --shell: #b1d2ec;
  --shell-light: #d3e6f5;
  --stripe: #7fb0d6;
}

.disk--mint {
  --shell: #b4dfc8;
  --shell-light: #d4efe1;
  --stripe: #7fc19f;
}

.disk--yellow {
  --shell: #f1dd92;
  --shell-light: #f8ecc0;
  --stripe: #d6b84f;
}

.disk--peach {
  --shell: #f5bf98;
  --shell-light: #fad8bf;
  --stripe: #e2966a;
}

.disk--draft .disk__shell {
  opacity: 0.45;
}

.disk--draft .disk__label {
  fill: none;
  stroke: #fbf8f1;
  stroke-dasharray: 3 3;
}

.disk--draft .disk__text {
  color: #fbf8f1;
}
</style>
