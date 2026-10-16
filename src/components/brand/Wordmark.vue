<script setup lang="ts">
import { site } from '../../content/site'

/**
 * Logotipo "4kauanmota": o "o" é a própria luz.
 *   - display: em tamanho grande vira um anel luminoso, com um traço fino
 *     (como as auréolas desenhadas) e uma luz que percorre o anel devagar.
 *   - em tamanho pequeno (cabeçalho, rodapé) é um "o" dourado com um leve brilho,
 *     para continuar legível em qualquer fundo.
 * O texto continua real: leitores de tela e buscadores leem "4kauanmota".
 */
const props = withDefaults(defineProps<{ display?: boolean; intro?: boolean }>(), { display: false, intro: false })

const handle = site.handle
const oIndex = handle.lastIndexOf('o')
const letters = [...handle].map((char, i) => ({ char, i, isO: i === oIndex }))
</script>

<template>
  <span class="wordmark" :class="{ 'wordmark--display': props.display, 'wordmark--intro': props.intro }">
    <span class="sr-only">{{ handle }}</span>
    <span class="wordmark__glyphs" aria-hidden="true"
      ><template v-for="letter in letters" :key="letter.i"
        ><span v-if="letter.isO" class="wordmark__o-wrap"
          ><span class="wordmark__letter wordmark__o" :style="{ '--i': letter.i }">{{ letter.char }}</span></span
        ><span v-else class="wordmark__letter" :style="{ '--i': letter.i }">{{ letter.char }}</span></template
      ></span
    >
  </span>
</template>

<style scoped>
.wordmark {
  display: inline-block;
  font-family: var(--font-display);
  white-space: nowrap;
  /* É um desenho de letras, não um texto para copiar: arrastar o mouse não seleciona as letras. */
  -webkit-user-select: none;
  user-select: none;
}

.wordmark__glyphs {
  display: inline-block;
}

.wordmark__letter {
  display: inline-block;
}

/* Pequeno: um "o" aceso. */
.wordmark__o {
  position: relative;
  color: var(--logo-o, var(--logo-gold));
  text-shadow: 0 0 0.25em rgb(255 214 110 / 0.85);
}

.wordmark__o-wrap {
  position: relative;
  display: inline-block;
}

/*
 * Grande: o "o" vira um anel de luz.
 * Centro do anel no glifo da Jost: 0,273em da borda esquerda e 0,113em abaixo
 * do meio da linha (vale para qualquer altura de linha).
 */
.wordmark--display .wordmark__o {
  color: transparent;
  -webkit-text-stroke: 0.0035em var(--logo-line, rgb(70 52 24 / 0.38));
  background: conic-gradient(
    from var(--logo-spin),
    #fffef6,
    #fff3c8 18%,
    #fffef6 34%,
    #ffe7a2 52%,
    #fffef6 70%,
    #fff5d6 86%,
    #fffef6
  );
  -webkit-background-clip: text;
  background-clip: text;
  text-shadow: none;
  /* Só a borda de luz fica no filtro: o brilho largo mora no halo parado abaixo,
     e a luz que gira não obriga o navegador a refazer desfoques grandes. */
  filter: drop-shadow(0 0 0.02em rgb(255 252 236 / 0.95));
  animation: logo-spin 11s linear infinite;
  /* Camada própria: a cada quadro só o "o" é repintado, não o céu atrás dele. */
  will-change: transform;
}

/* Brilho em volta do anel: pintado uma vez, não acompanha a animação. */
.wordmark--display .wordmark__o-wrap::before {
  content: '';
  position: absolute;
  left: 0.273em;
  top: calc(50% + 0.113em);
  width: 1.12em;
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    rgb(255 248 222 / 0.24) 0%,
    rgb(255 244 204 / 0.36) 30%,
    rgb(255 238 178 / 0.74) 41%,
    rgb(255 232 160 / 0.5) 48%,
    rgb(255 226 144 / 0.24) 62%,
    rgb(255 222 130 / 0.09) 78%,
    transparent 100%
  );
  pointer-events: none;
}

/* Um pouco de luz dentro do anel. */
.wordmark--display .wordmark__o::before {
  content: '';
  position: absolute;
  left: 0.273em;
  top: calc(50% + 0.113em);
  width: 0.36em;
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(255 252 236 / 0.55), rgb(255 248 214 / 0.16) 60%, transparent);
  pointer-events: none;
}

.theme-night .wordmark--display .wordmark__o {
  --logo-line: transparent;
}

/* Abertura: as letras surgem da névoa; o "o" acende por último. */
.wordmark--intro .wordmark__letter {
  animation: letter-surface 1.5s var(--ease-surface) both;
  animation-delay: calc(0.35s + var(--i) * 0.055s);
}

.wordmark--intro .wordmark__o {
  animation:
    letter-surface 1.5s var(--ease-surface) both,
    o-ignite 1.6s var(--ease-dream) both,
    logo-spin 11s linear infinite;
  animation-delay: calc(0.35s + var(--i) * 0.055s), 1.25s, 0s;
}

.wordmark--intro .wordmark__o-wrap::before {
  animation: glow-ignite 1.8s var(--ease-dream) 1.3s both;
}

@keyframes letter-surface {
  from {
    opacity: 0;
    translate: 0 0.08em;
    filter: blur(0.05em);
  }
}

/* Acende uma vez (o clarão grande só existe aqui, na abertura). */
@keyframes o-ignite {
  from {
    filter: drop-shadow(0 0 0 transparent) drop-shadow(0 0 0 transparent) drop-shadow(0 0 0 transparent) brightness(0.92);
  }
  45% {
    filter: drop-shadow(0 0 0.04em rgb(255 252 236 / 1)) drop-shadow(0 0 0.18em rgb(255 236 170 / 0.95))
      drop-shadow(0 0 0.45em rgb(255 222 130 / 0.7)) brightness(1.04);
  }
}

@keyframes glow-ignite {
  from {
    opacity: 0;
    scale: 0.55;
  }
}

@keyframes logo-spin {
  to {
    --logo-spin: 360deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wordmark--display .wordmark__o {
    animation: none;
  }
}
</style>
