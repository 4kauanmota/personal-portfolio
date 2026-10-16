<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { platforms } from '../../content/platforms'
import { prefersReducedMotion } from '../../composables/motion'
import { imageFor } from '../../composables/projects'
import { formatDate, t, useI18n, type MessageKey } from '../../i18n'
import type { Project } from '../../lib/types'
import ProjectArt from './ProjectArt.vue'
import ProjectLoading from './ProjectLoading.vue'

/**
 * Um projeto como uma fotografia: a imagem (própria ou a genérica do site),
 * a data de criação carimbada no canto, o nome com o tipo do projeto (WEB, APP, JOGO…),
 * a descrição no idioma do site e os caminhos: o repositório, o site publicado
 * e o README, lido aqui mesmo no portfólio.
 * Todos os cards têm o mesmo tamanho, com ou sem imagem ou descrição.
 *
 * Ao passar o mouse, o card sobe um pouco, uma luz acompanha o ponteiro e a imagem
 * se desloca devagar no sentido contrário, como uma foto com profundidade. Quem
 * recebe o mouse é a moldura (o <article>), que nunca sai do lugar: só o conteúdo
 * sobe. Assim o hover não pisca nas bordas e os botões continuam fáceis de clicar.
 * Com o teclado, o foco visível em qualquer botão dá o mesmo destaque, sem depender do ponteiro.
 */
const props = defineProps<{ project: Project }>()
/** "Ler README": quem abre o leitor é a seção (um leitor só para todos os cards). */
const emit = defineEmits<{ read: [event: MouseEvent] }>()
const { locale } = useI18n()

const root = ref<HTMLElement | null>(null)
const imgEl = ref<HTMLImageElement | null>(null)
const image = computed(() => imageFor(props.project))
const failed = ref(false)
const loaded = ref(false)
/** Demorou demais: a arte do site entra no lugar (a imagem ainda aparece se chegar depois). */
const stalled = ref(false)
const showImage = computed(() => Boolean(image.value) && !failed.value)
/** O céu de carregamento só existe enquanto a imagem está a caminho. */
const loading = computed(() => showImage.value && !loaded.value && !stalled.value)

/*
 * Imagens carregam sob demanda (loading="lazy"): o tempo limite só começa a contar quando
 * o card chega perto da tela, que é quando o navegador começa a baixar a imagem.
 */
const STALL_MS = 20000
let stallTimer = 0
let nearObserver: IntersectionObserver | null = null
function settle() {
  window.clearTimeout(stallTimer)
  nearObserver?.disconnect()
  nearObserver = null
}
function onLoad() {
  loaded.value = true
  settle()
}
function onError() {
  failed.value = true
  settle()
}
onMounted(() => {
  const img = imgEl.value
  // Já estava no cache e carregou antes de o Vue ouvir o evento.
  if (img?.complete && img.naturalWidth > 0) return onLoad()
  if (!img || !root.value || typeof IntersectionObserver === 'undefined') return
  nearObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      nearObserver?.disconnect()
      nearObserver = null
      stallTimer = window.setTimeout(() => {
        if (!loaded.value && !failed.value) stalled.value = true
      }, STALL_MS)
    },
    { rootMargin: '400px 0px' },
  )
  nearObserver.observe(root.value)
})
/** Imagens quase quadradas (logos, ícones) aparecem inteiras sobre a arte genérica. */
const contained = computed(() => {
  const img = image.value
  return Boolean(img?.width && img.height && img.width / img.height < 1.3)
})

const created = computed(() => new Date(props.project.createdAt))
/** Carimbo de data como nas câmeras de filme: 'AA MM DD. */
const stamp = computed(() => {
  const d = created.value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `'${pad(d.getFullYear() % 100)} ${pad(d.getMonth() + 1)} ${pad(d.getDate())}`
})
const createdLabel = computed(() => {
  void locale.value
  return t('projects.card.created', { date: formatDate(props.project.createdAt, 'day') })
})

