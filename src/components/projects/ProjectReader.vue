<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef } from 'vue'
import { platforms } from '../../content/platforms'
import { prefersReducedMotion } from '../../composables/motion'
import { loadReadme } from '../../composables/readme'
import { playSound } from '../../composables/sound'
import { t, useI18n, type MessageKey } from '../../i18n'
import type { Project, ProjectReadme } from '../../lib/types'

/**
 * Leitor de README dentro do portfólio.
 *
 * Abre como uma folha que nasce do card do projeto e se expande até ocupar a tela;
 * fecha voltando para o card. O texto vem pronto e sanitizado do build
 * (src/generated/readmes): aqui ele só é exibido.
 *
 *   - Esc, o botão de fechar, um clique fora da folha ou o "voltar" do navegador/celular fecham;
 *   - o foco vai para o texto (setas e espaço rolam) e volta para o botão que abriu;
 *   - links internos do README rolam dentro da folha; os externos abrem em nova aba;
 *   - estados de carregamento, erro (com "tentar de novo") e projeto sem README.
 */
const { locale } = useI18n()
const dialog = ref<HTMLDialogElement | null>(null)
const sheet = ref<HTMLElement | null>(null)
const body = ref<HTMLElement | null>(null)

const project = shallowRef<Project | null>(null)
const doc = shallowRef<ProjectReadme | null>(null)
const state = ref<'loading' | 'ready' | 'missing' | 'error'>('loading')
const closing = ref(false)
const activeHeading = ref<string | null>(null)

let trigger: HTMLElement | null = null
let pushedHistory = false
let spy: IntersectionObserver | null = null
let token = 0

const GITHUB_ICON = platforms.github.icon
const sourceUrl = computed(() => doc.value?.sourceUrl ?? project.value?.readmeUrl ?? project.value?.url ?? '#')

/** Sumário: os títulos principais, quando o README é longo o bastante para precisar. */
const toc = computed(() => {
  const headings = doc.value?.headings ?? []
  if (!headings.length) return []
  const top = Math.min(...headings.map((h) => h.depth))
  // O primeiro título costuma ser o nome do projeto: o sumário começa abaixo dele.
  const rest = headings[0]?.depth === top && headings.filter((h) => h.depth === top).length === 1 ? headings.slice(1) : headings
  const base = Math.min(...rest.map((h) => h.depth))
  const list = rest.filter((h) => h.depth <= base + 1)
  return list.length >= 3 ? list.map((h) => ({ ...h, level: h.depth - base })) : []
})

/** Aviso discreto quando o README está em outro idioma (ele aparece como foi escrito). */
const langNote = computed(() => {
  const lang = doc.value?.lang
  if (!lang || lang === locale.value) return ''
  return t(lang === 'en' ? 'reader.inEnglish' : 'reader.inPortuguese')
})

async function load(id: string) {
  const mine = ++token
  state.value = 'loading'
  doc.value = null
  try {
    const result = await loadReadme(id)
    if (mine !== token) return
    doc.value = result
    state.value = result ? 'ready' : 'missing'
    await nextTick()
    watchHeadings()
  } catch {
    if (mine !== token) return
    state.value = 'error'
  }
}

/** Retângulo do card que abriu, relativo à folha (para a folha nascer dele). */
function insetFrom(rect: DOMRect | null): string | null {
  const el = sheet.value
  if (!el || !rect) return null
  const box = el.getBoundingClientRect()
  const top = Math.max(0, rect.top - box.top)
  const left = Math.max(0, rect.left - box.left)
  const right = Math.max(0, box.right - rect.right)
  const bottom = Math.max(0, box.bottom - rect.bottom)
  if (top + bottom >= box.height || left + right >= box.width) return null
  return `inset(${top}px ${right}px ${bottom}px ${left}px round 10px)`
}

const cardRect = () => {
  const card = trigger?.closest('.card') as HTMLElement | null
  const rect = card?.getBoundingClientRect() ?? null
  if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) return null
  return rect
}

