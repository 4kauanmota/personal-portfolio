<script setup lang="ts">
/**
 * Tarde: depois de atravessar as nuvens, a luz entra de lado, como por uma janela,
 * e a poeira flutua nos feixes. De tempos em tempos a sombra de uma nuvem passa
 * devagar por cima de tudo. Embaixo, o fundo esquenta até a cor exata em que o
 * pôr do sol começa; quem faz a ponte entre os dois é o sol que atravessa a cena
 * (TravelingSun) e o banco de nuvens da passagem (no céu do pôr do sol).
 */
const motes = [
  { x: 14, y: 12, d: 22, s: 2.5, delay: -3 },
  { x: 22, y: 30, d: 28, s: 2, delay: -11 },
  { x: 31, y: 18, d: 25, s: 3, delay: -7 },
  { x: 38, y: 44, d: 31, s: 2, delay: -17 },
  { x: 47, y: 24, d: 27, s: 2.5, delay: -5 },
  { x: 55, y: 52, d: 34, s: 2, delay: -21 },
  { x: 63, y: 14, d: 24, s: 3, delay: -9 },
  { x: 70, y: 36, d: 29, s: 2, delay: -14 },
  { x: 78, y: 60, d: 33, s: 2.5, delay: -2 },
  { x: 86, y: 26, d: 26, s: 2, delay: -19 },
  { x: 18, y: 66, d: 30, s: 2, delay: -12 },
  { x: 42, y: 76, d: 35, s: 2.5, delay: -24 },
]
</script>

<template>
  <div class="afternoon" aria-hidden="true">
    <div class="afternoon__base" />
    <!--
      A cena (feixes, poeira, sombra de nuvem) fica numa moldura parada e com as bordas
      desfeitas: por mais que as camadas andem na rolagem, nada delas aparece fora da seção
      nem chega às divisas com uma borda reta.
    -->
    <div class="afternoon__scene">
      <div class="afternoon__layer" data-depth="0.28">
        <span class="afternoon__beam afternoon__beam--1" />
        <span class="afternoon__beam afternoon__beam--2" />
        <span class="afternoon__beam afternoon__beam--3" />
      </div>
      <div class="afternoon__layer" data-depth="0.12">
        <span
          v-for="(m, i) in motes"
          :key="i"
          class="afternoon__mote"
          :style="{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.s}px`, height: `${m.s}px`, animationDuration: `${m.d}s`, animationDelay: `${m.delay}s` }"
        />
      </div>
      <div class="afternoon__layer" data-depth="0.2"><span class="afternoon__shade" /></div>
    </div>
    <!-- As nuvens que a gente atravessa ao sair do céu do início. -->
    <div class="afternoon__veil" data-depth="-0.14"><div class="afternoon__cloudbank" /></div>
  </div>
</template>

<style scoped>
.afternoon {
  position: absolute;
  inset: 0 0 -2px;
  z-index: -1;
  /* Corta só nas laterais: o véu de nuvens pode subir para dentro do início. */
  overflow-x: clip;
  pointer-events: none;
}

.afternoon__base {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    var(--b-hero-projects) 0%,
    var(--afternoon) 9%,
    #f5e8cf 45%,
    #f6e4c8 72%,
    var(--afternoon-warm) 88%,
    var(--b-projects-about) 100%
  );
}

.afternoon__scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* Some devagar perto das divisas: em cima com o véu de nuvens, embaixo com o pôr do sol. */
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 min(26vh, 16rem), #000 calc(100% - min(46vh, 26rem)), transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0, #000 min(26vh, 16rem), #000 calc(100% - min(46vh, 26rem)), transparent 100%);
}

.afternoon__layer {
  position: absolute;
  inset: -12% 0;
}

/* Luz de janela atravessando a sala. */
.afternoon__beam {
  position: absolute;
  top: -6%;
  height: 62%;
  background: linear-gradient(180deg, rgb(255 253 242 / 0.85), rgb(255 252 238 / 0));
  transform-origin: top;
  skew: -24deg 0deg;
  filter: blur(20px);
  opacity: 0.75;
  animation: window-drift 26s var(--ease-dream) infinite alternate;
}

.afternoon__beam--1 {
  left: 8%;
  width: 20vw;
}

.afternoon__beam--2 {
  left: 37%;
  width: 12vw;
  animation-delay: -8s;
}

.afternoon__beam--3 {
  left: 62%;
  width: 24vw;
  animation-delay: -15s;
}

/* Poeira na luz. */
.afternoon__mote {
  position: absolute;
  border-radius: 50%;
  background: #fffaf0;
  box-shadow: 0 0 6px 1px rgb(255 248 224 / 0.9);
  opacity: 0;
  animation: mote linear infinite;
}

/* A sombra de uma nuvem que passa lá em cima: atravessa em um minuto e some. */
.afternoon__shade {
  position: absolute;
  left: 0;
  top: 22%;
  width: min(80vw, 70rem);
  height: 44%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(168 128 80 / 0.075), rgb(168 128 80 / 0.035) 55%, transparent);
  translate: -100% 0;
  animation: shade-pass 75s linear 3s infinite backwards;
}

/* Véu de nuvens na passagem do céu para a tarde (sobe para dentro do início). */
.afternoon__veil {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(-1 * min(22vh, 12rem));
  height: min(46vh, 26rem);
  overflow: hidden;
}

.afternoon__cloudbank {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: max(120%, min(46vh, 26rem) * 2.4);
  translate: -50% 0;
  background: linear-gradient(180deg, #fffaf0, #f6ecd2);
  mask: url('../../assets/textures/cloudbank.webp') center / 100% 100% no-repeat;
  -webkit-mask: url('../../assets/textures/cloudbank.webp') center / 100% 100% no-repeat;
  opacity: 0.72;
  animation: veil-drift 70s linear infinite alternate;
}

@keyframes window-drift {
  to {
    translate: 4vw 0;
    opacity: 0.5;
  }
}

@keyframes mote {
  0% {
    transform: translate(0, 0);
    opacity: 0;
  }
  15% {
    opacity: 0.9;
  }
  85% {
    opacity: 0.8;
  }
  100% {
    transform: translate(28px, -90px);
    opacity: 0;
  }
}

@keyframes shade-pass {
  0% {
    translate: -100% 0;
  }
  70%,
  100% {
    translate: 130vw 6vh;
  }
}

@keyframes veil-drift {
  to {
    transform: translateX(6%);
  }
}

@media (max-width: 760px) {
  .afternoon__mote:nth-child(n + 7) {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .afternoon__shade {
    display: none;
  }
}
</style>