/** Tipo do projeto ao lado do nome: WEB, APP, JOGO (GAME), CLI… */
const kindLabel = computed(() => {
  void locale.value
  return props.project.kind ? t(`projects.kinds.${props.project.kind}` as MessageKey) : ''
})
const fullTitle = computed(() => (kindLabel.value ? `${props.project.title} (${kindLabel.value})` : props.project.title))

/** Descrição no idioma do site (escrita no portfólio, não vem do GitHub). */
const description = computed(() => props.project.description?.[locale.value] ?? '')

/** Linha discreta sob o nome: o repositório, ou de onde é o projeto. */
const subline = computed(() => {
  const p = props.project
  if (p.source === 'github') return p.id
  if (p.private) return ''
  const shown = p.url ?? p.liveUrl
  if (!shown) return ''
  const { hostname, pathname } = new URL(shown)
  return `${hostname.replace(/^www\./, '')}${pathname === '/' ? '' : pathname.replace(/\/$/, '')}`
})

const onGitHub = computed(() => {
  const url = props.project.url
  return Boolean(url && /^https:\/\/(www\.)?github\.com\//i.test(url))
})

const liveLabel = computed<MessageKey>(() =>
  props.project.liveKind === 'package' ? 'projects.card.package' : props.project.liveKind === 'media' ? 'projects.card.media' : 'projects.card.site',
)
const GITHUB_ICON = platforms.github.icon

/* Ponteiro sobre o card → --mx e --my de -1 a 1 (o CSS faz o resto). Uma escrita por quadro. */
let frame = 0
let next = { x: 0, y: 0 }
const clamp = (v: number) => Math.min(1, Math.max(-1, v))

function paint() {
  frame = 0
  root.value?.style.setProperty('--mx', next.x.toFixed(3))
  root.value?.style.setProperty('--my', next.y.toFixed(3))
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerType === 'touch' || prefersReducedMotion.value || !root.value) return
  const r = root.value.getBoundingClientRect()
  next = { x: clamp(((event.clientX - r.left) / r.width) * 2 - 1), y: clamp(((event.clientY - r.top) / r.height) * 2 - 1) }
  if (!frame) frame = requestAnimationFrame(paint)
}

function onPointerLeave() {
  next = { x: 0, y: 0 }
  if (!frame) frame = requestAnimationFrame(paint)
}

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  settle()
})
</script>

<template>
  <article
    ref="root"
    class="card"
    :class="{ 'is-loaded': loaded || !showImage, 'is-private': project.private }"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <div class="card__lift">
      <span class="card__glow" aria-hidden="true" />

      <div class="card__photo" :class="{ 'card__photo--contain': showImage && contained }" :aria-busy="loading ? 'true' : undefined">
        <div class="card__depth">
          <ProjectArt v-if="!showImage || contained || stalled" :project="project" />
          <img
            v-if="showImage && image"
            ref="imgEl"
            class="card__img"
            :src="image.src"
            :width="image.width ?? undefined"
            :height="image.height ?? undefined"
            :alt="t('projects.card.imageAlt', { title: project.title })"
            loading="lazy"
            decoding="async"
            @load="onLoad"
            @error="onError"
          />
        </div>
        <Transition>
          <ProjectLoading v-if="loading" :seed="project.id" />
        </Transition>
        <span v-if="(!showImage || contained || stalled) && project.language" class="card__lang" aria-hidden="true">{{ project.language }}</span>
        <span class="card__light" aria-hidden="true" />
        <span class="card__sheen" aria-hidden="true" />
        <time class="card__stamp" :datetime="project.createdAt" :title="createdLabel">
          <span aria-hidden="true">{{ stamp }}</span>
          <span class="sr-only">{{ createdLabel }}</span>
        </time>
        <a v-if="project.liveUrl" class="card__live" :href="project.liveUrl" target="_blank" rel="noopener noreferrer">
          {{ t(liveLabel) }}
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
          <span class="sr-only">{{ project.title }}, {{ t('common.opensInNewTab') }}</span>
        </a>
      </div>

      <div class="card__body">
        <h3 class="card__title" :title="fullTitle">
          <span class="card__name">{{ project.title }}</span>{{ ' ' }}<span v-if="kindLabel" class="card__kind" :data-kind="project.kind">{{ kindLabel }}</span>
        </h3>
        <p class="card__repo">{{ subline }}</p>
        <p class="card__desc" :lang="description ? locale : undefined">{{ description }}</p>
      </div>

      <div class="card__actions">
        <a v-if="project.url" class="card__btn" :href="project.url" target="_blank" rel="noopener noreferrer">
          <svg v-if="onGitHub" viewBox="0 0 24 24" aria-hidden="true" class="card__gh"><path :d="GITHUB_ICON" /></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true" class="card__code"><path d="m8.5 7.5-5 4.5 5 4.5M15.5 7.5l5 4.5-5 4.5" /></svg>
          <span>{{ onGitHub ? 'GitHub' : t('projects.card.code') }}</span>
          <span class="sr-only">
            {{ t(onGitHub ? 'projects.card.repositoryOf' : 'projects.card.repositoryAt', { title: project.title }) }}, {{ t('common.opensInNewTab') }}
          </span>
        </a>
        <span v-else-if="project.private" class="card__private" :title="t('projects.card.privateNote')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>
          <span>{{ t('projects.card.private') }}</span>
          <span class="sr-only">. {{ t('projects.card.privateNote') }}</span>
        </span>
        <button v-if="project.readmeUrl" type="button" class="card__btn card__btn--quiet" aria-haspopup="dialog" @click="emit('read', $event)">
          <span>{{ t('projects.card.readme') }}</span>
          <span class="sr-only">: {{ project.title }}</span>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
