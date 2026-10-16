<script setup lang="ts">
import { computed, ref } from 'vue'
import { aboutMore, aboutSummary, spokenLanguages, timeline, toolbox } from '../../content/about'
import { logoOf } from '../../composables/companies'
import { morphHeight } from '../../composables/morph'
import { useInView } from '../../composables/motion'
import { useScene } from '../../composables/scene'
import { playSound } from '../../composables/sound'
import { formatDate, t, tx, useI18n } from '../../i18n'
import { toIso } from '../../lib/journey'
import { paragraphs } from '../../lib/text'
import SunsetSky from '../atmosphere/SunsetSky.vue'
import JourneyTimeline from './JourneyTimeline.vue'

/**
 * "O que eu sei fazer?", no pôr do sol.
 *
 * Três camadas, cada uma com a sua linguagem:
 *   - a carta: um texto só. O resumo abre a carta em letra grande e o "Ler mais" continua
 *     o mesmo texto logo abaixo dele, parágrafo depois de parágrafo. Enquanto os cartões
 *     do "agora" estão ao lado, o texto fica à esquerda; passando deles, ocupa a largura
 *     toda, como num jornal que contorna uma foto. Os idiomas fecham a carta;
 *   - o agora: o que faço hoje, como cartões-postais presos no céu (vêm da própria
 *     trajetória: são as experiências que continuam até hoje);
 *   - o mapa do céu: cada área de trabalho com um astro próprio (lua, planeta,
 *     cometa, constelação, sol, rosa dos ventos), cada um com o seu movimento.
 * Depois, a trajetória completa.
 */
const { locale } = useI18n()
const root = ref<HTMLElement | null>(null)
/** Os emblemas só se animam enquanto estão perto da tela. */
const skymap = ref<HTMLElement | null>(null)
useInView(skymap, { rootMargin: '20% 0px' })
useScene(root)

/* "Ler mais": o texto completo abre e fecha com a altura animada. */
const open = ref(false)
const more = ref<HTMLElement | null>(null)
const moreButton = ref<HTMLButtonElement | null>(null)
async function toggleMore() {
  playSound('rustle')
  if (!open.value) await morphHeight(more.value, () => (open.value = true))
  else await morphHeight(more.value, () => (open.value = false), { anchor: moreButton.value, shrinkTo: () => 0 })
}

/** Carimbo de data: 'AA MM (e o dia, quando a data é completa). */
function stampOf(value: string): string {
  const [y = '', m = '', d] = value.split('-')
  return `'${y.slice(2)} ${m}${d ? ` ${d}` : ''}`
}

/** O que continua até hoje, na ordem em que começou (sem data, por último). */
const now = computed(() =>
  timeline
    .filter((e) => !e.end)
    .sort((a, b) => (a.start ?? '9999').localeCompare(b.start ?? '9999'))
    .map((e) => ({
      ...e,
      since: e.start ? (void locale.value, t('about.since', { date: formatDate(toIso(e.start)) })) : t('about.ongoing'),
      stamp: e.start ? stampOf(e.start) : null,
      logo: logoOf(e.company),
    })),
)

/**
 * Cada área tem um astro da mesma família (estrelas e sóis), cada um com o seu jeito:
 * um sol radiante, uma estrela em órbita, uma estrela cadente, uma constelação,
 * um sol com coroa e uma estrela-guia. Mesmo traço, mesma luz, mesmas proporções.
 */
const EMBLEM: Record<string, string> = {
  languages: 'radiant',
  frameworks: 'orbit',
  games: 'shooting',
  data: 'constellation',
  devops: 'corona',
  tools: 'guide',
}
const emblemOf = (id: string) => EMBLEM[id] ?? 'guide'
/** Estrela de quatro pontas (a mesma das estrelas do céu do site), com raio 1. */
const SPARKLE = 'M0 -1 C 0.1 -0.2, 0.2 -0.1, 1 0 C 0.2 0.1, 0.1 0.2, 0 1 C -0.1 0.2, -0.2 0.1, -1 0 C -0.2 -0.1, -0.1 -0.2, 0 -1 Z'
const sparkle = (x: number, y: number, r: number) => `translate(${x} ${y}) scale(${r})`
const RAYS = Array.from({ length: 8 }, (_, i) => i * 45)
const CORONA = Array.from({ length: 12 }, (_, i) => i * 30)
const STARS: Array<[number, number, number]> = [
  [-36, 18, 8.5],
  [-16, -6, 12],
  [4, 12, 7.5],
  [22, -22, 13],
  [38, 4, 8.5],
  [14, 34, 7],
]
</script>

