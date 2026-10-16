<script setup lang="ts">
/**
 * Noite: estrelas, a luz fria de uma lua fora do quadro, algumas estrelas de
 * quatro pontas (as que brilham mais, como nos sonhos) e, de vez em quando,
 * uma estrela cadente. Tudo atrás do conteúdo, em profundidades diferentes.
 * As fitas soltas no ar ficam no palco das curiosidades, perto da TV.
 */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}
const rand = seeded(97)
const stars = Array.from({ length: 46 }, () => ({
  x: rand() * 100,
  y: rand() * 100,
  size: rand() < 0.15 ? 2.6 : rand() < 0.5 ? 1.8 : 1.2,
  duration: 2.5 + rand() * 4,
  delay: -rand() * 6,
}))

/** Estrelas de quatro pontas: poucas, maiores, pulsando devagar. */
const sparkles = [
  { x: 7, y: 9, s: 26, d: 7, delay: -1 },
  { x: 91, y: 14, s: 18, d: 9, delay: -4 },
  { x: 78, y: 4, s: 12, d: 6, delay: -2.5 },
  { x: 16, y: 46, s: 14, d: 8, delay: -6 },
  { x: 95, y: 58, s: 22, d: 10, delay: -3 },
  { x: 4, y: 78, s: 16, d: 7.5, delay: -5 },
  { x: 60, y: 92, s: 11, d: 6.5, delay: -1.5 },
]

/** Estrelas cadentes: atravessam o alto do céu de tempos em tempos. */
const meteors = [
  { top: 8, left: 62, delay: 3 },
  { top: 22, left: 18, delay: 11 },
]
</script>

<template>
  <div class="nightsky" aria-hidden="true">
    <div class="nightsky__clip">
    <div class="nightsky__base" />
    <div class="nightsky__moonlight" />
    <div class="nightsky__layer" data-depth="0.42">
      <span
        v-for="(s, i) in stars"
        :key="i"
        class="star"
        :style="{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.size}px`, height: `${s.size}px`, animationDuration: `${s.duration}s`, animationDelay: `${s.delay}s` }"
      />
    </div>

    <div class="nightsky__layer" data-depth="0.3">
      <svg
        v-for="(sp, i) in sparkles"
        :key="`s${i}`"
        class="sparkle"
        viewBox="-50 -50 100 100"
        :style="{ left: `${sp.x}%`, top: `${sp.y}%`, width: `${sp.s}px`, animationDuration: `${sp.d}s`, animationDelay: `${sp.delay}s` }"
      >
        <path d="M0 -50 C 5 -9, 9 -5, 34 0 C 9 5, 5 9, 0 50 C -5 9, -9 5, -34 0 C -9 -5, -5 -9, 0 -50 Z" />
      </svg>
    </div>

    <div class="nightsky__layer nightsky__meteors" data-depth="0.5">
      <span v-for="(m, i) in meteors" :key="`m${i}`" class="meteor" :style="{ top: `${m.top}%`, left: `${m.left}%`, animationDelay: `${m.delay}s` }" />
    </div>
    </div>
    <div class="nightsky__dusk" data-depth="-0.06"><div class="nightsky__dusk-clouds" /></div>
    <div class="tone-marker" data-header-tone="night" />
  </div>
</template>

<style scoped>
.nightsky {
  position: absolute;
  inset: 0 0 -2px;
  z-index: -1;
  overflow-x: clip;
  pointer-events: none;
}

.tone-marker {
  position: absolute;
  inset: 0 auto 0 0;
  width: 1px;
}

.nightsky__clip {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

/* Nuvens do anoitecer: escuras, com a borda de cima ainda tocada pelo rosa do sol. */
.nightsky__dusk {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(var(--passage) * -0.55);
  height: calc(var(--passage) * 1.05);
}

.nightsky__dusk-clouds {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  /* Nunca mais estreita que a proporção da textura: no celular as nuvens não viram espinhos. */
  width: max(124%, var(--passage) * 2.6);
  translate: -50% 0;
  background: linear-gradient(180deg, #e7a2b0 0%, #8d6f9f 34%, #3c3a6c 70%, #262a56 100%);
  mask: url('../../assets/textures/cloudbank.webp') center / 100% 100% no-repeat;
  -webkit-mask: url('../../assets/textures/cloudbank.webp') center / 100% 100% no-repeat;
  opacity: 0.7;
  animation: dusk-drift 120s linear infinite alternate;
}

@keyframes dusk-drift {
  to {
    transform: translateX(7%);
  }
}

.nightsky__base {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    var(--b-about-night) 0%,
    #232857 10%,
    var(--night-1) 30%,
    var(--night-2) 58%,
    var(--night-3) 82%,
    var(--b-night-dawn) 100%
  );
}

.nightsky__moonlight {
  position: absolute;
  right: -18%;
  top: 4%;
  width: min(70rem, 110vw);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(214 220 255 / 0.14), rgb(214 220 255 / 0.05) 50%, transparent);
}

.nightsky__layer {
  position: absolute;
  inset: 0;
}

.star {
  position: absolute;
  border-radius: 50%;
  background: #fffaf0;
  box-shadow: 0 0 6px 1px rgb(255 248 230 / 0.7);
  animation: twinkle ease-in-out infinite alternate;
}

/* Estrela de quatro pontas: cresce e brilha devagar, como se respirasse. */
.sparkle {
  position: absolute;
  aspect-ratio: 1;
  translate: -50% -50%;
  overflow: visible;
  filter: drop-shadow(0 0 4px rgb(255 246 214 / 0.9)) drop-shadow(0 0 12px rgb(255 236 190 / 0.45));
  animation: sparkle-breathe ease-in-out infinite alternate;
}

.sparkle path {
  fill: #fdf5dc;
}

/* Estrela cadente: um risco de luz que atravessa e some; quase sempre invisível. */
.meteor {
  position: absolute;
  width: 9rem;
  height: 1.5px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgb(255 248 230 / 0.15) 40%, rgb(255 250 236 / 0.95));
  box-shadow: 0 0 8px rgb(255 244 214 / 0.6);
  rotate: 158deg;
  opacity: 0;
  animation: meteor 13s var(--ease-in-out) infinite;
}

@keyframes twinkle {
  from {
    opacity: 0.25;
  }
  to {
    opacity: 1;
  }
}

@keyframes sparkle-breathe {
  from {
    opacity: 0.45;
    scale: 0.72;
    rotate: -6deg;
  }
  to {
    opacity: 1;
    scale: 1.08;
    rotate: 6deg;
  }
}

@keyframes meteor {
  0%,
  86% {
    opacity: 0;
    transform: translateX(0);
  }
  88% {
    opacity: 1;
  }
  96% {
    opacity: 0;
    transform: translateX(34vw);
  }
  100% {
    opacity: 0;
    transform: translateX(34vw);
  }
}


@media (max-width: 760px) {
  .star:nth-child(3n) {
    display: none;
  }

  .meteor {
    width: 6rem;
  }
}
</style>
