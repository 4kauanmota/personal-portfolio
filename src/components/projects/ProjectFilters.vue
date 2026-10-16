<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import { hashOf } from '../../composables/projects'
import { formatNumber, t, useI18n } from '../../i18n'
import type { ProjectCategory } from '../../lib/types'

/**
 * Filtros por área. O filtro escolhido ganha um rabisco à mão em volta do nome,
 * como quem circula uma palavra com caneta: cada um com o seu traço (a forma
 * vem do nome do filtro), desenhado na hora em que você escolhe.
 */
type OptionId = ProjectCategory | 'all'
const props = defineProps<{ options: Array<{ id: OptionId; count: number }>; controls?: string }>()
const model = defineModel<OptionId>({ required: true })
const { locale } = useI18n()

/** Margem do desenho para fora do botão (o rabisco passa um pouco da borda). */
const MX = 9
const MY = 7

const sizes = reactive<Record<string, { w: number; h: number }>>({})
const buttons = new Map<string, HTMLElement>()
let observer: ResizeObserver | null = null

function track(id: string, el: unknown) {
  const node = el instanceof HTMLElement ? el : null
  const previous = buttons.get(id)
  if (previous === node) return
  if (previous) observer?.unobserve(previous)
  if (!node) {
    buttons.delete(id)
    return
  }
  buttons.set(id, node)
  observer?.observe(node)
  sizes[id] = { w: node.offsetWidth, h: node.offsetHeight }
}

onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const el = entry.target as HTMLElement
      const id = el.dataset.option
      if (id) sizes[id] = { w: el.offsetWidth, h: el.offsetHeight }
    }
  })
  for (const el of buttons.values()) observer.observe(el)
})
onBeforeUnmount(() => observer?.disconnect())
watch(locale, () => {
  for (const [id, el] of buttons) sizes[id] = { w: el.offsetWidth, h: el.offsetHeight }
})

/** Gerador pseudoaleatório estável (a mesma forma para o mesmo filtro). */
function random(seed: number) {
  let s = seed || 1
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/**
 * Uma volta e pouco em torno do texto, com o raio oscilando como a mão oscila,
 * terminando um pouco depois de onde começou (o traço não fecha certinho).
 */
function scribble(id: string, w: number, h: number): string {
  const rnd = random(hashOf(id))
  const cx = w / 2 + MX
  const cy = h / 2 + MY
  const rx = w / 2 + 3
  const ry = h / 2 - 3
  const start = (-172 + rnd() * 30) * (Math.PI / 180)
  // Uma volta e um pedaço: a caneta passa de novo por cima do começo, como na vida real.
  const sweep = (2 + 0.42 + rnd() * 0.16) * Math.PI
  const a1 = 0.04 + rnd() * 0.035
  const a2 = 0.025 + rnd() * 0.03
  const p1 = rnd() * Math.PI * 2
  const p2 = rnd() * Math.PI * 2
  const tilt = (rnd() - 0.5) * 0.08
  const steps = 34
  const points: Array<[number, number]> = []
  for (let i = 0; i <= steps; i++) {
    const k = i / steps
    const a = start + sweep * k
    // A volta abre um pouquinho no fim, como um espiral discreto.
    const grow = 0.98 + 0.11 * k + a1 * Math.sin(2 * a + p1) + a2 * Math.sin(3 * a + p2)
    const x = Math.cos(a) * rx * grow
    const y = Math.sin(a) * ry * grow
    points.push([cx + x - y * tilt, cy + y + x * tilt])
  }
  // Catmull-Rom → Bézier: curva lisa passando por todos os pontos.
  let d = `M ${points[0]![0].toFixed(1)} ${points[0]![1].toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!
    const p1p = points[i]!
    const p2p = points[i + 1]!
    const p3 = points[Math.min(points.length - 1, i + 2)]!
    const c1x = p1p[0] + (p2p[0] - p0[0]) / 6
    const c1y = p1p[1] + (p2p[1] - p0[1]) / 6
    const c2x = p2p[0] - (p3[0] - p1p[0]) / 6
    const c2y = p2p[1] - (p3[1] - p1p[1]) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2p[0].toFixed(1)} ${p2p[1].toFixed(1)}`
  }
  return d
}

const pathFor = (id: string) => {
  const size = sizes[id]
  return size && size.w ? scribble(id, size.w, size.h) : ''
}
const boxFor = (id: string) => {
  const size = sizes[id] ?? { w: 100, h: 44 }
  return `0 0 ${size.w + MX * 2} ${size.h + MY * 2}`
}
</script>

<template>
  <div class="filters" role="group" :aria-label="t('projects.filterLabel')">
    <button
      v-for="option in props.options"
      :key="option.id"
      :ref="(el) => track(option.id, el)"
      type="button"
      class="filters__option"
      :class="{ 'is-active': model === option.id }"
      :data-option="option.id"
      :aria-pressed="model === option.id"
      :aria-controls="props.controls"
      @click="model = option.id"
    >
      <svg class="filters__scribble" :viewBox="boxFor(option.id)" aria-hidden="true">
        <path v-if="pathFor(option.id)" :d="pathFor(option.id)" pathLength="1" />
      </svg>
      <span>{{ t(`projects.categories.${option.id}`) }}</span>
      <span class="filters__count">{{ formatNumber(option.count) }}</span>
    </button>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.55rem;
}

.filters__option {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  min-height: 2.75rem;
  padding: 0.6rem 0.95rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-size: var(--text-sm);
  color: var(--fg-2);
  transition: color var(--dur-quick);
}

/* O rabisco: passa um pouco das bordas do botão, como um círculo feito à caneta. */
.filters__scribble {
  position: absolute;
  inset: -7px -9px;
  width: calc(100% + 18px);
  max-width: none;
  height: calc(100% + 14px);
  overflow: visible;
  pointer-events: none;
  filter: drop-shadow(0 0 5px rgb(255 244 210 / 0.9));
}

.filters__scribble path {
  fill: none;
  stroke: #a5741e;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0;
  transition:
    stroke-dashoffset 0.55s cubic-bezier(0.55, 0.1, 0.3, 1),
    opacity 0.25s var(--ease-dream);
}

.filters__option:hover {
  color: var(--fg);
}

/* Passar o mouse esboça o rabisco, bem de leve. */
.filters__option:hover:not(.is-active) .filters__scribble path {
  stroke-dashoffset: 0;
  opacity: 0.28;
}

.filters__option.is-active {
  color: var(--fg);
  font-weight: 500;
}

.filters__option.is-active .filters__scribble path {
  stroke-dashoffset: 0;
  opacity: 0.9;
}

.filters__count {
  font-size: var(--text-xs);
  color: var(--fg-3);
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  .filters__scribble path {
    transition: opacity 0.01ms;
  }
}
</style>
