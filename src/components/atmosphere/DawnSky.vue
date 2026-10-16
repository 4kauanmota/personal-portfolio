<script setup lang="ts">
/**
 * Amanhecer: a noite clareia em violeta, lilás e rosa, o sol nasce atrás das
 * nuvens (sobe conforme a rolagem, pelo --progress da cena) e a luz volta.
 * As nuvens são um mar só: duas cristas que se sobrepõem (a de trás mais lilás,
 * a da frente mais pêssego), com a borda de cima recortada e o corpo se desfazendo
 * na cor do céu, sem faixa solta nem beirada embaixo.
 * As últimas estrelas somem no alto; um casal de pássaros cruza a luz nova;
 * embaixo, partículas de luz sobem devagar.
 */
const lastStars = [
  { x: 8, y: 3 },
  { x: 22, y: 9 },
  { x: 37, y: 4 },
  { x: 53, y: 11 },
  { x: 66, y: 5 },
  { x: 81, y: 8 },
  { x: 93, y: 3 },
  { x: 30, y: 15 },
  { x: 74, y: 16 },
]
const pollen = [
  { x: 12, d: 18, delay: -2 },
  { x: 24, d: 23, delay: -9 },
  { x: 41, d: 20, delay: -5 },
  { x: 58, d: 26, delay: -14 },
  { x: 72, d: 21, delay: -7 },
  { x: 88, d: 24, delay: -11 },
]
</script>

<template>
  <div class="dawn" aria-hidden="true">
    <div class="dawn__base" />
    <!-- Tudo o que brilha ou flutua some antes do pé da seção: o rodapé recebe só a cor do céu. -->
    <div class="dawn__scene">
      <span v-for="(s, i) in lastStars" :key="i" class="dawn__star" :style="{ left: `${s.x}%`, top: `${s.y}%` }" />
      <div class="dawn__sunrise"><div class="dawn__sun" /></div>
      <div class="dawn__ridge dawn__ridge--far" data-depth="0.1"><div class="dawn__clouds dawn__clouds--far" /></div>
      <svg class="dawn__flock" viewBox="0 0 80 30">
        <path class="bird" d="M8 16 q 6 -6 12 0 q 6 -6 12 0" />
        <path class="bird bird--2" d="M46 8 q 5 -5 10 0 q 5 -5 10 0" />
      </svg>
      <div class="dawn__ridge dawn__ridge--near" data-depth="0.04"><div class="dawn__clouds dawn__clouds--near" /></div>
      <span v-for="(p, i) in pollen" :key="`p${i}`" class="dawn__pollen" :style="{ left: `${p.x}%`, animationDuration: `${p.d}s`, animationDelay: `${p.delay}s` }" />
    </div>
    <!-- O começo do amanhecer ainda é noite para o cabeçalho. -->
    <div class="dawn__tone" data-header-tone="night" />
  </div>
</template>

<style scoped>
.dawn {
  position: absolute;
  inset: 0 0 -2px;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.dawn__scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(180deg, #000 0, #000 calc(100% - min(46vh, 24rem)), transparent calc(100% - 2rem));
  mask-image: linear-gradient(180deg, #000 0, #000 calc(100% - min(46vh, 24rem)), transparent calc(100% - 2rem));
}

.dawn__base {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    var(--b-night-dawn) 0%,
    #2c2f5c calc(var(--passage) * 0.18),
    var(--dawn-violet) calc(var(--passage) * 0.34),
    #7d6da3 calc(var(--passage) * 0.5),
    var(--dawn-lilac) calc(var(--passage) * 0.63),
    #d4a3bd calc(var(--passage) * 0.75),
    var(--dawn-pink) calc(var(--passage) * 0.86),
    var(--dawn-peach) calc(var(--passage) * 1),
    var(--dawn-gold) calc(var(--passage) * 1.22),
    #f9ebc6 calc(var(--passage) * 1.55),
    var(--b-dawn-footer) 100%
  );
}

.dawn__tone {
  position: absolute;
  left: 0;
  top: 0;
  width: 1px;
  height: calc(var(--passage) * 0.42);
}

.dawn__star {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #fffaf0;
  box-shadow: 0 0 5px 1px rgb(255 248 230 / 0.6);
  animation: fade-star 5s ease-in-out infinite alternate;
}

/* O sol nasce na linha das nuvens e sobe com a rolagem. */
.dawn__sunrise {
  position: absolute;
  inset: 0 0 auto;
  height: calc(var(--passage) * 1.4);
  container-type: size;
}

.dawn__sun {
  position: absolute;
  left: 30%;
  top: 70%;
  width: min(64rem, 130vw);
  aspect-ratio: 1;
  translate: -50% calc(-50% + (1 - var(--progress, 0.5)) * 28cqh);
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    #fff8e6 0%,
    #ffeec4 8%,
    rgb(255 224 170 / 0.75) 18%,
    rgb(255 206 168 / 0.32) 40%,
    rgb(255 196 190 / 0.12) 62%,
    transparent 78%
  );
  will-change: translate;
}

