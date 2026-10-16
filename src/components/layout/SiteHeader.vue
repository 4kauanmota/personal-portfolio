<script setup lang="ts">
import { computed, ref } from 'vue'
import { useActiveSection, useHeaderTone, useScrolled } from '../../composables/sections'
import { hrefFor, t, useI18n, type MessageKey } from '../../i18n'
import Wordmark from '../brand/Wordmark.vue'
import LanguageSwitch from './LanguageSwitch.vue'
import SoundToggle from './SoundToggle.vue'

const props = withDefaults(defineProps<{ minimal?: boolean }>(), { minimal: false })
const { page } = useI18n()

const sections: Array<{ id: string; label: MessageKey }> = [
  { id: 'projetos', label: 'nav.projects' },
  { id: 'sobre', label: 'nav.about' },
  { id: 'curiosidades', label: 'nav.curiosities' },
  { id: 'links', label: 'nav.links' },
]

const active = useActiveSection(['inicio', ...sections.map((s) => s.id)])
const scrolled = useScrolled()
const menu = ref<HTMLDialogElement | null>(null)
const menuOpen = ref(false)
const closing = ref(false)

/** O véu acompanha o céu que passa por baixo: dia, pôr do sol ou noite. */
const toneUnder = useHeaderTone()
const night = computed(() => !props.minimal && toneUnder.value === 'night')
const sunset = computed(() => !props.minimal && toneUnder.value === 'sunset')

const homeHref = computed(() => (page.value === 'home' ? '#inicio' : hrefFor('home')))
const sectionHref = (id: string) => (page.value === 'home' ? `#${id}` : hrefFor('home', `#${id}`))

function openMenu() {
  closing.value = false
  menu.value?.showModal()
  menuOpen.value = true
}

/** Fecha com a mesma luz que abriu (o círculo se recolhe para o botão). */
function closeMenu() {
  const el = menu.value
  if (!el?.open) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    el.close()
    return
  }
  closing.value = true
  window.setTimeout(() => {
    el.close()
    closing.value = false
  }, 380)
}

function onCancel(event: Event) {
  event.preventDefault()
  closeMenu()
}
</script>

<template>
  <header
    class="header"
    :class="[night ? 'theme-night header--night' : 'theme-light', { 'header--sunset': sunset, 'is-scrolled': scrolled, 'header--minimal': props.minimal }]"
  >
    <div class="header__inner">
      <a class="header__brand" :href="homeHref">
        <Wordmark :glow="0.7" />
        <span class="sr-only">{{ t('nav.home') }}</span>
      </a>

      <nav v-if="!props.minimal" class="header__nav" :aria-label="t('nav.label')">
        <ul role="list">
          <li v-for="section in sections" :key="section.id">
            <a :href="sectionHref(section.id)" :aria-current="active === section.id ? 'location' : undefined">{{ t(section.label) }}</a>
          </li>
        </ul>
      </nav>

      <div class="header__tools">
        <SoundToggle />
        <LanguageSwitch />
        <button v-if="!props.minimal" type="button" class="header__menu-button" :aria-expanded="menuOpen" aria-controls="site-menu" @click="openMenu">
          <span class="sr-only">{{ t('nav.openMenu') }}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16" /></svg>
        </button>
      </div>
    </div>

    <dialog
      v-if="!props.minimal"
      id="site-menu"
      ref="menu"
      class="menu theme-light"
      :class="{ 'is-closing': closing }"
      :aria-label="t('nav.label')"
      @close="menuOpen = false"
      @cancel="onCancel"
    >
      <div class="menu__top">
        <Wordmark />
        <button type="button" class="menu__close" @click="closeMenu">
          <span class="sr-only">{{ t('nav.closeMenu') }}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <nav :aria-label="t('nav.label')">
        <ul role="list" class="menu__list">
          <li v-for="(section, i) in sections" :key="section.id" :style="{ '--i': i }">
            <a :href="sectionHref(section.id)" @click="closeMenu">{{ t(section.label) }}</a>
          </li>
        </ul>
      </nav>
      <a class="menu__page text-link" :href="hrefFor('links')">{{ t('nav.linksPage') }}</a>
      <LanguageSwitch class="menu__lang" />
    </dialog>
  </header>
</template>

<style scoped>
@property --veil {
  syntax: '<color>';
  inherits: true;
  initial-value: #f8f1e0;
}

.header {
  --veil: #f8f1e0;
  position: fixed;
  inset: 0 0 auto;
  z-index: 50;
  height: var(--header-h);
  transition: --veil 0.8s var(--ease-dream);
}

/* No pôr do sol o véu do dia fica pêssego, para não virar uma faixa creme sobre o coral. */
.header--sunset {
  --veil: #f5bf98;
}

/*
 * O véu do cabeçalho não tem borda: ele se desfaz para baixo (cor e desfoque juntos),
 * então não existe uma linha reta cortando o céu quando a página rola.
 * Dois véus (dia e noite) trocam por opacidade, sem salto de cor.
 */
