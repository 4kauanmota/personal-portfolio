<script setup lang="ts">
import { ref } from 'vue'
import { links } from '../../content/links'
import { platforms } from '../../content/platforms'
import { playSound } from '../../composables/sound'
import { t } from '../../i18n'

/**
 * Lista de links (a mesma fonte para a seção Links e para a página /links).
 *   - rows:  linhas leves, para a seção do portfólio
 *   - stack: na página /links, um painel só, compacto, com uma linha por link
 *            (o e-mail ganha um botão de copiar no lugar da seta)
 */
withDefaults(defineProps<{ variant?: 'rows' | 'stack' }>(), { variant: 'rows' })

const copied = ref(false)
let timer = 0
async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    copied.value = true
    playSound('copy')
    window.clearTimeout(timer)
    timer = window.setTimeout(() => (copied.value = false), 2400)
  } catch {
    copied.value = false
  }
}

const isEmail = (url: string) => url.startsWith('mailto:')
</script>

<template>
  <div class="linklist" :class="`linklist--${variant}`">
    <ul v-if="variant === 'stack'" role="list" class="links__stack">
      <li v-for="(link, i) in links" :key="link.url" class="links__entry" :class="{ 'has-copy': isEmail(link.url) }" :style="{ '--i': i }">
        <a
          class="links__item"
          :href="link.url"
          :target="isEmail(link.url) ? undefined : '_blank'"
          :rel="isEmail(link.url) ? undefined : 'noopener noreferrer me'"
        >
          <span class="links__badge" aria-hidden="true">
            <svg class="links__icon" viewBox="0 0 24 24"><path :d="platforms[link.platform].icon" /></svg>
          </span>
          <span class="links__name">{{ platforms[link.platform].label }}</span>
          <span class="links__handle">{{ isEmail(link.url) && copied ? t('links.emailCopied') : link.handle }}</span>
          <svg v-if="!isEmail(link.url)" class="links__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
          <span v-if="!isEmail(link.url)" class="sr-only">{{ t('common.opensInNewTab') }}</span>
        </a>
        <button v-if="isEmail(link.url)" type="button" class="links__copy-icon" :class="{ 'is-done': copied }" :title="t('links.copyEmail')" @click="copy(link.handle)">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path v-if="copied" d="M5 12.5 10 17.5 19 7" />
            <template v-else>
              <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
              <path d="M15.5 8.5V6.5A2 2 0 0 0 13.5 4.5H6.5A2 2 0 0 0 4.5 6.5V13.5A2 2 0 0 0 6.5 15.5H8.5" />
            </template>
          </svg>
          <span class="sr-only">{{ t('links.copyEmail') }}</span>
        </button>
      </li>
    </ul>

    <ul v-else role="list" class="links__rows">
      <li v-for="(link, i) in links" :key="link.url" class="links__row-item" :style="{ '--i': i }">
        <a
          class="links__row"
          :href="link.url"
          :target="isEmail(link.url) ? undefined : '_blank'"
          :rel="isEmail(link.url) ? undefined : 'noopener noreferrer me'"
        >
          <svg class="links__icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="platforms[link.platform].icon" /></svg>
          <span class="links__name">{{ platforms[link.platform].label }}</span>
          <span class="links__handle">{{ link.handle }}</span>
          <svg class="links__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
          <span v-if="!isEmail(link.url)" class="sr-only">{{ t('common.opensInNewTab') }}</span>
        </a>
        <button v-if="isEmail(link.url)" type="button" class="links__copy" @click="copy(link.handle)">
          {{ copied ? t('links.emailCopied') : t('links.copyEmail') }}
        </button>
      </li>
    </ul>
    <p class="sr-only" aria-live="polite">{{ copied ? t('links.emailCopied') : '' }}</p>
  </div>
</template>

<style scoped>
/* Raiz com nome próprio: a seção que usa esta lista também se chama "links". */
.linklist {
  display: grid;
  gap: 0.9rem;
}