.dawn__ridge {
  position: absolute;
  left: 0;
  right: 0;
}

.dawn__ridge--far {
  top: calc(var(--passage) * 0.38);
  height: calc(var(--passage) * 0.74);
}

.dawn__ridge--near {
  top: calc(var(--passage) * 0.6);
  height: calc(var(--passage) * 0.78);
}

/*
 * Máscara em duas camadas somadas: a borda recortada da textura no alto e,
 * do meio da crista para baixo, um corpo cheio que vai sumindo. Assim a nuvem
 * não tem "fundo": vira céu.
 */
.dawn__clouds {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: max(116%, var(--passage) * 1.3);
  translate: -50% 0;
  -webkit-mask:
    url('../../assets/textures/cloudbank.webp') top center / 100% 64% no-repeat,
    linear-gradient(180deg, transparent 30%, #000 42%, #000 58%, transparent 100%);
  mask:
    url('../../assets/textures/cloudbank.webp') top center / 100% 64% no-repeat,
    linear-gradient(180deg, transparent 30%, #000 42%, #000 58%, transparent 100%);
  animation: dawn-drift 80s linear infinite alternate;
}

.dawn__clouds--far {
  background: linear-gradient(180deg, #c7aed6 0%, #d9b2cf 40%, var(--dawn-pink) 75%);
  opacity: 0.6;
}

.dawn__clouds--near {
  background: linear-gradient(180deg, #f8cdd0 0%, #fcd8c4 38%, var(--dawn-peach) 70%, var(--dawn-gold) 100%);
  opacity: 0.78;
  animation-duration: 110s;
  animation-direction: alternate-reverse;
}

/* Dois pássaros atravessam a luz nova, longe, entre as cristas. */
.dawn__flock {
  position: absolute;
  left: 0;
  top: calc(var(--passage) * 0.56);
  width: clamp(3.5rem, 2.5rem + 3vw, 5.5rem);
  overflow: visible;
  translate: -10vw 0;
  animation: dawn-cross 58s linear 6s infinite backwards;
}

.bird {
  fill: none;
  stroke: rgb(74 52 86 / 0.5);
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  transform-box: fill-box;
  transform-origin: center;
  animation: flap 1.5s ease-in-out infinite alternate;
}

.bird--2 {
  animation-delay: -0.6s;
}

.dawn__pollen {
  position: absolute;
  bottom: 6%;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #fffbea;
  box-shadow: 0 0 8px 2px rgb(255 240 200 / 0.8);
  opacity: 0;
  animation: pollen linear infinite;
}

@keyframes fade-star {
  from {
    opacity: 0.15;
  }
  to {
    opacity: 0.75;
  }
}

@keyframes dawn-drift {
  to {
    transform: translateX(6%);
  }
}

@keyframes flap {
  to {
    transform: scaleY(0.5);
  }
}

@keyframes dawn-cross {
  0% {
    translate: -10vw 0;
  }
  55% {
    translate: 110vw -5vh;
  }
  100% {
    translate: 110vw -5vh;
  }
}

@keyframes pollen {
  0% {
    transform: translate(0, 0);
    opacity: 0;
  }
  20% {
    opacity: 0.85;
  }
  100% {
    transform: translate(26px, -46vh);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dawn__flock {
    display: none;
  }
}
</style>