async function open(next: Project, from?: HTMLElement | null) {
  const el = dialog.value
  if (!el || el.open) return
  trigger = from ?? (document.activeElement as HTMLElement | null)
  project.value = next
  closing.value = false
  activeHeading.value = null
  document.documentElement.classList.add('is-reading')
  el.showModal()
  playSound('open')
  if (!pushedHistory) {
    history.pushState({ ...(history.state as object | null), reader: next.id }, '')
    pushedHistory = true
    window.addEventListener('popstate', onPopState)
  }
  void load(next.id)
  await nextTick()
  body.value?.scrollTo({ top: 0 })
  body.value?.focus({ preventScroll: true })

  const from_ = insetFrom(cardRect())
  if (!prefersReducedMotion.value && sheet.value) {
    sheet.value.animate(
      [
        { clipPath: from_ ?? 'inset(18% 22% 18% 22% round 18px)', opacity: from_ ? 1 : 0 },
        { clipPath: 'inset(0px 0px 0px 0px round 18px)', opacity: 1 },
      ],
      { duration: 560, easing: 'cubic-bezier(0.2, 0.7, 0.1, 1)' },
    )
  }
}

async function close(options: { fromHistory?: boolean } = {}) {
  const el = dialog.value
  if (!el?.open || closing.value) return
  closing.value = true
  playSound('close')
  stopWatchingHeadings()
  if (!prefersReducedMotion.value && sheet.value) {
    const to = insetFrom(cardRect())
    const animation = sheet.value.animate(
      [
        { clipPath: 'inset(0px 0px 0px 0px round 18px)', opacity: 1 },
        { clipPath: to ?? 'inset(30% 30% 30% 30% round 18px)', opacity: to ? 0.6 : 0 },
      ],
      { duration: 420, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' },
    )
    await animation.finished.catch(() => undefined)
    animation.cancel()
  }
  el.close()
  closing.value = false
  document.documentElement.classList.remove('is-reading')
  window.removeEventListener('popstate', onPopState)
  if (pushedHistory) {
    pushedHistory = false
    if (!options.fromHistory) history.back()
  }
  token++
  trigger?.focus({ preventScroll: true })
}

function onPopState() {
  if (dialog.value?.open) {
    pushedHistory = false
    void close({ fromHistory: true })
  }
}

/** Clique no fundo escurecido (fora da folha) fecha. */
function onDialogClick(event: MouseEvent) {
  if (event.target === dialog.value) void close()
}

/** Âncoras do README rolam dentro da folha, sem mexer no endereço da página. */
function onBodyClick(event: MouseEvent) {
  const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]')
  if (!link || !body.value) return
  const id = decodeURIComponent(link.getAttribute('href')?.slice(1) ?? '')
  const target = id ? body.value.querySelector<HTMLElement>(`#${CSS.escape(id)}`) : null
  event.preventDefault()
  if (!target) return
  target.scrollIntoView({ block: 'start', behavior: prefersReducedMotion.value ? 'auto' : 'smooth' })
  target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
}

/** Destaca no sumário o título que está sendo lido. */
function watchHeadings() {
  stopWatchingHeadings()
  if (!toc.value.length || !body.value || typeof IntersectionObserver === 'undefined') return
  spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) activeHeading.value = entry.target.id
    },
    { root: body.value, rootMargin: '0px 0px -70% 0px' },
  )
  for (const item of toc.value) {
    const el = body.value.querySelector(`#${CSS.escape(item.id)}`)
    if (el) spy.observe(el)
  }
}

function stopWatchingHeadings() {
  spy?.disconnect()
  spy = null
}

onBeforeUnmount(() => {
  stopWatchingHeadings()
  window.removeEventListener('popstate', onPopState)
  document.documentElement.classList.remove('is-reading')
})

defineExpose({ open, close })
</script>

