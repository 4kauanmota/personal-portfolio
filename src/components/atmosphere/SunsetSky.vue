<script setup lang="ts">
/**
 * Pôr do sol: pêssego, damasco e coral; embaixo, o céu passa por rosa e violeta
 * até a noite, onde as primeiras estrelas aparecem.
 *
 * O sol não mora aqui: TravelingSun atravessa a tarde, o pôr do sol e o anoitecer
 * por cima dos céus de todas as seções (veja HomePage), para a luz ser uma só.
 *
 * Na divisa com a tarde, um banco de nuvens sobe para dentro da seção anterior:
 * duas cristas que se sobrepõem, com a borda de cima recortada e o corpo se desfazendo
 * na cor do céu. Por ele sobem fagulhas de luz. Mais abaixo, nuvens soltas e
 * pássaros, em profundidades diferentes, numa moldura com as bordas desfeitas.
 */
const embers = [
  { x: 8, y: 62, d: 17, s: 3, delay: -2 },
  { x: 17, y: 48, d: 21, s: 2, delay: -9 },
  { x: 26, y: 70, d: 19, s: 2.5, delay: -14 },
  { x: 37, y: 55, d: 23, s: 2, delay: -5 },
  { x: 46, y: 66, d: 18, s: 3, delay: -11 },
  { x: 55, y: 50, d: 22, s: 2, delay: -17 },
  { x: 64, y: 72, d: 20, s: 2.5, delay: -7 },
  { x: 73, y: 58, d: 24, s: 2, delay: -3 },
  { x: 82, y: 68, d: 18, s: 3, delay: -13 },
  { x: 91, y: 52, d: 21, s: 2, delay: -19 },
]

const firstStars = [
  { x: 12, y: 78, d: 3.2 },
  { x: 27, y: 88, d: 4.1 },
  { x: 44, y: 82, d: 3.6 },
  { x: 61, y: 91, d: 5.2 },
  { x: 76, y: 80, d: 4.4 },
  { x: 89, y: 87, d: 3.9 },
  { x: 35, y: 95, d: 4.8 },
  { x: 68, y: 97, d: 3.3 },
]
</script>

<template>
  <div class="sunset" aria-hidden="true">
    <div class="sunset__base" />

    <!-- A passagem: o banco de nuvens que costura a tarde ao pôr do sol. -->
    <div class="sunset__passage">
      <div class="sunset__ridge sunset__ridge--far" data-depth="0.08"><div class="sunset__bank sunset__bank--far" /></div>
      <div class="sunset__ridge sunset__ridge--near" data-depth="0.03"><div class="sunset__bank sunset__bank--near" /></div>
      <span
        v-for="(e, i) in embers"
        :key="`e${i}`"
        class="sunset__ember"
        :style="{ left: `${e.x}%`, top: `${e.y}%`, width: `${e.s}px`, height: `${e.s}px`, animationDuration: `${e.d}s`, animationDelay: `${e.delay}s` }"
      />
    </div>

    <div class="sunset__scene">
      <div class="sunset__layer" data-depth="0.22">
        <div class="sunset__puff sunset__puff--a" />
        <div class="sunset__puff sunset__puff--c" />
      </div>
      <div class="sunset__layer" data-depth="0.1">
        <div class="sunset__puff sunset__puff--b" />
      </div>
      <svg class="sunset__birds" viewBox="0 0 120 40" data-depth="0.22">
        <path class="bird" d="M10 20 q 6 -6 12 0 q 6 -6 12 0" />
        <path class="bird bird--2" d="M48 12 q 5 -5 10 0 q 5 -5 10 0" />
        <path class="bird bird--3" d="M78 26 q 4 -4 8 0 q 4 -4 8 0" />
      </svg>
    </div>

    <span v-for="(s, i) in firstStars" :key="i" class="sunset__star" :style="{ left: `${s.x}%`, top: `${s.y}%`, animationDuration: `${s.d}s` }" />
    <!-- O cabeçalho acompanha: pêssego no pôr do sol e, daqui para baixo, anoitecer. -->
    <div class="sunset__warm" data-header-tone="sunset" />
    <div class="sunset__tone" data-header-tone="night" />
  </div>
</template>

<style scoped>
.sunset {
  position: absolute;
  inset: 0 0 -2px;
  z-index: -1;
  /* Só corta nas laterais: o banco de nuvens da passagem sobe para dentro da tarde. */
  overflow-x: clip;
  pointer-events: none;
}

.sunset__base {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    var(--b-projects-about) 0%,
    #f8d6b4 3%,
    var(--sunset-peach) 8%,
    #f7c99f 18%,
    var(--sunset-apricot) 32%,
    #f4b48b 50%,
    #f3ad86 calc(100% - var(--passage) * 1.6),
    var(--sunset-coral) calc(100% - var(--passage) * 1.15),
    #ea9890 calc(100% - var(--passage) * 0.85),
    var(--sunset-rose) calc(100% - var(--passage) * 0.68),
    var(--dusk-mauve) calc(100% - var(--passage) * 0.46),
    var(--dusk-violet) calc(100% - var(--passage) * 0.24),
    var(--dusk-indigo) calc(100% - var(--passage) * 0.08),
    var(--b-about-night) 100%
  );
}

.sunset__warm {
  position: absolute;
  left: 0;
  top: 2%;
  bottom: calc(var(--passage) * 0.3);
  width: 1px;
}