<template>
  <section id="sobre" ref="root" class="about theme-sunset" aria-labelledby="about-title">
    <SunsetSky />
    <div class="wrap about__inner">
      <h2 id="about-title" v-reveal class="display about__title">{{ t('about.title') }}</h2>

      <div class="about__letter">
        <!--
          O que faço hoje: os cartões ficam à direita e a carta contorna os dois.
          Ao lado deles o texto ocupa a coluna da esquerda; depois deles, usa a largura toda.
        -->
        <section class="about__now" aria-labelledby="now-title">
          <h3 id="now-title" class="about__hand">{{ t('about.nowTitle') }}</h3>
          <ul role="list" class="postcards">
            <li v-for="(card, i) in now" :key="card.id" class="postcard" :class="`lane-${card.lane}`" :style="{ '--i': i }">
              <div class="postcard__paper" :class="{ 'has-low-stamp': card.logo && card.stamp }">
                <img v-if="card.logo" class="postcard__image" :src="card.logo" alt="" loading="lazy" decoding="async" />
                <p class="postcard__place" :class="{ 'has-logo': card.logo }">{{ card.place }}</p>
                <p class="postcard__role">{{ tx(card.title) }}</p>
                <p class="postcard__mode">
                  <span v-if="card.mode">{{ tx(card.mode) }}</span>
                  <span>{{ card.since }}</span>
                </p>
                <template v-if="card.text">
                  <p v-for="(paragraph, k) in paragraphs(tx(card.text))" :key="k" class="postcard__text">{{ paragraph }}</p>
                </template>
                <span v-if="card.stamp" class="postcard__stamp" aria-hidden="true">{{ card.stamp }}</span>
                <svg class="postcard__sparkle" viewBox="-50 -50 100 100" aria-hidden="true">
                  <path d="M0 -50 C 5 -9, 9 -5, 34 0 C 9 5, 5 9, 0 50 C -5 9, -9 5, -34 0 C -9 -5, -5 -9, 0 -50 Z" />
                </svg>
              </div>
            </li>
          </ul>
        </section>
        <!-- A carta é um texto contínuo: o "Ler mais" desdobra a continuação logo depois do resumo. -->
        <div class="about__text">
          <p class="about__summary">{{ tx(aboutSummary) }}</p>
          <div id="about-more" ref="more" class="about__more" :class="{ 'is-open': open }" :inert="open ? undefined : true">
            <p v-for="(paragraph, i) in tx(aboutMore)" :key="paragraph" :style="{ '--i': i }">{{ paragraph }}</p>
          </div>
        </div>
        <p class="about__spoken">
          <span class="about__spoken-label">{{ t('about.spoken') }}</span>
          <span>{{ tx(spokenLanguages) }}</span>
        </p>
        <button ref="moreButton" type="button" class="readmore" :aria-expanded="open" aria-controls="about-more" @click="toggleMore">
          <span class="readmore__line" aria-hidden="true" />
          <span>{{ open ? t('about.readLess') : t('about.readMore') }}</span>
          <svg class="readmore__icon" :class="{ 'is-up': open }" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5 12 15.5 18 9.5" /></svg>
        </button>
      </div>


      <section class="about__areas" aria-labelledby="areas-title">
        <h3 id="areas-title" class="about__areas-title">{{ t('about.toolbox') }}</h3>
        <ul ref="skymap" role="list" class="skymap">
          <li v-for="(group, i) in toolbox" :key="group.id" class="area" :class="`area--${emblemOf(group.id)}`" :style="{ '--i': i }">
            <svg class="area__emblem" viewBox="-50 -50 100 100" aria-hidden="true">
              <defs>
                <radialGradient :id="`glow-${group.id}`">
                  <stop offset="0" stop-color="#fffdf6" />
                  <stop offset="0.65" stop-color="#fff2dc" />
                  <stop offset="1" stop-color="#fbdcb4" />
                </radialGradient>
                <linearGradient :id="`trail-${group.id}`" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#fff7e6" stop-opacity="0.95" />
                  <stop offset="1" stop-color="#fff7e6" stop-opacity="0" />
                </linearGradient>
              </defs>
              <g class="emb" :class="`emb--${emblemOf(group.id)}`" :style="{ '--fill': `url(#glow-${group.id})` }">
                <!-- Linguagens: um sol radiante. -->
                <template v-if="emblemOf(group.id) === 'radiant'">
                  <g class="emb__rays">
                    <line v-for="a in RAYS" :key="a" class="emb__ray" x1="0" y1="-23" x2="0" :y2="a % 90 ? -32 : -40" :transform="`rotate(${a})`" />
                  </g>
                  <circle class="emb__body" r="16" />
                </template>
                <!-- Frameworks: uma estrela com uma órbita e um satélite de luz. -->
                <template v-else-if="emblemOf(group.id) === 'orbit'">
                  <ellipse class="emb__orbit emb__orbit--back" rx="41" ry="12" transform="rotate(-20)" />
                  <path class="emb__body" :d="SPARKLE" :transform="sparkle(0, 0, 30)" />
                  <path class="emb__orbit" d="M -41 0 A 41 12 0 0 0 41 0" transform="rotate(-20)" />
                  <path class="emb__orbit-light" d="M -41 0 A 41 12 0 0 0 41 0" transform="rotate(-20)" pathLength="100" />
                </template>
                <!-- Jogos: uma estrela cadente. -->
                <template v-else-if="emblemOf(group.id) === 'shooting'">
                  <path class="emb__trail" :fill="`url(#trail-${group.id})`" d="M 20 -18 C -2 -6, -20 12, -42 36 C -16 22, 4 8, 26 -6 Z" />
                  <path class="emb__body" :d="SPARKLE" :transform="sparkle(23, -12, 17)" />
                  <g :transform="sparkle(-24, -26, 6)"><path class="emb__mini emb__mini--a" :d="SPARKLE" /></g>
                  <g :transform="sparkle(36, 22, 5)"><path class="emb__mini emb__mini--b" :d="SPARKLE" /></g>
                </template>
                <!-- Dados: uma constelação de estrelas pequenas. -->
                <template v-else-if="emblemOf(group.id) === 'constellation'">
                  <polyline class="emb__line" :points="STARS.map(([x, y]) => `${x},${y}`).join(' ')" />
                  <g v-for="([x, y, r], k) in STARS" :key="k" :transform="sparkle(x, y, r)">
                    <path class="emb__mini emb__twinkle" :d="SPARKLE" :style="{ animationDelay: `${k * -0.7}s` }" />
                  </g>
                </template>
                <!-- DevOps: um sol com coroa (o anel de luz da identidade do site). -->
                <template v-else-if="emblemOf(group.id) === 'corona'">
                  <g class="emb__corona">
                    <line v-for="a in CORONA" :key="a" class="emb__ray emb__ray--short" x1="0" y1="-33" x2="0" y2="-40" :transform="`rotate(${a})`" />
                  </g>
                  <circle class="emb__halo" r="26" />
                  <circle class="emb__body" r="15" />
                </template>
                <!-- Ferramentas: uma estrela-guia de oito pontas. -->
                <template v-else>
                  <path class="emb__minor" :d="SPARKLE" :transform="`rotate(45) ${sparkle(0, 0, 26)}`" />
                  <path class="emb__body" :d="SPARKLE" :transform="sparkle(0, 0, 41)" />
                  <circle class="emb__dot" r="3.2" />
                </template>
              </g>
            </svg>
            <div class="area__text">
              <h4 class="area__name">{{ tx(group.label) }}</h4>
              <p v-if="group.id === 'languages'" class="area__note">{{ t('about.toolboxNote') }}</p>
              <ul role="list" class="area__tools">
                <li v-for="item in group.items" :key="item">{{ item }}</li>
              </ul>
            </div>
          </li>
        </ul>
      </section>

      <section class="about__journey" aria-labelledby="journey-title">
        <header class="about__journey-head">
          <h3 id="journey-title" class="about__journey-title">{{ t('about.journey') }}</h3>
          <p class="about__journey-lead">{{ t('about.journeyLead') }}</p>
        </header>
        <JourneyTimeline />
      </section>
    </div>
  </section>