/*
 * A moldura (.card) recebe o mouse e nunca se move; o conteúdo (.card__lift) é que sobe.
 * --mx e --my (de -1 a 1) dizem onde está o ponteiro; 0 é o centro e o estado parado.
 */
.card {
  --card-pad: clamp(0.9rem, 0.7rem + 0.6vw, 1.15rem);
  --mx: 0;
  --my: 0;
  position: relative;
  height: 100%;
}

.card__lift {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  border-radius: 10px;
  background: rgb(255 252 244 / 0.72);
  box-shadow:
    0 0 0 1px rgb(255 252 240 / 0.9),
    0 1px 0 1px rgb(120 92 40 / 0.08),
    0 18px 40px -26px rgb(94 66 22 / 0.45);
  transition:
    translate 0.7s var(--ease-surface),
    box-shadow 0.7s var(--ease-dream);
}

/* Luz que acompanha o ponteiro pela superfície do card (atrás do texto). */
.card__glow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    circle at calc(50% + var(--mx) * 50%) calc(45% + var(--my) * 55%),
    rgb(255 252 238 / 0.95),
    rgb(255 246 222 / 0.4) 32%,
    transparent 66%
  );
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.7s var(--ease-dream);
}

.card__photo,
.card__body,
.card__actions {
  position: relative;
}

/*
 * Teclado: o foco visível em qualquer botão do card dá o mesmo destaque do mouse.
 * Só o foco de teclado (:focus-visible): quando o leitor de README fecha com um clique,
 * o foco volta ao botão sem deixar o card "preso" levantado.
 */
.card:has(:focus-visible) .card__lift {
  box-shadow:
    0 0 0 1px rgb(255 252 240 / 1),
    0 1px 0 1px rgb(120 92 40 / 0.08),
    0 30px 52px -26px rgb(94 66 22 / 0.55),
    0 0 36px rgb(255 247 222 / 0.65);
}

.card:has(:focus-visible) .card__glow {
  opacity: 0.8;
}

@media (hover: hover) {
  .card:hover .card__lift {
    box-shadow:
      0 0 0 1px rgb(255 252 240 / 1),
      0 1px 0 1px rgb(120 92 40 / 0.08),
      0 32px 56px -26px rgb(94 66 22 / 0.55),
      0 0 40px rgb(255 247 222 / 0.7);
  }

  .card:hover .card__glow,
  .card:hover .card__light {
    opacity: 1;
  }
}

/* Movimento (subir e aproximar a imagem) só para quem não pediu menos movimento; a luz vale sempre. */
@media (prefers-reduced-motion: no-preference) {
  .card:has(:focus-visible) .card__lift {
    translate: 0 -5px;
  }

  .card:has(:focus-visible) .card__depth {
    scale: 1.04;
  }
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .card:hover .card__lift {
    translate: 0 -6px;
  }

  .card:hover .card__depth {
    scale: 1.06;
  }
}

