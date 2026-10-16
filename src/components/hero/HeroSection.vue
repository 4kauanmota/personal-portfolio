<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { site } from '../../content/site'
import { usePointerDepth, useInView } from '../../composables/motion'
import { useScene } from '../../composables/scene'
import { t } from '../../i18n'
import { NOON_WIRES, PERCH } from '../../lib/wires'
import NoonSky from '../atmosphere/NoonSky.vue'
import Wordmark from '../brand/Wordmark.vue'
import PerchedBird from './PerchedBird.vue'
import ProfilePortrait from './ProfilePortrait.vue'

const root = ref<HTMLElement | null>(null)
const sky = ref<InstanceType<typeof NoonSky> | null>(null)
const skyEl = computed(() => (sky.value?.$el as HTMLElement | undefined) ?? null)
const inView = useInView(root, { rootMargin: '0px' })
usePointerDepth(root, inView)
useScene(root, { progressTarget: skyEl, anchor: 'top' })

/* O passarinho fica no mesmo fio, qualquer que seja o tamanho da tela. */
const size = ref({ w: 0, h: 0 })
let resize: ResizeObserver | null = null
onMounted(() => {
  if (!root.value) return
  const measure = () => (size.value = { w: root.value?.offsetWidth ?? 0, h: root.value?.offsetHeight ?? 0 })
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    resize = new ResizeObserver(measure)
    resize.observe(root.value)
  }
})
onBeforeUnmount(() => resize?.disconnect())
</script>

<template>
  <section id="inicio" ref="root" class="hero theme-light" aria-labelledby="hero-title">
    <NoonSky ref="sky" />
    <!-- Mesma profundidade e mesmo ajuste do desenho dos fios: o passarinho anda junto. -->
    <div class="hero__perch" data-depth="0.16">
      <PerchedBird v-if="size.w" :wire="NOON_WIRES[PERCH.wire]!" :t="PERCH.t" :width="size.w" :height="size.h + 2" @takeoff="sky?.pluck(PERCH.wire)" />
    </div>
    <ProfilePortrait class="hero__portrait" data-depth="-0.06" />
    <h1 id="hero-title" class="hero__title"><Wordmark display intro /></h1>
    <div class="hero__copy">
      <p class="hero__name">
        <span>{{ site.name }}</span>
        <span class="hero__role">{{ t('hero.role') }}</span>
      </p>
      <p class="hero__intro">{{ t('hero.intro') }}</p>
      <div class="hero__actions">
        <a class="action action--solid" href="#projetos">{{ t('hero.ctaProjects') }}</a>
        <a class="action" href="#sobre">{{ t('hero.ctaAbout') }}</a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  display: grid;
  grid-template-columns: [full-start] var(--gutter) [content-start] minmax(0, 1fr) minmax(0, 1fr) [content-end] var(--gutter) [full-end];
  grid-template-rows: 1fr auto;
  align-items: end;
  min-height: max(100svh, 40rem);
  padding-top: calc(var(--header-h) + 1rem);
}

.hero__copy {
  position: relative;
  z-index: 2;
  grid-column: content-start / span 1;
  grid-row: 1;
  display: grid;
  gap: 1.1rem;
  justify-items: start;
  max-width: 34rem;
  /* Respiro entre o texto e a assinatura logo abaixo. */
  padding-bottom: clamp(2.25rem, 6.5vh, 4.25rem);
  animation: copy-surface 1.4s var(--ease-surface) 1.1s both;
}

.hero__name {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem 1rem;
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.02em;
}

.hero__role {
  font-weight: 400;
  color: var(--fg-2);
}

.hero__intro {
  font-family: var(--font-prose);
  font-size: var(--text-lg);
  line-height: 1.5;
  text-wrap: pretty;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.35rem;
}

.hero__portrait {
  --portrait-w: clamp(15rem, 10rem + 18vw, 26rem);
  position: relative;
  z-index: 1;
  grid-column: span 1 / content-end;
  grid-row: 1;
  justify-self: center;
  align-self: end;
  margin-bottom: -6%;
  animation: portrait-surface 2s var(--ease-surface) 0.4s both;
}

.hero__perch {
  position: absolute;
  inset: 0 0 -2px;
  z-index: 1;
  overflow: clip;
  pointer-events: none;
  translate: calc(var(--px, 0) * -4px) 0;
}

/* A assinatura: enorme, fina, apoiada no chão da cena. */
.hero__title {
  position: relative;
  z-index: 2;
  grid-column: full;
  grid-row: 2;
  margin: 0 0 -0.03em;
  font-size: min(19.6vw, 19rem);
  font-weight: 200;
  line-height: 0.92;
  letter-spacing: -0.035em;
  text-align: center;
  color: rgb(42 37 24 / 0.88);
  white-space: nowrap;
  translate: calc(var(--px, 0) * 5px) 0;
}

@keyframes portrait-surface {
  from {
    opacity: 0;
    filter: blur(18px) brightness(1.4);
  }
}

@keyframes copy-surface {
  from {
    opacity: 0;
    filter: blur(6px);
  }
}

@media (max-width: 860px) {
  .hero {
    grid-template-columns: [full-start] var(--gutter) [content-start] minmax(0, 1fr) [content-end] var(--gutter) [full-end];
    grid-template-rows: auto auto auto;
    align-content: start;
    min-height: auto;
    padding-bottom: 4.5rem;
  }

  .hero__portrait {
    --portrait-w: min(72vw, 21rem);
    grid-column: content;
    grid-row: 1;
    margin-top: 2.5rem;
    margin-bottom: -10%;
  }

  /* No celular o texto vem depois da assinatura: um espaço maior entre os dois. */
  .hero__title {
    grid-row: 2;
    margin-bottom: clamp(2.5rem, 1.6rem + 4vw, 3.75rem);
  }

  .hero__copy {
    grid-column: content;
    grid-row: 3;
    padding-bottom: 0;
  }

  /* Na tela estreita o retrato ocupa o alto: o passarinho fica para as telas largas. */
  .hero__perch {
    display: none;
  }
}
</style>
