<script setup lang="ts">
import { computed } from 'vue'
import { hashOf } from '../../composables/projects'
import type { Project } from '../../lib/types'

/**
 * Imagem genérica do site, para projetos sem imagem própria:
 * uma composição de luz (gradiente, feixe e um anel de luz) que varia de
 * projeto para projeto, sempre igual para o mesmo repositório. Com o ponteiro
 * sobre o card, o feixe gira um pouco e o anel acompanha o movimento.
 * (O nome da linguagem fica no card, fora desta camada, para nunca sair do quadro.)
 */
const props = defineProps<{ project: Project }>()

const PALETTES = [
  ['#f6e7a6', '#ead062', '#d8b03c'],
  ['#f8efd8', '#efdcb2', '#d9bf88'],
  ['#f9d9b6', '#f1b98c', '#d98e62'],
  ['#e6e0ef', '#c8bddc', '#9d8fbf'],
  ['#e3ecdf', '#c3d3bd', '#93a88c'],
  ['#f6dccf', '#ecb8a8', '#cf8c80'],
] as const

const art = computed(() => {
  const h = hashOf(props.project.id)
  const palette = PALETTES[h % PALETTES.length] ?? PALETTES[0]
  return {
    '--a': palette[0],
    '--b': palette[1],
    '--c': palette[2],
    '--hx': `${24 + (h % 52)}%`,
    '--hy': `${28 + ((h >> 5) % 28)}%`,
    '--angle': `${150 + ((h >> 9) % 60)}deg`,
    '--beam': `${-30 + ((h >> 13) % 60)}deg`,
  }
})
</script>

<template>
  <div class="art" :style="art" aria-hidden="true">
    <span class="art__beam" />
    <span class="art__halo" />
  </div>
</template>

<style scoped>
.art {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(70% 60% at var(--hx) var(--hy), rgb(255 252 240 / 0.75), transparent 70%),
    linear-gradient(var(--angle), var(--a), var(--b) 58%, var(--c));
}

.art__beam {
  position: absolute;
  inset: -40% 22%;
  background: linear-gradient(90deg, transparent, rgb(255 252 236 / 0.5), transparent);
  rotate: calc(var(--beam) + var(--mx, 0) * 7deg);
  filter: blur(6px);
  transition: rotate 0.9s var(--ease-dream);
}

.art__halo {
  position: absolute;
  left: var(--hx);
  top: var(--hy);
  width: 28%;
  aspect-ratio: 3.4;
  translate: -50% -50%;
  border-radius: 50%;
  border: 1.5px solid rgb(255 251 234 / 0.95);
  box-shadow:
    0 0 14px rgb(255 251 234 / 0.85),
    inset 0 0 8px rgb(255 251 234 / 0.6);
  /* Acompanha o ponteiro sobre o card (variáveis --mx/--my do ProjectCard): a luz é a camada mais funda. */
  transform: translate(calc(var(--mx, 0) * 16px), calc(var(--my, 0) * 11px));
  transition:
    translate var(--dur-develop) var(--ease-surface),
    transform 0.9s var(--ease-dream);
}

</style>
