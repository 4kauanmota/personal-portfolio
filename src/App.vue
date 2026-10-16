<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import FilmGrain from './components/atmosphere/FilmGrain.vue'
import { t, useI18n } from './i18n'
import HomePage from './pages/HomePage.vue'

const LinksPage = defineAsyncComponent(() => import('./pages/LinksPage.vue'))
const NotFoundPage = defineAsyncComponent(() => import('./pages/NotFoundPage.vue'))

const { page } = useI18n()
</script>

<template>
  <a class="skip-link" href="#conteudo">{{ t('common.skip') }}</a>
  <HomePage v-if="page === 'home'" />
  <LinksPage v-else-if="page === 'links'" />
  <NotFoundPage v-else />
  <FilmGrain />
</template>

<style>
.skip-link {
  position: fixed;
  left: 1rem;
  top: 0.75rem;
  z-index: 100;
  padding: 0.7rem 1.1rem;
  border-radius: 999px;
  background: var(--ink);
  color: var(--bleach);
  font-size: var(--text-sm);
  text-decoration: none;
  translate: 0 -200%;
  transition: translate var(--dur-quick) var(--ease-dream);
}

.skip-link:focus-visible {
  translate: 0 0;
  outline-color: var(--sun);
}
</style>