/* Fotografia */
.card__photo {
  position: relative;
  aspect-ratio: 16 / 10;
  margin: 0.5rem 0.5rem 0;
  border-radius: 6px;
  overflow: hidden;
  background: var(--afternoon);
  isolation: isolate;
}

/* A imagem anda devagar no sentido contrário ao ponteiro: profundidade, sem mudar o tamanho do card. */
.card__depth {
  position: absolute;
  inset: 0;
  transform: translate(calc(var(--mx) * -9px), calc(var(--my) * -6px));
  transition:
    transform 0.9s var(--ease-dream),
    scale 0.9s var(--ease-dream);
}

/* Reflexo de luz sobre a foto, no lado do ponteiro. */
.card__light {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: radial-gradient(70% 80% at calc(50% + var(--mx) * 45%) calc(30% + var(--my) * 45%), rgb(255 253 242 / 0.42), transparent 70%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.7s var(--ease-dream);
}

.card__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  opacity: 0;
  transition: opacity 0.7s var(--ease-dream);
}

.is-loaded .card__img {
  opacity: 1;
}

.card__photo--contain .card__img {
  object-fit: contain;
  object-position: center;
  padding: 10% 18%;
  filter: drop-shadow(0 10px 18px rgb(80 56 20 / 0.25));
  /* O logo flutua na frente da arte: anda no sentido do ponteiro, a arte no contrário. */
  transform: translate(calc(var(--mx) * 16px), calc(var(--my) * 11px));
  transition:
    opacity 0.7s var(--ease-dream),
    transform 0.9s var(--ease-dream);
}

/* Revelação: a foto chega superexposta e "revela" quando o card entra na tela. */
.card__photo::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  background: radial-gradient(120% 100% at 50% 40%, #fffef6, #fff4d6);
  opacity: 0;
  pointer-events: none;
  transition: opacity 1.4s var(--ease-dream) calc(var(--reveal-delay, 0ms) + 120ms);
}

.card[data-reveal]:not([data-revealed]) .card__photo::after {
  opacity: 0.92;
  transition: none;
}

.card[data-reveal]:not([data-revealed]) .card__body,
.card[data-reveal]:not([data-revealed]) .card__actions {
  opacity: 0;
  translate: 0 6px;
}

.card__body,
.card__actions {
  transition:
    opacity 0.9s var(--ease-dream) calc(var(--reveal-delay, 0ms) + 380ms),
    translate 0.9s var(--ease-surface) calc(var(--reveal-delay, 0ms) + 380ms);
}

/* Reflexo que atravessa a foto quando você chega perto. */
.card__sheen {
  position: absolute;
  inset: -20% -60%;
  z-index: 1;
  background: linear-gradient(105deg, transparent 40%, rgb(255 253 244 / 0.55) 50%, transparent 60%);
  translate: -60% 0;
  opacity: 0;
  pointer-events: none;
}

.card:hover .card__sheen {
  animation: sheen 1.1s var(--ease-dream);
}

/* Linguagem principal, sobre a arte genérica (fica parada quando a arte se move). */
.card__lang {
  position: absolute;
  left: 0.85rem;
  bottom: 0.65rem;
  z-index: 2;
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: 0.04em;
  color: rgb(42 37 24 / 0.6);
}

/* Carimbo de data, como nas câmeras de filme. */
.card__stamp {
  position: absolute;
  right: 0.7rem;
  bottom: 0.55rem;
  z-index: 3;
  font-family: var(--font-display);
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  color: #ff9a3d;
  text-shadow:
    0 0 4px rgb(255 120 40 / 0.65),
    0 0 1px rgb(120 40 0 / 0.6);
  opacity: 0.92;
}

.card__live {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2rem;
  padding: 0 0.7rem;
  border-radius: 999px;
  /* Fundo opaco em vez de desfoque: desfoque dentro da foto recortada e arredondada
     é justamente o tipo de camada que pode pintar o card inteiro de branco em algumas GPUs. */
  background: rgb(255 252 242 / 0.94);
  box-shadow: 0 0 0 1px rgb(255 252 240 / 0.95);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--ink);
  text-decoration: none;
  transition:
    background-color var(--dur-quick),
    box-shadow var(--dur-soft);
}

