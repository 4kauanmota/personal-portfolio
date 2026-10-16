<script setup lang="ts">
import HaloRing from '../components/atmosphere/HaloRing.vue'
import NoonSky from '../components/atmosphere/NoonSky.vue'
import SiteHeader from '../components/layout/SiteHeader.vue'
import { hrefFor, t } from '../i18n'
</script>

<template>
  <SiteHeader minimal />
  <main id="conteudo" class="lost theme-light" tabindex="-1">
    <NoonSky ends="page" :wires="false" />
    <div class="lost__inner">
      <!-- Uma auréola partida: a lembrança que falhou. -->
      <HaloRing variant="broken" size="clamp(8rem, 6rem + 8vw, 13rem)" :tilt="74" float drawn />
      <h1 class="lost__title">{{ t('notFound.title') }}</h1>
      <p class="lost__body">{{ t('notFound.body') }}</p>
      <a class="action action--solid" :href="hrefFor('home')">{{ t('notFound.action') }}</a>
    </div>
  </main>
</template>

<style scoped>
.lost {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 100svh;
  padding: calc(var(--header-h) + 2rem) var(--gutter) 4rem;
  overflow: hidden;
}

.lost__inner {
  display: grid;
  justify-items: center;
  gap: 1.1rem;
  max-width: 34rem;
  text-align: center;
}

.lost__title {
  font-size: var(--text-xl);
  font-weight: 300;
  line-height: 1.15;
}

.lost__body {
  font-family: var(--font-prose);
  font-size: var(--text-prose);
  color: var(--fg-2);
}
</style>
