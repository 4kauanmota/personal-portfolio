<script setup lang="ts">
import { ref } from 'vue'
import Wordmark from '../components/brand/Wordmark.vue'
import ProfilePortrait from '../components/hero/ProfilePortrait.vue'
import SiteHeader from '../components/layout/SiteHeader.vue'
import LinkList from '../components/links/LinkList.vue'
import { usePointerDepth, useInView } from '../composables/motion'
import { site } from '../content/site'
import { hrefFor, t } from '../i18n'

/**
 * Página /links: o destino do link da bio. Compacta, de bolso:
 * o retrato com a auréola de partículas, o nome e um painel só com os links,
 * centralizados num céu limpo (lilás no alto, dourado embaixo).
 * O céu tem pouco: a luz atrás do retrato, as últimas estrelas, duas estrelas de
 * quatro pontas que respiram e um mar de nuvens baixo, onde a coluna "pousa".
 */
const root = ref<HTMLElement | null>(null)
usePointerDepth(root, useInView(root))
</script>

<template>
  <SiteHeader minimal />
  <main id="conteudo" ref="root" class="bio theme-light" tabindex="-1">
    <div class="bio__sky" aria-hidden="true">
      <span v-for="n in 7" :key="n" class="bio__star" :style="{ left: `${(n * 137) % 100}%`, top: `${(n * 53) % 18}%`, animationDelay: `${-n * 0.7}s` }" />
      <div class="bio__glow" />
      <div class="bio__clouds" />
    </div>

    <div class="bio__column">
      <header class="bio__head">
        <ProfilePortrait class="bio__portrait" compact />
        <h1 class="bio__title">
          <svg class="bio__spark bio__spark--a" viewBox="-50 -50 100 100" aria-hidden="true">
            <path d="M0 -50 C 5 -9, 9 -5, 34 0 C 9 5, 5 9, 0 50 C -5 9, -9 5, -34 0 C -9 -5, -5 -9, 0 -50 Z" />
          </svg>
          <Wordmark display intro />
          <svg class="bio__spark bio__spark--b" viewBox="-50 -50 100 100" aria-hidden="true">
            <path d="M0 -50 C 5 -9, 9 -5, 34 0 C 9 5, 5 9, 0 50 C -5 9, -9 5, -34 0 C -9 -5, -5 -9, 0 -50 Z" />
          </svg>
        </h1>
        <p class="bio__name">{{ site.name }}</p>
      </header>

      <LinkList variant="stack" class="bio__links" />

      <a class="bio__home" :href="hrefFor('home')">
        <span>{{ t('links.fullPortfolio') }}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </a>
    </div>
  </main>
</template>

<style scoped>
.bio {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 100svh;
  padding: calc(var(--header-h) + 1rem) var(--gutter) 3rem;
  overflow: hidden;
}

/* O dia num céu só: amanhecer em cima, sol pleno embaixo. */
.bio__sky {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    180deg,
    #b3a2d0 0%,
    #cfaecf 16%,
    var(--dawn-pink) 30%,
    var(--dawn-peach) 46%,
    #f4d98f 66%,
    var(--sun) 82%,
    #f1df8a 100%
  );
  pointer-events: none;
}

.bio__star {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #fffaf0;
  box-shadow: 0 0 5px 1px rgb(255 248 230 / 0.7);
  animation: bio-star 4s ease-in-out infinite alternate;
}