.header::before,
.header::after {
  content: '';
  position: absolute;
  inset: 0 0 -1.75rem;
  z-index: -1;
  -webkit-backdrop-filter: blur(10px) saturate(1.08);
  backdrop-filter: blur(10px) saturate(1.08);
  -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 52%, rgb(0 0 0 / 0.55) 72%, transparent 100%);
  mask-image: linear-gradient(180deg, #000 0%, #000 52%, rgb(0 0 0 / 0.55) 72%, transparent 100%);
  opacity: 0;
  transition: opacity var(--dur-soft) var(--ease-dream);
  pointer-events: none;
}

.header::before {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--veil) 86%, transparent),
    color-mix(in srgb, var(--veil) 62%, transparent) 60%,
    color-mix(in srgb, var(--veil) 0%, transparent)
  );
}

.header::after {
  background: linear-gradient(180deg, rgb(18 22 46 / 0.74), rgb(18 22 46 / 0.5) 60%, rgb(18 22 46 / 0));
}

.header.is-scrolled:not(.header--night)::before,
.header.is-scrolled.header--night::after {
  opacity: 1;
}

.header--night .header__brand {
  color: var(--night-text);
}

.header__inner {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  height: 100%;
  width: min(100% - 2 * var(--gutter), var(--page-max));
  margin-inline: auto;
}

.header__brand {
  font-size: 1.35rem;
  font-weight: 300;
  letter-spacing: 0.01em;
  text-decoration: none;
  color: var(--ink);
  transition: color var(--dur-soft);
}

.header__nav {
  margin-left: auto;
}

.header__nav ul {
  display: flex;
  gap: 0.25rem;
}

.header__nav a {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  padding: 0 0.85rem;
  font-size: var(--text-sm);
  color: var(--fg-2);
  text-decoration: none;
  transition: color var(--dur-quick);
}

/* Seção atual: um ponto de luz embaixo do nome. */
.header__nav a::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0.5rem;
  width: 0.3rem;
  height: 0.3rem;
  border-radius: 50%;
  background: var(--fg);
  box-shadow: 0 0 10px 2px rgb(255 240 200 / 0.9);
  opacity: 0;
  translate: -50% 4px;
  transition:
    opacity var(--dur-soft) var(--ease-dream),
    translate var(--dur-soft) var(--ease-dream);
}

.header__nav a:hover,
.header__nav a[aria-current] {
  color: var(--fg);
}

.header__nav a[aria-current]::after {
  opacity: 1;
  translate: -50% 0;
}

.header__tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.header__nav + .header__tools {
  margin-left: 0;
}

.header__menu-button,
.menu__close {
  display: none;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: transparent;
}

.header__menu-button svg,
.menu__close svg {
  width: 1.25rem;
  height: 1.25rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
}

.menu {
  width: 100%;
  max-width: none;
  height: 100%;
  max-height: none;
  margin: 0;
  padding: 1rem var(--gutter) 2.5rem;
  border: 0;
  background:
    radial-gradient(90% 60% at 80% 0%, rgb(255 252 238 / 0.95), transparent 70%),
    linear-gradient(180deg, var(--sun) 0%, var(--sun-bloom) 55%, var(--straw) 100%);
  color: var(--ink);
}

.menu[open] {
  display: flex;
  flex-direction: column;
  animation: menu-in 0.55s var(--ease-surface);
}

.menu.is-closing {
  animation: menu-out 0.38s var(--ease-in-out) forwards;
}

.menu[open] .menu__list li {
  animation: menu-item 0.7s var(--ease-surface) both;
  animation-delay: calc(0.12s + var(--i) * 0.06s);
}

.menu__page {
  margin-top: 2rem;
  font-size: var(--text-md);
}

.menu::backdrop {
  background: rgb(42 37 24 / 0.2);
}

.menu__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 3rem;
  font-size: 1.35rem;
  font-weight: 300;
}

.menu__close {
  display: grid;
}

.menu__list {
  display: grid;
  gap: 0.25rem;
  margin-top: 12vh;
}

.menu__list a {
  display: block;
  padding: 0.35rem 0;
  font-size: clamp(2.4rem, 10vw, 3.5rem);
  font-weight: 200;
  line-height: 1.1;
  text-transform: lowercase;
  text-decoration: none;
}

.menu__lang {
  margin-top: auto;
  align-self: flex-start;
}

/* O menu abre como luz saindo do botão, num círculo que cresce. */
@keyframes menu-in {
  from {
    clip-path: circle(0% at calc(100% - 2.6rem) 2rem);
  }
  to {
    clip-path: circle(150% at calc(100% - 2.6rem) 2rem);
  }
}

@keyframes menu-out {
  from {
    clip-path: circle(150% at calc(100% - 2.6rem) 2rem);
  }
  to {
    clip-path: circle(0% at calc(100% - 2.6rem) 2rem);
  }
}

@keyframes menu-item {
  from {
    opacity: 0;
    translate: 0 12px;
    filter: blur(6px);
  }
}

@media (max-width: 860px) {
  .header__nav {
    display: none;
  }

  .header__tools,
  .header__nav + .header__tools {
    margin-left: auto;
  }

  .header__tools > .lang {
    display: none;
  }

  .header__menu-button {
    display: grid;
  }
}

@media (max-width: 860px) {
  .header--minimal .header__tools > .lang {
    display: inline-flex;
  }
}
</style>