<template>
  <dialog ref="dialog" class="reader theme-light" :class="{ 'is-closing': closing }" aria-labelledby="reader-title" @cancel.prevent="close()" @click="onDialogClick">
    <div v-if="project" ref="sheet" class="reader__sheet">
      <header class="reader__head">
        <div class="reader__titles">
          <p class="reader__file">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 15.5h6 M9 19h4" /></svg>
            <span>{{ project.id }}</span>
          </p>
          <h2 id="reader-title" class="reader__title">
            {{ project.title }}
            <span v-if="project.kind" class="reader__kind">{{ t(`projects.kinds.${project.kind}` as MessageKey) }}</span>
          </h2>
        </div>
        <div class="reader__actions">
          <a class="reader__github" :href="sourceUrl" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="GITHUB_ICON" /></svg>
            <span class="reader__github-label">{{ t('reader.openOnGitHub') }}</span>
            <span class="sr-only">{{ t('common.opensInNewTab') }}</span>
          </a>
          <button type="button" class="reader__close" @click="close()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            <span class="sr-only">{{ t('reader.close') }}</span>
          </button>
        </div>
      </header>

      <div
        ref="body"
        class="reader__body"
        :class="{ 'has-toc': toc.length && state === 'ready' }"
        tabindex="0"
        :aria-label="t('reader.regionLabel', { title: project.title })"
        @click="onBodyClick"
      >
        <nav v-if="toc.length && state === 'ready'" class="reader__toc" :aria-label="t('reader.contents')">
          <p class="reader__toc-title">{{ t('reader.contents') }}</p>
          <ol role="list">
            <li v-for="item in toc" :key="item.id" :class="`is-level-${item.level}`">
              <a :href="`#${item.id}`" :aria-current="activeHeading === item.id ? 'location' : undefined">{{ item.text }}</a>
            </li>
          </ol>
        </nav>

        <div class="reader__page">
          <div v-if="state === 'loading'" class="reader__skeleton" role="status">
            <span class="sr-only">{{ t('reader.loading') }}</span>
            <span v-for="n in 9" :key="n" class="reader__line" :style="{ '--w': `${[62, 94, 88, 97, 54, 90, 84, 70, 40][n - 1]}%` }" aria-hidden="true" />
          </div>

          <div v-else-if="state === 'error'" class="reader__state" role="alert">
            <p class="reader__state-title">{{ t('reader.errorTitle') }}</p>
            <p>{{ t('reader.errorBody') }}</p>
            <div class="reader__state-actions">
              <button type="button" class="action" @click="project && load(project.id)">{{ t('common.tryAgain') }}</button>
              <a class="action action--solid" :href="sourceUrl" target="_blank" rel="noopener noreferrer">
                {{ t('reader.openOnGitHub') }}<span class="sr-only"> {{ t('common.opensInNewTab') }}</span>
              </a>
            </div>
          </div>

          <div v-else-if="state === 'missing'" class="reader__state">
            <p class="reader__state-title">{{ t('reader.missingTitle') }}</p>
            <p>{{ t('reader.missingBody') }}</p>
            <div class="reader__state-actions">
              <a v-if="project.url" class="action action--solid" :href="project.url" target="_blank" rel="noopener noreferrer">
                {{ t('reader.openRepository') }}<span class="sr-only"> {{ t('common.opensInNewTab') }}</span>
              </a>
            </div>
          </div>

          <template v-else-if="doc">
            <p v-if="langNote" class="reader__note">{{ langNote }}</p>
            <!-- HTML sanitizado no build (scripts/lib/readme.ts): sem scripts, eventos ou estilos. -->
            <article class="md" :lang="doc.lang ?? undefined" v-html="doc.html" />
          </template>
        </div>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
/* A folha ocupa quase a tela toda; o fundo da página fica velado, como num sonho. */
.reader {
  width: 100%;
  max-width: none;
  height: 100%;
  max-height: none;
  margin: 0;
  padding: clamp(0.5rem, 0.2rem + 1.6vw, 2rem);
  border: 0;
  background: transparent;
  overflow: hidden;
}

.reader[open] {
  display: grid;
  place-items: center;
}

.reader::backdrop {
  background:
    radial-gradient(80% 70% at 50% 40%, rgb(255 246 222 / 0.55), transparent 70%),
    rgb(64 48 22 / 0.42);
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  animation: veil-in 0.45s var(--ease-dream) both;
}

.reader.is-closing::backdrop {
  animation: veil-out 0.42s var(--ease-dream) both;
}