.bio__glow {
  position: absolute;
  left: 50%;
  top: 30%;
  width: min(54rem, 150vw);
  aspect-ratio: 1;
  translate: calc(-50% + var(--px, 0) * -10px) calc(-50% + var(--py, 0) * -6px);
  border-radius: 50%;
  background: radial-gradient(closest-side, #fffaf0, rgb(255 238 204 / 0.6) 30%, rgb(255 222 196 / 0.2) 60%, transparent);
  animation: bio-breathe 9s var(--ease-dream) infinite alternate;
}

/*
 * Um só mar de nuvens, baixo: borda recortada em cima e o corpo se desfazendo
 * no dourado (sem beirada embaixo, sem segunda faixa).
 */
.bio__clouds {
  position: absolute;
  left: 50%;
  bottom: -4%;
  width: max(120%, 64rem);
  height: 30%;
  translate: calc(-50% + var(--px, 0) * -14px) 0;
  background: linear-gradient(180deg, #fffaf0, #fbefc6 60%, #f1df8a);
  -webkit-mask:
    url('../assets/textures/cloudbank.webp') top center / 100% 70% no-repeat,
    linear-gradient(180deg, transparent 32%, #000 46%);
  mask:
    url('../assets/textures/cloudbank.webp') top center / 100% 70% no-repeat,
    linear-gradient(180deg, transparent 32%, #000 46%);
  opacity: 0.8;
  animation: bio-drift 90s linear infinite alternate;
}

.bio__column {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 1.35rem;
  width: min(100%, 25rem);
}

.bio__head {
  display: grid;
  justify-items: center;
  gap: 0.35rem;
  text-align: center;
}

.bio__title {
  position: relative;
  margin-top: 0.4rem;
  font-size: clamp(2.9rem, 2.2rem + 4vw, 4rem);
  font-weight: 200;
  line-height: 1;
  letter-spacing: -0.03em;
  color: rgb(42 37 24 / 0.9);
}

/* Duas estrelas de quatro pontas ladeando o nome, respirando fora de compasso. */
.bio__spark {
  position: absolute;
  width: 0.9rem;
  max-width: none;
  overflow: visible;
  filter: drop-shadow(0 0 4px rgb(255 250 230 / 1)) drop-shadow(0 0 10px rgb(255 236 190 / 0.7));
  animation: bio-spark 4.6s var(--ease-in-out) infinite alternate;
}

.bio__spark path {
  fill: #fffaf0;
}

.bio__spark--a {
  left: -1.3rem;
  top: -0.2rem;
}

.bio__spark--b {
  right: -1.1rem;
  bottom: 0.1rem;
  width: 0.65rem;
  animation-delay: -2.3s;
}

.bio__name {
  /* Um pouco mais de ar entre a assinatura e o nome, como na abertura do site. */
  margin-top: 0.55rem;
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--fg-2);
}

.bio__links {
  width: 100%;
}

.bio__home {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 3rem;
  padding: 0 1.4rem;
  border-radius: 999px;
  background: var(--ink);
  color: var(--bleach);
  font-size: var(--text-sm);
  font-weight: 450;
  text-decoration: none;
  box-shadow: 0 14px 30px -16px rgb(42 37 24 / 0.6);
  transition:
    background-color var(--dur-quick),
    box-shadow var(--dur-soft);
  animation: bio-rise 0.9s var(--ease-surface) 0.85s both;
}

.bio__home svg {
  width: 1.1rem;
  height: 1.1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: translate var(--dur-soft) var(--ease-surface);
}

.bio__home:hover {
  background: color-mix(in srgb, var(--ink) 86%, var(--sun));
  box-shadow:
    0 14px 30px -16px rgb(42 37 24 / 0.6),
    0 0 26px rgb(255 240 200 / 0.8);
}

.bio__home:hover svg {
  translate: 3px 0;
}

@keyframes bio-star {
  from {
    opacity: 0.2;
  }
  to {
    opacity: 0.85;
  }
}

@keyframes bio-breathe {
  to {
    scale: 1.06;
    opacity: 0.85;
  }
}

@keyframes bio-drift {
  to {
    transform: translateX(5%);
  }
}

@keyframes bio-spark {
  from {
    opacity: 0.5;
    scale: 0.7;
    rotate: -8deg;
  }
  to {
    opacity: 1;
    scale: 1.1;
    rotate: 8deg;
  }
}

@keyframes bio-rise {
  from {
    opacity: 0;
    translate: 0 12px;
  }
}

@media (max-height: 700px) {
  .bio {
    place-items: start center;
  }
}
</style>