</template>

<style scoped>
.about {
  position: relative;
  padding-top: clamp(5rem, 3rem + 6vw, 8rem);
  padding-bottom: calc(var(--passage) + clamp(2rem, 1rem + 3vw, 4rem));
}

/*
 * Composição: a carta à esquerda e os cartões-postais à direita. O "Ler mais" continua
 * a carta na mesma coluna. Sem espaço entre linhas da grade: cada bloco cuida da
 * própria margem (o texto fechado não deixa buraco).
 */
.about__inner {
  --about-gap: clamp(2.5rem, 1.5rem + 4vw, 6.5rem);
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 4.6fr);
  column-gap: var(--about-gap);
  align-items: start;
}

.about__title {
  grid-column: 1 / -1;
  /*
   * Mesma família, peso e escala dos outros títulos, um pouco menor (80%): a pergunta é
   * longa e, no tamanho cheio, pesava mais que o resto da seção. Cabe numa linha no celular.
   */
  font-size: calc(var(--text-display) * 0.8);
  margin-bottom: clamp(2rem, 1.5rem + 2vw, 3.5rem);
  text-wrap: balance;
  transition:
    opacity 1.2s var(--ease-dream),
    filter 1.4s var(--ease-dream),
    letter-spacing 1.6s var(--ease-surface);
}

