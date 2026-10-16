<script setup lang="ts">
/** Grão de filme por cima de tudo: leve, sem bloquear cliques, parado com movimento reduzido. */
const noise =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .18 0 0 0 0 .14 0 0 0 0 .08 0 0 0 1.55 -.62'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
</script>

<template>
  <div class="grain" aria-hidden="true">
    <div class="grain__layer" :style="{ backgroundImage: noise }" />
  </div>
</template>

<style scoped>
.grain {
  position: fixed;
  inset: 0;
  z-index: 90;
  overflow: hidden;
  pointer-events: none;
}

.grain__layer {
  position: absolute;
  inset: -40px;
  background-size: 220px 220px;
  opacity: 0.16;
  animation: grain-shift 0.9s steps(5) infinite;
  will-change: transform;
}

@keyframes grain-shift {
  0% {
    transform: translate3d(0, 0, 0);
  }
  20% {
    transform: translate3d(-18px, 11px, 0);
  }
  40% {
    transform: translate3d(13px, -21px, 0);
  }
  60% {
    transform: translate3d(-7px, 24px, 0);
  }
  80% {
    transform: translate3d(22px, 6px, 0);
  }
  100% {
    transform: translate3d(0, 0, 0);
  }
}

@media (hover: none), (max-width: 640px) {
  .grain__layer {
    animation: none;
    opacity: 0.12;
  }
}
</style>