.card__live svg {
  width: 0.85rem;
  height: 0.85rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.card__live:hover {
  background: #fffdf6;
  box-shadow:
    0 0 0 1px #fffdf6,
    0 0 18px rgb(255 250 230 / 0.9);
}

/* Texto */
.card__body {
  display: grid;
  align-content: start;
  gap: 0.15rem;
  padding: 0.9rem var(--card-pad) 0;
}

.card__title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
  font-size: 1.3rem;
  font-weight: 400;
  line-height: 1.25;
}

.card__name {
  overflow: hidden;
  min-width: 0;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Tipo do projeto: uma etiqueta pequena, como as de rolo de filme, com um tom por tipo. */
.card__kind {
  --tint: #efe5cc;
  --tint-ink: #5a4517;
  flex: none;
  padding: 0.22rem 0.5rem 0.18rem;
  border-radius: 4px;
  background: var(--tint);
  box-shadow: inset 0 0 0 1px rgb(60 44 14 / 0.12);
  font-family: var(--font-display);
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.16em;
  color: var(--tint-ink);
}

.card__kind[data-kind='web'] {
  --tint: #dfe8ee;
  --tint-ink: #2f4656;
}

.card__kind[data-kind='app'] {
  --tint: #e2ead9;
  --tint-ink: #3a4d2c;
}

.card__kind[data-kind='game'] {
  --tint: #f8dcc4;
  --tint-ink: #6e3613;
}

.card__kind[data-kind='cli'],
.card__kind[data-kind='lib'] {
  --tint: #e6e1ef;
  --tint-ink: #45395f;
}

.card__kind[data-kind='api'] {
  --tint: #f3dcd7;
  --tint-ink: #6a2f27;
}

.card__kind[data-kind='ai'] {
  --tint: #f3e7b8;
  --tint-ink: #5b4710;
}

.card__repo {
  min-height: 1.5em;
  overflow: hidden;
  font-size: var(--text-xs);
  color: var(--fg-3);
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Sempre o espaço de três linhas, com ou sem descrição: todos os cards do mesmo tamanho. */
.card__desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  min-height: calc(3 * 1.5em);
  margin-top: 0.55rem;
  font-family: var(--font-prose);
  font-size: 0.98rem;
  line-height: 1.5;
  color: var(--fg-2);
}

/* Ações */
.card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.85rem var(--card-pad) var(--card-pad);
}

.card__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.5rem;
  padding: 0 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  font-size: var(--text-sm);
  font-weight: 450;
  color: var(--fg);
  text-decoration: none;
  transition:
    background-color var(--dur-quick),
    border-color var(--dur-quick),
    box-shadow var(--dur-soft);
}

.card__btn:hover {
  border-color: var(--fg);
  background: rgb(255 253 244 / 0.9);
  box-shadow: 0 0 18px rgb(255 247 220 / 0.9);
}

.card__btn--quiet {
  background: none;
  border-color: transparent;
  padding-inline: 0.6rem;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.25em;
  text-decoration-color: var(--line-strong);
}

.card__btn--quiet:hover {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  text-decoration-color: currentColor;
}

.card__gh {
  width: 1rem;
  height: 1rem;
  fill: currentColor;
}

.card__code {
  width: 1.05rem;
  height: 1.05rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Projeto privado: um aviso discreto no lugar do botão do repositório (que não existe). */
.card__private {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.5rem;
  padding: 0 0.3rem;
  font-size: var(--text-sm);
  color: var(--fg-2);
}

.card__private svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Uma coluna só (celular): a descrição inteira cabe, sem reticências. */
@media (max-width: 639px) {
  .card__desc {
    -webkit-line-clamp: 6;
    line-clamp: 6;
  }
}

@keyframes sheen {
  from {
    translate: -60% 0;
    opacity: 1;
  }
  to {
    translate: 60% 0;
    opacity: 1;
  }
}

</style>
