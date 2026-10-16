<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { site } from '../../content/site'
import { categoryCounts, loadProjects, useProjects } from '../../composables/projects'
import { morphHeight } from '../../composables/morph'
import { useScene } from '../../composables/scene'
import { playSound } from '../../composables/sound'
import { formatDate, t, tp } from '../../i18n'
import type { ProjectCategory } from '../../lib/types'
import AfternoonLight from '../atmosphere/AfternoonLight.vue'
import ProjectCard from './ProjectCard.vue'
import ProjectFilters from './ProjectFilters.vue'
import ProjectReader from './ProjectReader.vue'

/**
 * Galeria de projetos: todos os repositórios públicos, sempre na ordem em que
 * foram criados (do mais antigo para o mais recente), em cards do mesmo tamanho.
 * Começa com algumas fileiras; "Mostrar mais" abre o resto e "Mostrar menos" recolhe,
 * com a altura animada e a página acompanhando, sem saltos.
 */
const { status, snapshot, projects } = useProjects()
const filter = ref<ProjectCategory | 'all'>('all')
const expanded = ref(false)
const root = ref<HTMLElement | null>(null)
const gallery = ref<HTMLElement | null>(null)
const toggleButton = ref<HTMLButtonElement | null>(null)
const animating = ref(false)
const announcement = ref('')

useScene(root)

/* Colunas da galeria (iguais às do CSS) → quantos cards aparecem antes do "Mostrar mais". */
const columns = ref(3)
let wideQuery: MediaQueryList | null = null
let midQuery: MediaQueryList | null = null
const updateColumns = () => {
  columns.value = wideQuery?.matches ? 3 : midQuery?.matches ? 2 : 1
}
onMounted(() => {
  wideQuery = window.matchMedia('(min-width: 1040px)')
  midQuery = window.matchMedia('(min-width: 640px)')
  updateColumns()
  wideQuery.addEventListener('change', updateColumns)
  midQuery.addEventListener('change', updateColumns)
  void loadProjects()
})
onBeforeUnmount(() => {
  wideQuery?.removeEventListener('change', updateColumns)
  midQuery?.removeEventListener('change', updateColumns)
})
const initialCount = computed(() => (columns.value === 3 ? 6 : columns.value === 2 ? 4 : 3))

const options = computed(() => categoryCounts(projects.value))
const filtered = computed(() => (filter.value === 'all' ? projects.value : projects.value.filter((p) => p.categories.includes(filter.value as ProjectCategory))))
const visible = computed(() => (expanded.value ? filtered.value : filtered.value.slice(0, initialCount.value)))
const hiddenCount = computed(() => filtered.value.length - Math.min(filtered.value.length, initialCount.value))
const canToggle = computed(() => filtered.value.length > initialCount.value)

/** Atraso de entrada: cards da mesma fileira surgem um depois do outro. */
const delayOf = (index: number) => (index % columns.value) * 110

/** Altura da galeria mostrando só os primeiros `count` cards. */
function heightUntil(count: number): number {
  const el = gallery.value
  if (!el) return 0
  const cards = [...el.children] as HTMLElement[]
  const last = cards[Math.min(count, cards.length) - 1]
  if (!last) return 0
  return last.getBoundingClientRect().bottom - el.getBoundingClientRect().top
}

async function morph(change: () => void, shrinking = false) {
  animating.value = true
  try {
    await morphHeight(gallery.value, change, shrinking ? { anchor: toggleButton.value, shrinkTo: () => heightUntil(initialCount.value) } : {})
  } finally {
    animating.value = false
  }
}

const reader = ref<InstanceType<typeof ProjectReader> | null>(null)

async function toggle() {
  const opening = !expanded.value
  playSound('rustle')
  await morph(() => (expanded.value = opening), !opening)
  announcement.value = opening
    ? t('projects.showingAll', { count: filtered.value.length })
    : t('projects.showingSome', { count: Math.min(initialCount.value, filtered.value.length), total: filtered.value.length })
}

/* Trocar de filtro também anima a altura e volta à visão inicial. */
function chooseFilter(next: ProjectCategory | 'all') {
  if (next === filter.value) return
  playSound('scribble')
  void morph(() => {
    filter.value = next
    expanded.value = false
  })
}

const countLabel = computed(() => tp('projects.results', filtered.value.length))
</script>

