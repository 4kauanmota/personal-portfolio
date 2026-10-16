<script setup lang="ts">
import { computed, ref } from 'vue'
import { useScene } from '../../composables/scene'
import { hrefFor, t } from '../../i18n'
import DawnSky from '../atmosphere/DawnSky.vue'
import LinkList from './LinkList.vue'

const root = ref<HTMLElement | null>(null)
const sky = ref<InstanceType<typeof DawnSky> | null>(null)
const skyEl = computed(() => (sky.value?.$el as HTMLElement | undefined) ?? null)
useScene(root, { progressTarget: skyEl })
</script>

<template>
  <section id="links" ref="root" class="links theme-light" aria-labelledby="links-title">
    <DawnSky ref="sky" />
    <div class="wrap links__inner">
      <header class="links__head">
        <h2 id="links-title" v-reveal class="display links__title">{{ t('links.title') }}</h2>
        <p class="links__lead">{{ t('links.lead') }}</p>
        <a class="text-link links__page" :href="hrefFor('links')">{{ t('nav.linksPage') }}</a>
      </header>
      <LinkList />
    </div>
  </section>
</template>

<style scoped>
.links {
  position: relative;
  padding-top: calc(var(--passage) * 1.08);
  padding-bottom: clamp(4rem, 3rem + 4vw, 7rem);
}

.links__inner {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: clamp(2rem, 1.5rem + 3vw, 5rem);
  align-items: start;
}

.links__head {
  display: grid;
  justify-items: start;
  gap: 1rem;
}

.links__title {
  transition:
    opacity 1.2s var(--ease-dream),
    filter 1.4s var(--ease-dream),
    letter-spacing 1.6s var(--ease-surface);
}

.links__title[data-reveal]:not([data-revealed]) {
  opacity: 0;
  filter: blur(10px);
  letter-spacing: 0.06em;
}

.links__lead {
  max-width: 24rem;
  font-family: var(--font-prose);
  font-size: var(--text-prose);
  line-height: 1.55;
}

.links__page {
  font-size: var(--text-sm);
}

@media (max-width: 860px) {
  .links__inner {
    grid-template-columns: 1fr;
  }
}
</style>