.about__title[data-reveal]:not([data-revealed]) {
  opacity: 0;
  filter: blur(10px);
  letter-spacing: 0.06em;
}

/* A carta */
/*
 * A carta ocupa a largura toda e os cartões do "agora" flutuam à direita, na mesma
 * proporção de antes (4,6 para 7). O texto contorna os cartões: ao lado deles fica na
 * coluna da esquerda; abaixo deles, usa a largura inteira. Tudo é um bloco só.
 */
.about__letter {
  grid-column: 1 / -1;
  grid-row: 2;
  display: flow-root;
  padding-top: 0.5rem;
}

.about__summary {
  font-family: var(--font-prose);
  font-size: clamp(1.4rem, 1.1rem + 1vw, 2rem);
  line-height: 1.42;
  text-wrap: pretty;
}

/* Idiomas: parte da carta, como uma linha de assinatura. */
.about__spoken {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.85rem;
  margin-top: 1.2rem;
  font-family: var(--font-prose);
  font-size: var(--text-prose);
  color: var(--fg-2);
}

.about__spoken-label {
  font-family: var(--font-hand);
  font-size: 1.45rem;
  line-height: 1;
  color: var(--fg);
}

/*
 * A continuação da carta: o mesmo texto, logo depois do resumo, na mesma coluna e na
 * mesma voz (mesma letra e cor; um pouco menor, como o corpo depois da abertura).
 * Fechada, não ocupa espaço; ao abrir, a altura cresce devagar e os parágrafos surgem
 * em sequência, como se a carta se desdobrasse.
 */
/*
 * Blocos comuns (não grid nem flex): só assim as linhas contornam os cartões e passam
 * a usar a largura toda depois deles. O corpo cresce com a tela, para a linha longa de
 * baixo continuar confortável de ler (perto de 90 caracteres por linha).
 */
.about__text {
  display: block;
}

/* Fechada: "clip" corta sem criar outro contexto de layout, então o texto não muda de forma ao abrir. */
.about__more:not(.is-open) {
  height: 0;
  overflow: hidden;
  overflow: clip;
}

.about__more p {
  margin: 0.95em 0 0;
  font-family: var(--font-prose);
  font-size: clamp(1.15rem, 0.86rem + 1.16vw, 1.9rem);
  line-height: 1.58;
  text-wrap: pretty;
}

@media (prefers-reduced-motion: no-preference) {
  .about__more.is-open p {
    animation: paragraph-surface 0.9s var(--ease-dream) both;
    animation-delay: calc(var(--i) * 70ms);
  }
}