<template>
  <section id="projetos" ref="root" class="projects theme-light" aria-labelledby="projects-title">
    <AfternoonLight />
    <div class="wrap projects__inner">
      <header class="projects__head">
        <h2 id="projects-title" v-reveal class="display projects__title">{{ t('projects.title') }}</h2>
        <div class="projects__intro">
          <p class="projects__lead">{{ t('projects.lead') }}</p>
          <p v-if="snapshot" class="projects__meta">
            {{ t('projects.meta', { date: formatDate(snapshot.generatedAt, 'day') }) }}
          </p>
        </div>
      </header>

      <div v-if="status === 'loading' || status === 'idle'" class="projects__state" role="status">
        <span class="projects__spinner" aria-hidden="true" />
        {{ t('projects.loading') }}
      </div>

      <div v-else-if="status === 'error' || !projects.length" class="projects__state projects__state--error" role="alert">
        <p class="projects__state-title">{{ t('projects.errorTitle') }}</p>
        <p>{{ t('projects.errorBody') }}</p>
        <div class="projects__state-actions">
          <button v-if="status === 'error'" type="button" class="action" @click="loadProjects">{{ t('common.tryAgain') }}</button>
          <a class="action action--solid" :href="`https://github.com/${site.githubUser}?tab=repositories`" target="_blank" rel="noopener noreferrer">
            {{ t('projects.errorProfile') }}<span class="sr-only">{{ t('common.opensInNewTab') }}</span>
          </a>
        </div>
      </div>

      <template v-else>
        <div class="projects__toolbar">
          <ProjectFilters :model-value="filter" :options="options" controls="project-gallery" @update:model-value="chooseFilter" />
          <p class="projects__count" aria-live="polite">{{ countLabel }}</p>
        </div>

        <ul id="project-gallery" ref="gallery" role="list" class="gallery" :class="{ 'is-animating': animating }">
          <li v-for="(project, i) in visible" :key="project.id" class="gallery__item">
            <ProjectCard v-reveal="delayOf(i)" :project="project" @read="(event) => reader?.open(project, event.currentTarget as HTMLElement)" />
          </li>
        </ul>

        <div v-if="canToggle" class="projects__more">
          <button
            ref="toggleButton"
            type="button"
            class="more"
            :aria-expanded="expanded"
            aria-controls="project-gallery"
            :disabled="animating"
            @click="toggle"
          >
            <span class="more__thread" aria-hidden="true" />
            <span class="more__label">{{ expanded ? t('projects.showLess') : tp('projects.showMore', hiddenCount) }}</span>
            <svg class="more__icon" :class="{ 'is-up': expanded }" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5 12 15.5 18 9.5" /></svg>
          </button>
        </div>
        <p class="sr-only" aria-live="polite">{{ announcement }}</p>
        <ProjectReader ref="reader" />
      </template>
    </div>
  </section>
</template>

<style scoped>
.projects {
  position: relative;
  padding-block: clamp(5rem, 3rem + 7vw, 9rem) var(--section-pad);
}

.projects__inner {
  position: relative;
  display: grid;
  gap: clamp(1.75rem, 1.25rem + 1.5vw, 2.75rem);
}

.projects__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 26rem);
  align-items: end;
  gap: 1.5rem 3rem;
}

.projects__intro {
  display: grid;
  gap: 0.55rem;
}

.projects__lead {
  font-family: var(--font-prose);
  font-size: var(--text-prose);
  line-height: 1.55;
  text-wrap: pretty;
}

.projects__meta {
  font-size: var(--text-xs);
  color: var(--fg-3);
}

/* Títulos de seção "entram em foco", como uma lembrança. */
.projects__title {
  /* Elemento visual da seção: as letras não são selecionáveis ao arrastar o mouse. */
  -webkit-user-select: none;
  user-select: none;
  transition:
    opacity 1.2s var(--ease-dream),
    filter 1.4s var(--ease-dream),
    letter-spacing 1.6s var(--ease-surface);
}

.projects__title[data-reveal]:not([data-revealed]) {
  opacity: 0;
  filter: blur(10px);
  letter-spacing: 0.06em;
}

.projects__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line);
}

.projects__count {
  font-size: var(--text-sm);
  color: var(--fg-2);
  font-variant-numeric: tabular-nums;
}

/* Galeria */
.gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: 1fr;
  gap: clamp(1.25rem, 0.8rem + 1.4vw, 2.25rem);
  overflow-anchor: none;
}

.gallery.is-animating {
  pointer-events: none;
}

.gallery__item {
  min-width: 0;
}

/* Botão "Mostrar mais / menos": um fio que puxa o resto da galeria. */
.projects__more {
  display: grid;
  justify-items: center;
  margin-top: 0.5rem;
}

.more {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 3rem;
  padding: 0.6rem 1.4rem;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: rgb(255 253 244 / 0.6);
  font-size: var(--text-sm);
  font-weight: 450;
  color: var(--fg);
  transition:
    background-color var(--dur-quick),
    border-color var(--dur-quick),
    box-shadow var(--dur-soft) var(--ease-dream);
}

.more:hover {
  border-color: var(--fg);
  background: rgb(255 253 244 / 0.95);
  box-shadow: 0 0 26px rgb(255 247 222 / 0.95);
}

.more:disabled {
  cursor: progress;
}

.more__thread {
  position: absolute;
  left: 50%;
  bottom: 100%;
  width: 1px;
  height: 2.25rem;
  background: linear-gradient(180deg, transparent, var(--line-strong));
}

.more__icon {
  width: 1.1rem;
  height: 1.1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: rotate var(--dur-soft) var(--ease-surface);
}

.more__icon.is-up {
  rotate: 180deg;
}

/* Estados */
.projects__state {
  display: grid;
  justify-items: start;
  gap: 0.75rem;
  padding: 2.5rem 0;
  color: var(--fg-2);
}

.projects__state--error .projects__state-title {
  font-size: var(--text-lg);
  color: var(--fg);
}

.projects__state-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.projects__spinner {
  display: inline-block;
  width: 3rem;
  height: 1rem;
  margin-right: 0.75rem;
  vertical-align: middle;
  border-radius: 50%;
  border: 1.5px solid var(--ink-3);
  box-shadow: 0 0 12px var(--halo);
  animation: spinner 1.4s var(--ease-dream) infinite alternate;
}

@keyframes spinner {
  to {
    opacity: 0.35;
    scale: 1.2 0.9;
  }
}

@media (max-width: 1039px) {
  .gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .projects__head {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .gallery {
    grid-template-columns: minmax(0, 1fr);
    grid-auto-rows: auto;
  }
}
</style>