.sunset__tone {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 1px;
  height: calc(var(--passage) * 0.3);
}

/* ---------- Passagem: banco de nuvens na divisa com a tarde ---------- */
.sunset__passage {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(-1 * min(34vh, 20rem));
  height: min(78vh, 44rem);
  overflow-x: clip;
}

.sunset__ridge {
  position: absolute;
  left: 0;
  right: 0;
}

.sunset__ridge--far {
  top: 4%;
  height: 66%;
}

.sunset__ridge--near {
  top: 26%;
  height: 74%;
}

/*
 * Borda de cima recortada (textura) somada a um corpo cheio que vai sumindo:
 * a nuvem não tem fundo, vira céu. Largura nunca menor que a proporção da textura.
 */
.sunset__bank {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: max(118%, min(78vh, 44rem) * 1.5);
  translate: -50% 0;
  -webkit-mask:
    url('../../assets/textures/cloudbank.webp') top center / 100% 62% no-repeat,
    linear-gradient(180deg, transparent 28%, #000 40%, #000 56%, transparent 100%);
  mask:
    url('../../assets/textures/cloudbank.webp') top center / 100% 62% no-repeat,
    linear-gradient(180deg, transparent 28%, #000 40%, #000 56%, transparent 100%);
  animation: bank-drift 90s linear infinite alternate;
}

.sunset__bank--far {
  background: linear-gradient(180deg, #fffaf1 0%, #fbeedc 40%, #f8dcbd 100%);
  opacity: 0.62;
}

.sunset__bank--near {
  background: linear-gradient(180deg, #fff5e8 0%, #fbe3c8 36%, var(--sunset-peach) 74%, #f7cfa8 100%);
  opacity: 0.72;
  animation-duration: 120s;
  animation-direction: alternate-reverse;
}

/* Fagulhas de luz subindo pela passagem. */
.sunset__ember {
  position: absolute;
  border-radius: 50%;
  background: #fff6dc;
  box-shadow: 0 0 7px 2px rgb(255 226 170 / 0.85);
  opacity: 0;
  animation: ember linear infinite;
}

/* ---------- Cena: nuvens soltas e pássaros ---------- */
.sunset__scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 min(30vh, 18rem), #000 calc(100% - var(--passage) * 1.3), transparent calc(100% - var(--passage) * 0.7));
  mask-image: linear-gradient(180deg, transparent 0, #000 min(30vh, 18rem), #000 calc(100% - var(--passage) * 1.3), transparent calc(100% - var(--passage) * 0.7));
}

.sunset__layer {
  position: absolute;
  inset: -10% 0;
}

/* Nuvens pintadas, tingidas de pêssego e damasco, na proporção da textura (nada esticado). */
.sunset__puff {
  position: absolute;
  aspect-ratio: 16 / 9;
  background: linear-gradient(180deg, #fff1e2 0%, #fcdcc0 45%, #f6bf9a 100%);
  -webkit-mask: url('../../assets/textures/clouds-far.webp') center / 100% 100% no-repeat;
  mask: url('../../assets/textures/clouds-far.webp') center / 100% 100% no-repeat;
  animation: puff-drift 110s linear infinite alternate;
}

.sunset__puff--a {
  top: 24%;
  left: -6%;
  width: max(48vw, 26rem);
  opacity: 0.5;
}

.sunset__puff--b {
  top: 44%;
  right: -10%;
  width: max(58vw, 30rem);
  opacity: 0.42;
  animation-duration: 140s;
  animation-direction: alternate-reverse;
}

.sunset__puff--c {
  top: 66%;
  left: 18%;
  width: max(40vw, 22rem);
  opacity: 0.36;
  animation-duration: 125s;
}

.sunset__birds {
  position: absolute;
  left: 8%;
  top: 22%;
  width: clamp(5rem, 3rem + 5vw, 8rem);
  overflow: visible;
  animation: glide 60s linear infinite;
}

.bird {
  fill: none;
  stroke: rgb(70 32 26 / 0.5);
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  transform-box: fill-box;
  transform-origin: center;
  animation: flap 1.6s ease-in-out infinite alternate;
}

.bird--2 {
  animation-delay: -0.5s;
}

.bird--3 {
  animation-delay: -1s;
}

.sunset__star {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #fffaf0;
  box-shadow: 0 0 6px 1px rgb(255 248 230 / 0.8);
  animation: twinkle ease-in-out infinite alternate;
}

@keyframes bank-drift {
  to {
    transform: translateX(6%);
  }
}

@keyframes puff-drift {
  to {
    transform: translateX(8vw);
  }
}

@keyframes ember {
  0% {
    transform: translate(0, 0);
    opacity: 0;
  }
  18% {
    opacity: 0.9;
  }
  80% {
    opacity: 0.7;
  }
  100% {
    transform: translate(22px, -26vh);
    opacity: 0;
  }
}

@keyframes flap {
  to {
    transform: scaleY(0.55);
  }
}

@keyframes glide {
  from {
    translate: 0 0;
  }
  to {
    translate: 70vw -4vh;
  }
}

@keyframes twinkle {
  from {
    opacity: 0.2;
  }
  to {
    opacity: 0.95;
  }
}

@media (max-width: 760px) {
  .sunset__ember:nth-child(2n) {
    display: none;
  }
}
</style>