.reader__sheet {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(100%, 72rem);
  height: min(100%, 60rem);
  border-radius: 18px;
  background:
    radial-gradient(120% 60% at 85% 0%, rgb(255 244 214 / 0.8), transparent 60%),
    linear-gradient(180deg, #fffcf3, #fbf5e6);
  box-shadow:
    0 0 0 1px rgb(255 252 240 / 0.95),
    0 40px 90px -30px rgb(60 40 10 / 0.6),
    0 0 60px rgb(255 240 200 / 0.35);
  overflow: hidden;
}

/* Cabeçalho */
.reader__head {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem clamp(1rem, 0.6rem + 1.6vw, 1.75rem) 0.9rem;
  border-bottom: 1px solid rgb(120 92 40 / 0.12);
  background: linear-gradient(180deg, rgb(255 252 243 / 0.95), rgb(255 251 240 / 0.85));
}

.reader__titles {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
  flex: 1;
}

.reader__file {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: var(--text-xs);
  color: var(--fg-3);
}

.reader__file svg {
  width: 0.95rem;
  height: 0.95rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.reader__title {
  overflow: hidden;
  font-size: clamp(1.4rem, 1.1rem + 1.2vw, 2.1rem);
  font-weight: 300;
  line-height: 1.1;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* O tipo do projeto, como no card. */
.reader__kind {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.3rem 0.55rem 0.26rem;
  border-radius: 4px;
  background: #efe5cc;
  box-shadow: inset 0 0 0 1px rgb(60 44 14 / 0.12);
  font-family: var(--font-display);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.16em;
  vertical-align: 0.4em;
  color: #5a4517;
}

.reader__actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.reader__github {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.75rem;
  padding: 0 1rem;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  font-size: var(--text-sm);
  color: var(--fg);
  text-decoration: none;
  transition:
    background-color var(--dur-quick),
    box-shadow var(--dur-soft);
}

.reader__github:hover {
  background: #fffdf6;
  box-shadow: 0 0 18px rgb(255 247 220 / 0.9);
}

.reader__github svg {
  width: 1.05rem;
  height: 1.05rem;
  fill: currentColor;
}

.reader__close {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 0;
  border-radius: 50%;
  background: rgb(120 92 40 / 0.07);
  color: var(--fg);
  transition:
    background-color var(--dur-quick),
    rotate var(--dur-soft) var(--ease-surface);
}

.reader__close:hover {
  background: rgb(120 92 40 / 0.14);
  rotate: 90deg;
}

.reader__close svg {
  width: 1.2rem;
  height: 1.2rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
}

/* Corpo: sumário à esquerda, página de leitura no centro. */
.reader__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-content: center;
  overflow: auto;
  overscroll-behavior: contain;
  scroll-padding-top: 1.5rem;
  padding: clamp(1.25rem, 0.8rem + 2vw, 2.5rem) clamp(1rem, 0.6rem + 2.4vw, 3rem) 4rem;
  outline: none;
}

.reader__body:focus-visible {
  box-shadow: inset 0 0 0 2px var(--ink);
}

.reader__body.has-toc {
  grid-template-columns: minmax(10rem, 14rem) minmax(0, 46rem);
  gap: clamp(1.5rem, 1rem + 2vw, 3.5rem);
}

.reader__page {
  width: 100%;
  max-width: 46rem;
  margin-inline: auto;
  min-width: 0;
}

.reader__toc {
  position: sticky;
  top: 0;
  align-self: start;
  max-height: calc(100% - 1rem);
  overflow: auto;
  font-size: var(--text-sm);
}

.reader__toc-title {
  margin-bottom: 0.6rem;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--fg-3);
}

.reader__toc ol {
  display: grid;
  gap: 0.15rem;
  padding: 0;
  margin: 0;
  list-style: none;
  border-left: 1px solid rgb(120 92 40 / 0.16);
}

.reader__toc a {
  display: block;
  padding: 0.3rem 0.6rem 0.3rem 0.85rem;
  margin-left: -1px;
  border-left: 2px solid transparent;
  color: var(--fg-2);
  line-height: 1.35;
  text-decoration: none;
  transition:
    color var(--dur-quick),
    border-color var(--dur-quick);
}

.reader__toc .is-level-1 a {
  padding-left: 1.6rem;
  font-size: var(--text-xs);
}

.reader__toc a:hover,
.reader__toc a[aria-current] {
  color: var(--fg);
  border-left-color: #c79a2e;
}

.reader__note {
  margin-bottom: 1.5rem;
  padding: 0.6rem 0.9rem;
  border-radius: 10px;
  background: rgb(233 208 85 / 0.14);
  font-size: var(--text-sm);
  color: var(--fg-2);
}

/* Carregando: linhas de texto que ainda estão se revelando. */
.reader__skeleton {
  display: grid;
  gap: 0.85rem;
  padding-top: 0.5rem;
}

.reader__line {
  display: block;
  width: var(--w);
  height: 0.9rem;
  border-radius: 6px;
  background: linear-gradient(90deg, rgb(120 92 40 / 0.08), rgb(255 250 230 / 0.9), rgb(120 92 40 / 0.08));
  background-size: 300% 100%;
  animation: develop 1.6s var(--ease-in-out) infinite;
}

.reader__line:first-of-type {
  height: 1.8rem;
  margin-bottom: 0.6rem;
}

.reader__state {
  display: grid;
  justify-items: start;
  gap: 0.6rem;
  max-width: 34rem;
  padding: 1.5rem 0;
  font-family: var(--font-prose);
  font-size: var(--text-prose);
  color: var(--fg-2);
}

.reader__state-title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--fg);
}