.readmore {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.75rem;
  margin-top: 1.2rem;
  padding: 0 1.1rem 0 0;
  border: 0;
  background: none;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--fg);
}

.readmore__line {
  width: 2.25rem;
  height: 1px;
  background: currentColor;
  transition: width var(--dur-soft) var(--ease-surface);
}

.readmore:hover .readmore__line {
  width: 3.25rem;
}

.readmore__icon {
  width: 1.1rem;
  height: 1.1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: rotate var(--dur-soft) var(--ease-surface);
}

.readmore__icon.is-up {
  rotate: 180deg;
}

/* O agora: cartões-postais presos no céu */
.about__now {
  float: right;
  width: calc((100% - var(--about-gap)) * 4.6 / 11.6);
  margin: 0 0 clamp(1.5rem, 1rem + 1vw, 2.5rem) var(--about-gap);
  display: grid;
  gap: 0.6rem;
  justify-items: start;
}

.about__hand {
  font-family: var(--font-hand);
  font-size: 1.9rem;
  font-weight: 400;
  line-height: 1;
  color: var(--fg-2);
  rotate: -2deg;
}

.postcards {
  display: grid;
  gap: 1.1rem;
  width: 100%;
}

.postcard {
  --tilt: -1.6deg;
}

.postcard:nth-child(2n) {
  --tilt: 1.8deg;
  margin-left: clamp(0.5rem, 2vw, 2.25rem);
}

.postcard__paper {
  position: relative;
  display: grid;
  gap: 0.15rem;
  padding: 1rem 1.15rem 1.1rem;
  border-radius: 6px;
  background:
    radial-gradient(120% 80% at 100% 0%, rgb(255 236 210 / 0.9), transparent 60%),
    linear-gradient(180deg, #fff8ee, #fbecd9);
  box-shadow:
    0 0 0 1px rgb(255 252 244 / 0.9),
    0 1px 0 rgb(140 70 40 / 0.12),
    0 22px 38px -22px rgb(110 40 20 / 0.55);
  rotate: var(--tilt);
  animation: card-float 7s var(--ease-in-out) infinite alternate;
  animation-delay: calc(var(--i) * -2.4s);
  transition: rotate var(--dur-soft) var(--ease-surface);
}

.postcard:hover .postcard__paper {
  rotate: 0deg;
}

/*
 * A logo do lugar, colada no canto como um selo. A largura segue o formato do arquivo,
 * para que os cantos arredondados fiquem na própria logo, e não numa caixa maior que ela.
 */
.postcard__image {
  position: absolute;
  right: 0.7rem;
  top: -1.6rem;
  width: auto;
  max-width: 4.4rem;
  height: 3.8rem;
  object-fit: contain;
  border-radius: 10px;
  rotate: 6deg;
  filter: drop-shadow(0 6px 10px rgb(110 40 20 / 0.28));
  transition:
    rotate var(--dur-soft) var(--ease-surface),
    translate var(--dur-soft) var(--ease-surface);
}

.postcard:hover .postcard__image {
  rotate: -4deg;
  translate: 0 -4px;
}

.postcard__place {
  padding-right: 4.8rem;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--sunset-ink-2, var(--fg-2));
}

.postcard__role {
  font-size: clamp(1.25rem, 1.1rem + 0.4vw, 1.5rem);
  font-weight: 400;
  line-height: 1.2;
}

.postcard__mode {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem 0.9rem;
  font-size: var(--text-sm);
  color: var(--fg-2);
}

.postcard__text + .postcard__text {
  margin-top: 0.35rem;
}

.postcard__text {
  margin-top: 0.45rem;
  font-family: var(--font-prose);
  font-size: 1rem;
  line-height: 1.55;
  color: var(--fg-2);
}

/* Carimbo de data, igual ao dos projetos: no canto de cima, longe do texto. */
.postcard__stamp {
  position: absolute;
  right: 0.85rem;
  top: 0.75rem;
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: #ff8a3d;
  text-shadow: 0 0 4px rgb(255 120 40 / 0.5);
}

/* Quando a logo ocupa o canto de cima, o carimbo desce para o pé do cartão. */
.has-low-stamp {
  padding-bottom: 2.1rem;
}