/* Painel da página /links: um bloco só, linhas separadas por um fio de luz. */
.links__stack {
  display: grid;
  padding: 0.35rem;
  border-radius: 22px;
  background: rgb(255 252 244 / 0.58);
  box-shadow:
    0 0 0 1px rgb(255 252 240 / 0.95),
    0 24px 48px -28px rgb(120 70 40 / 0.55);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.links__entry {
  position: relative;
}

.links__entry + .links__entry::before {
  content: '';
  position: absolute;
  left: 4.1rem;
  right: 1rem;
  top: 0;
  height: 1px;
  background: linear-gradient(90deg, rgb(160 120 70 / 0.22), rgb(160 120 70 / 0.06));
}

.links__item {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: 2.6rem minmax(0, 1fr) 1.1rem;
  grid-template-areas:
    'badge name arrow'
    'badge handle arrow';
  align-items: center;
  column-gap: 0.95rem;
  min-height: 4.4rem;
  padding: 0.7rem 1rem 0.7rem 0.75rem;
  border-radius: 18px;
  color: var(--fg);
  text-decoration: none;
  transition: background-color var(--dur-soft) var(--ease-dream);
}

.links__entry.has-copy .links__item {
  padding-right: 3.6rem;
}

.links__item:hover,
.links__item:focus-visible {
  background: rgb(255 253 246 / 0.82);
}

.links__badge {
  grid-area: badge;
  display: grid;
  place-items: center;
  width: 2.6rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fffdf4, #f6ead0);
  box-shadow:
    0 0 0 1px rgb(255 255 250 / 0.9),
    0 6px 14px -8px rgb(120 70 40 / 0.6);
  transition: box-shadow var(--dur-soft) var(--ease-dream);
}

.links__item:hover .links__badge {
  box-shadow:
    0 0 0 1px #fffdf6,
    0 6px 14px -8px rgb(120 70 40 / 0.6),
    0 0 18px rgb(255 236 196 / 0.95);
}

.links__badge .links__icon {
  width: 1.25rem;
  height: 1.25rem;
}

.links__stack .links__name {
  grid-area: name;
  align-self: end;
  font-size: var(--text-md);
  font-weight: 450;
  line-height: 1.2;
}

.links__stack .links__handle {
  grid-area: handle;
  align-self: start;
  font-size: var(--text-sm);
}

.links__stack .links__arrow {
  grid-area: arrow;
}

.links__copy-icon {
  position: absolute;
  right: 0.55rem;
  top: 50%;
  translate: 0 -50%;
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--fg-2);
  transition:
    background-color var(--dur-quick),
    color var(--dur-quick);
}

.links__copy-icon:hover {
  background: rgb(255 253 246 / 0.9);
  color: var(--fg);
}

.links__copy-icon.is-done {
  color: #6f8a3a;
}

.links__copy-icon svg {
  width: 1.15rem;
  height: 1.15rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Linhas */
.links__rows {
  display: grid;
}

.linklist--rows .links__rows {
  border-top: 1px solid var(--line);
}

.links__row-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.linklist--rows .links__row-item {
  border-bottom: 1px solid var(--line);
}

.links__row {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: 1.6rem minmax(0, auto) minmax(0, 1fr) 1.2rem;
  align-items: center;
  gap: 1.1rem;
  flex: 1;
  min-height: 4.25rem;
  padding: 0.9rem 0.25rem;
  color: var(--fg);
  text-decoration: none;
}

.links__row::before {
  content: '';
  position: absolute;
  inset: 0 -1rem;
  z-index: -1;
  border-radius: 999px;
  background: radial-gradient(60% 120% at 20% 50%, rgb(255 251 234 / 0.8), transparent 70%);
  opacity: 0;
  transition: opacity var(--dur-soft) var(--ease-dream);
}

.links__row:hover::before,
.links__row:focus-visible::before {
  opacity: 1;
}

.links__icon {
  width: 1.45rem;
  height: 1.45rem;
  fill: currentColor;
}

.links__name {
  font-size: var(--text-lg);
  font-weight: 400;
}

.links__handle {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-prose);
  font-size: var(--text-md);
  color: var(--fg-2);
}

.links__arrow {
  width: 1.1rem;
  height: 1.1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: translate var(--dur-soft) var(--ease-surface);
}

.links__row:hover .links__arrow,
.links__item:hover .links__arrow {
  translate: 3px -3px;
}

.links__copy {
  flex: none;
  min-height: 2.75rem;
  padding: 0 0.25rem;
  border: 0;
  background: none;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--fg-2);
  text-decoration: underline;
  text-underline-offset: 0.25em;
  text-decoration-color: var(--line-strong);
}

.links__copy:hover {
  color: var(--fg);
  text-decoration-color: currentColor;
}

/* Entrada da página /links: as linhas sobem como luz da manhã. */
.linklist--stack .links__entry {
  animation: rise 0.9s var(--ease-surface) both;
  animation-delay: calc(0.5s + var(--i) * 0.09s);
}

@keyframes rise {
  from {
    opacity: 0;
    translate: 0 14px;
    filter: blur(6px);
  }
}

@media (max-width: 560px) {
  .links__row {
    grid-template-columns: 1.4rem minmax(0, 1fr) 1.1rem;
    grid-template-areas:
      'icon name arrow'
      'icon handle arrow';
    gap: 0.1rem 0.9rem;
  }

  .links__row .links__icon {
    grid-area: icon;
  }

  .links__row .links__name {
    grid-area: name;
  }

  .links__row .links__handle {
    grid-area: handle;
    font-size: var(--text-sm);
  }

  .links__row .links__arrow {
    grid-area: arrow;
  }

  .links__row-item {
    flex-wrap: wrap;
    gap: 0;
  }

  /* Abaixo do e-mail, alinhado com o texto (a margem entra na conta da largura). */
  .links__copy {
    flex-basis: calc(100% - 2.3rem);
    margin: -0.6rem 0 0.4rem 2.3rem;
    text-align: left;
  }

}
</style>