.reader__state-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.6rem;
}

@keyframes develop {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: 0 0;
  }
}

@keyframes veil-in {
  from {
    opacity: 0;
  }
}

@keyframes veil-out {
  to {
    opacity: 0;
  }
}

@media (max-width: 860px) {
  .reader__body.has-toc {
    grid-template-columns: minmax(0, 1fr);
  }

  .reader__toc {
    display: none;
  }
}

@media (max-width: 640px) {
  .reader {
    padding: 0;
  }

  .reader__sheet {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }

  .reader__github {
    width: 2.75rem;
    padding: 0;
    justify-content: center;
  }

  .reader__github-label {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .reader__line {
    animation: none;
  }
}
</style>

<style>
/* Página aberta no leitor: a página de trás não rola. */
html.is-reading {
  overflow: hidden;
}

/*
 * Tipografia do README: conteúdo técnico, então legibilidade primeiro.
 * Os títulos guardam a hierarquia original (md-h1…md-h6), mesmo com os níveis
 * semânticos deslocados para baixo do título do leitor.
 */
.md {
  font-family: var(--font-prose);
  font-size: 1.06rem;
  line-height: 1.72;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.md > :first-child {
  margin-top: 0;
}

.md :is(h3, h4, h5, h6) {
  margin: 2.2em 0 0.7em;
  font-family: var(--font-display);
  font-weight: 400;
  line-height: 1.2;
  color: var(--ink);
  scroll-margin-top: 1rem;
}

.md .md-h1 {
  padding-bottom: 0.3em;
  border-bottom: 1px solid rgb(120 92 40 / 0.14);
  font-size: 2rem;
  font-weight: 300;
}

.md .md-h2 {
  padding-bottom: 0.35em;
  border-bottom: 1px solid rgb(120 92 40 / 0.14);
  font-size: 1.5rem;
}

.md .md-h3 {
  font-size: 1.22rem;
  font-weight: 500;
}

.md :is(.md-h4, .md-h5, .md-h6) {
  font-size: 1.05rem;
  font-weight: 500;
}

.md p,
.md ul,
.md ol,
.md blockquote,
.md pre,
.md .md-table,
.md details,
.md dl {
  margin: 0 0 1.1em;
}

.md ul,
.md ol {
  padding-left: 1.4em;
}

.md li + li {
  margin-top: 0.3em;
}

.md li > ul,
.md li > ol {
  margin: 0.3em 0 0;
}

.md .task-list-item {
  list-style: none;
  margin-left: -1.3em;
}

.md input[type='checkbox'] {
  margin-right: 0.45em;
  accent-color: #b98420;
}

.md a {
  color: #7a4a10;
  text-decoration: underline;
  text-decoration-color: rgb(185 132 32 / 0.45);
  text-underline-offset: 0.2em;
}

.md a:hover {
  text-decoration-color: currentColor;
}

.md strong {
  font-weight: 600;
}

/*
 * Imagens como no GitHub: em linha com o texto (o estilo global do site deixa imagens em
 * bloco, o que impedia o centro de <p align="center"> e empilhava os selos lado a lado).
 * Nunca passam da largura do texto e mantêm a proporção.
 */
.md img {
  display: inline;
  box-sizing: content-box;
  max-width: 100%;
  height: auto;
}

.md picture {
  display: inline;
}

.md img[align='right'] {
  float: right;
  padding-left: 1.25rem;
}

.md img[align='left'] {
  float: left;
  padding-right: 1.25rem;
}

.md hr {
  height: 1px;
  margin: 2.2em 0;
  border: 0;
  background: linear-gradient(90deg, transparent, rgb(120 92 40 / 0.3), transparent);
}

.md blockquote {
  padding: 0.6em 1.1em;
  border-left: 3px solid rgb(199 154 46 / 0.6);
  border-radius: 0 8px 8px 0;
  background: rgb(233 208 85 / 0.08);
  color: var(--ink-2);
}

.md blockquote > :last-child {
  margin-bottom: 0;
}

.md .md-alert {
  border-left-color: #7d6da3;
  background: rgb(169 140 187 / 0.12);
}

.md .md-alert--tip {
  border-left-color: #4b8f5a;
  background: rgb(109 199 104 / 0.1);
}

.md :is(.md-alert--warning, .md-alert--caution) {
  border-left-color: #c0612b;
  background: rgb(240 160 126 / 0.14);
}

.md .md-alert__title {
  margin-bottom: 0.3em;
  font-family: var(--font-display);
  font-size: 0.92rem;
  font-weight: 500;
}

.md code,
.md kbd {
  font-family: ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, 'Liberation Mono', monospace;
  font-size: 0.86em;
}

.md :not(pre) > code {
  padding: 0.12em 0.4em;
  border-radius: 5px;
  background: rgb(120 92 40 / 0.09);
}

.md kbd {
  padding: 0.1em 0.45em;
  border: 1px solid rgb(120 92 40 / 0.25);
  border-bottom-width: 2px;
  border-radius: 5px;
  background: #fffdf6;
}

.md pre {
  overflow: auto;
  padding: 1em 1.2em;
  border-radius: 10px;
  background: #2b2418;
  color: #f6edd8;
  line-height: 1.55;
  tab-size: 2;
}

.md pre:focus-visible,
.md .md-table:focus-visible {
  outline: 2px solid #c79a2e;
  outline-offset: 2px;
}

.md pre code {
  font-size: 0.86rem;
  white-space: pre;
}

/* Tabelas: do tamanho do conteúdo (como no GitHub) e rolam de lado em telas pequenas. */
.md .md-table {
  width: fit-content;
  max-width: 100%;
  overflow-x: auto;
  border-radius: 10px;
  box-shadow: 0 0 0 1px rgb(120 92 40 / 0.16);
}

.md .md-table--center {
  margin-inline: auto;
}

.md .md-table--right {
  margin-left: auto;
}

.md table {
  width: auto;
  border-collapse: collapse;
  font-family: var(--font-display);
  font-size: 0.92rem;
  line-height: 1.45;
}

.md th,
.md td {
  min-width: 4.5rem;
  padding: 0.55em 0.8em;
  overflow-wrap: normal;
  word-break: normal;
  border-bottom: 1px solid rgb(120 92 40 / 0.12);
  text-align: left;
  vertical-align: top;
}

.md th {
  background: rgb(233 208 85 / 0.12);
  font-weight: 500;
}

.md tr:last-child td {
  border-bottom: 0;
}

.md :is(th, td)[align='center'] {
  text-align: center;
}

.md :is(th, td)[align='right'] {
  text-align: right;
}

.md details {
  padding: 0.6em 1em;
  border-radius: 10px;
  background: rgb(120 92 40 / 0.05);
}

.md summary {
  cursor: pointer;
  font-family: var(--font-display);
  font-weight: 500;
}

/* Alinhamento pedido no próprio README (align="…" em p, div, títulos, células). */
.md [align='center'] {
  text-align: center;
}

.md [align='right'] {
  text-align: right;
}

.md [align='left'] {
  text-align: left;
}

.md [align='justify'] {
  text-align: justify;
}

.md::after {
  content: '';
  display: block;
  clear: both;
}
</style>