.has-low-stamp .postcard__stamp {
  top: auto;
  bottom: 0.7rem;
}

.postcard__sparkle {
  position: absolute;
  left: -0.7rem;
  top: -0.8rem;
  width: 1.6rem;
  overflow: visible;
  filter: drop-shadow(0 0 5px rgb(255 246 214 / 1));
  animation: twinkle 3.6s var(--ease-in-out) infinite alternate;
  animation-delay: calc(var(--i) * -1.7s);
}

.postcard__sparkle path {
  fill: #fff8e4;
}

/* ---------------- O mapa do céu: áreas de trabalho ---------------- */
.about__areas {
  grid-column: 1 / -1;
  grid-row: 4;
  display: grid;
  gap: 1.6rem;
  margin-top: clamp(3.5rem, 2.5rem + 3vw, 5.5rem);
}

.about__areas-title {
  font-size: var(--text-xl);
  font-weight: 300;
}

.skymap {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2.4rem clamp(1.5rem, 1rem + 2.5vw, 3.5rem);
  padding-bottom: 1rem;
}

/* Alturas diferentes: o conjunto lembra um céu, não uma tabela. */
.area:nth-child(3n + 2) {
  margin-top: 2.6rem;
}

.area:nth-child(3n + 3) {
  margin-top: 1rem;
}

.area {
  display: grid;
  grid-template-columns: 4.4rem minmax(0, 1fr);
  align-items: start;
  gap: 0.4rem 1rem;
}

.area__emblem {
  width: 4.4rem;
  height: 4.4rem;
  overflow: visible;
  filter: drop-shadow(0 0 7px rgb(255 240 210 / 0.85)) drop-shadow(0 10px 14px rgb(120 50 24 / 0.18));
  transition: filter var(--dur-soft) var(--ease-dream);
}

.area:hover .area__emblem {
  filter: drop-shadow(0 0 12px rgb(255 244 220 / 1)) drop-shadow(0 10px 14px rgb(120 50 24 / 0.18));
}

.area__text {
  display: grid;
  gap: 0.35rem;
  padding-top: 0.35rem;
}

.area__name {
  font-size: 1.12rem;
  font-weight: 450;
  line-height: 1.25;
}

.area__note {
  font-size: var(--text-xs);
  color: var(--fg-2);
}

.area__tools {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.2rem;
}

.area__tools li {
  padding: 0.18rem 0.6rem;
  border-radius: 999px;
  background: rgb(255 251 244 / 0.62);
  box-shadow: 0 0 0 1px rgb(255 252 246 / 0.75);
  font-size: var(--text-sm);
}

/*
 * Os astros: uma família só. Corpo de luz creme (o mesmo degradê), contorno sépia fino,
 * raios e anéis no mesmo traço; cada um com um movimento lento e próprio.
 */
.emb path,
.emb circle,
.emb ellipse,
.emb line,
.emb polyline {
  vector-effect: non-scaling-stroke;
}

.emb__body,
.emb__mini,
.emb__minor,
.emb__dot {
  fill: var(--fill);
  stroke: rgb(92 44 26 / 0.5);
  stroke-width: 1.3;
  stroke-linejoin: round;
}

.emb__mini {
  fill: #fff8ea;
}

.emb__minor {
  fill: #fde8cc;
}

.emb__dot {
  fill: #fffdf6;
}

.emb__ray {
  stroke: #fff2d8;
  stroke-width: 3;
  stroke-linecap: round;
}

.emb__ray--short {
  stroke-width: 2.6;
}

.emb__orbit,
.emb__orbit--back,
.emb__halo {
  fill: none;
  stroke: #fff6e6;
  stroke-width: 2.6;
}

.emb__orbit--back {
  stroke: rgb(255 246 230 / 0.55);
}

.emb__halo {
  stroke: rgb(255 248 232 / 0.95);
  stroke-width: 2;
}

.emb__orbit-light {
  fill: none;
  stroke: #fffdf5;
  stroke-width: 3.4;
  stroke-linecap: round;
  stroke-dasharray: 10 90;
  animation: ring-light 5s linear infinite;
}

.emb__trail {
  stroke: none;
}

.emb__line {
  fill: none;
  stroke: rgb(255 246 230 / 0.9);
  stroke-width: 1.2;
  stroke-dasharray: 3 4;
}

