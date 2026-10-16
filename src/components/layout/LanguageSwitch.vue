<script setup lang="ts">
import { nextTick } from 'vue'
import { prefersReducedMotion } from '../../composables/motion'
import { setLocale, t, useI18n } from '../../i18n'
import en from '../../i18n/messages/en'
import ptBR from '../../i18n/messages/pt-BR'
import { LOCALES, type Locale } from '../../lib/types'

const { locale } = useI18n()
const names: Record<Locale, { short: string; name: string; switchTo: string }> = {
  'pt-BR': { short: ptBR.language.short, name: ptBR.language.current, switchTo: ptBR.language.switchTo },
  en: { short: en.language.short, name: en.language.current, switchTo: en.language.switchTo },
}

type ViewTransitionDocument = Document & { startViewTransition?: (update: () => Promise<void> | void) => unknown }

function choose(next: Locale) {
  if (next === locale.value) return
  const doc = document as ViewTransitionDocument
  if (prefersReducedMotion.value || !doc.startViewTransition) {
    setLocale(next)
    return
  }
  doc.startViewTransition(async () => {
    setLocale(next)
    await nextTick()
  })
}
</script>

<template>
  <div class="lang" role="group" :aria-label="t('language.label')">
    <button
      v-for="option in LOCALES"
      :key="option"
      type="button"
      class="lang__option"
      :class="{ 'is-active': option === locale }"
      :lang="option"
      :aria-pressed="option === locale"
      :title="names[option].switchTo"
      @click="choose(option)"
    >
      <span aria-hidden="true">{{ names[option].short }}</span>
      <span class="sr-only">{{ names[option].name }}</span>
    </button>
  </div>
</template>

<style scoped>
/*
 * O seletor fala a mesma língua do resto do cabeçalho: a mesma letra (Jost), o mesmo
 * tamanho e peso dos links, em minúsculas como os títulos do site, e o idioma escolhido
 * marcado pela mesma luzinha que marca a seção atual no menu. A moldura tem a altura do
 * botão de som ao lado, para os dois controles formarem uma linha só.
 */
.lang {
  display: inline-flex;
  align-items: stretch;
  height: 2.5rem;
  padding: 0 0.3rem;
  border: 1px solid var(--line);
  border-radius: 999px;
}

.lang__option {
  position: relative;
  display: inline-grid;
  place-items: center;
  min-width: 2.5rem;
  padding: 0 0.55rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0.01em;
  text-transform: lowercase;
  color: var(--fg-2);
  transition: color var(--dur-quick);
}

/* Um fio fino entre os dois idiomas. */
.lang__option + .lang__option::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 1px;
  height: 0.85rem;
  translate: 0 -50%;
  background: var(--line);
}

/* A luzinha do idioma escolhido (a mesma da seção atual no menu). */
.lang__option::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0.3rem;
  width: 0.26rem;
  height: 0.26rem;
  border-radius: 50%;
  background: var(--fg);
  box-shadow: 0 0 10px 2px rgb(255 240 200 / 0.9);
  opacity: 0;
  translate: -50% 3px;
  transition:
    opacity var(--dur-soft) var(--ease-surface),
    translate var(--dur-soft) var(--ease-surface);
}

.lang__option:hover {
  color: var(--fg);
}

.lang__option.is-active {
  color: var(--fg);
}

.lang__option.is-active::after {
  opacity: 1;
  translate: -50% 0;
}

/* À noite, a luzinha é fria e mais discreta. */
.theme-night .lang__option::after {
  box-shadow: 0 0 9px 2px rgb(214 220 255 / 0.55);
}
</style>