/* Movimentos: raios giram, a luz corre pela órbita, a estrela cadente paira, a constelação pisca, a coroa respira, a estrela-guia aponta. */
.emb__rays {
  animation: rays-turn 48s linear infinite;
}

.emb--shooting {
  animation: shooting-drift 5.5s var(--ease-in-out) infinite alternate;
}

.emb__mini--a,
.emb__mini--b,
.emb__twinkle {
  transform-box: fill-box;
  transform-origin: center;
  animation: spark 3s var(--ease-in-out) infinite alternate;
}

.emb__mini--b {
  animation-delay: -1.5s;
}

.emb__corona {
  animation: rays-turn 70s linear infinite reverse;
}

.emb__halo {
  transform-origin: 0 0;
  animation: halo-breathe 4.5s var(--ease-in-out) infinite alternate;
}

.emb--guide {
  animation: guide-point 6s var(--ease-in-out) infinite alternate;
}

/* Trajetória */
.about__journey {
  grid-column: 1 / -1;
  grid-row: 5;
  display: grid;
  gap: clamp(2.5rem, 2rem + 2vw, 4rem);
  margin-top: clamp(4rem, 3rem + 3vw, 6rem);
}

.about__journey-head {
  display: grid;
  justify-items: center;
  gap: 0.4rem;
  text-align: center;
}

.about__journey-title {
  font-size: var(--text-xl);
  font-weight: 300;
  letter-spacing: 0.01em;
}

.about__journey-lead {
  max-width: 30rem;
  font-family: var(--font-prose);
  color: var(--fg-2);
}

@keyframes paragraph-surface {
  from {
    opacity: 0;
    filter: blur(5px);
    translate: 0 8px;
  }
}

@keyframes card-float {
  from {
    translate: 0 0;
  }
  to {
    translate: 0 -6px;
  }
}

@keyframes twinkle {
  from {
    opacity: 0.55;
    scale: 0.75;
    rotate: -8deg;
  }
  to {
    opacity: 1;
    scale: 1.05;
    rotate: 8deg;
  }
}

@keyframes ring-light {
  to {
    stroke-dashoffset: -100;
  }
}

@keyframes shooting-drift {
  from {
    transform: translate(-2px, 2px);
  }
  to {
    transform: translate(3px, -3px);
  }
}

@keyframes halo-breathe {
  from {
    opacity: 0.6;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1.04);
  }
}

@keyframes spark {
  from {
    opacity: 0.55;
    transform: scale(0.75);
  }
  to {
    opacity: 1;
    transform: scale(1.12);
  }
}

@keyframes rays-turn {
  to {
    transform: rotate(360deg);
  }
}

@keyframes guide-point {
  from {
    transform: rotate(-9deg);
  }
  to {
    transform: rotate(7deg);
  }
}

@media (max-width: 960px) {
  .about__inner {
    grid-template-columns: 1fr;
  }

  .about__letter,
  .about__areas,
  .about__journey {
    grid-column: 1;
    grid-row: auto;
  }

  /* Uma coluna: a carta inteira primeiro, os cartões do "agora" depois dela. */
  .about__letter {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .about__text {
    align-self: stretch;
  }

  .about__now {
    order: 1;
    float: none;
    width: auto;
    align-self: stretch;
    margin: clamp(2.5rem, 2rem + 2vw, 3.5rem) 0 0;
  }

  .postcards {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
  }

  .postcard:nth-child(2n) {
    margin-left: 0;
  }

  .skymap {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .area:nth-child(n) {
    margin-top: 0;
  }

  .area:nth-child(2n) {
    margin-top: 1.6rem;
  }
}

@media (max-width: 760px) {
  .about__journey-head {
    justify-items: start;
    text-align: left;
  }
}

@media (max-width: 560px) {
  .skymap {
    grid-template-columns: 1fr;
    gap: 1.8rem;
  }

  .area:nth-child(2n) {
    margin-top: 0;
  }

  .area {
    grid-template-columns: 3.6rem minmax(0, 1fr);
  }

  .area__emblem {
    width: 3.6rem;
    height: 3.6rem;
  }
}
</style>
