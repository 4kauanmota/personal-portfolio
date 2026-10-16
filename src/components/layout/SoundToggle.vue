<script setup lang="ts">
import { lastSound, soundOn, toggleSound } from '../../composables/sound'
import { t } from '../../i18n'

/**
 * Liga e desliga os efeitos sonoros. As ondinhas do alto-falante
 * se mexem quando um som toca, para o som e o ícone conversarem.
 */
</script>

<template>
  <button
    type="button"
    class="sound"
    :class="{ 'is-on': soundOn }"
    :aria-pressed="soundOn"
    :title="soundOn ? t('sound.turnOff') : t('sound.turnOn')"
    @click="toggleSound"
  >
    <svg :key="lastSound" viewBox="0 0 24 24" aria-hidden="true" :class="{ 'is-playing': lastSound > 0 }">
      <path class="sound__body" d="M4 9.6h3.4L12 5.6v12.8l-4.6-4H4z" />
      <path class="sound__wave sound__wave--1" d="M15.3 9.3a3.8 3.8 0 0 1 0 5.4" />
      <path class="sound__wave sound__wave--2" d="M17.8 6.9a7.3 7.3 0 0 1 0 10.2" />
      <path class="sound__mute" d="M16 9.6l4.8 4.8M20.8 9.6 16 14.4" />
    </svg>
    <span class="sr-only">{{ t('sound.label') }}</span>
  </button>
</template>

<style scoped>
.sound {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: transparent;
  color: var(--fg-2);
  transition:
    color var(--dur-quick),
    border-color var(--dur-quick),
    box-shadow var(--dur-soft);
}

.sound:hover {
  color: var(--fg);
  border-color: var(--line-strong);
  box-shadow: 0 0 16px rgb(255 247 222 / 0.6);
}

.sound svg {
  width: 1.2rem;
  height: 1.2rem;
  overflow: visible;
}

.sound path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sound__body {
  fill: currentColor !important;
  fill-opacity: 0.15;
}

.sound__wave,
.sound__mute {
  transition: opacity var(--dur-quick);
}

.sound__wave {
  opacity: 0;
}

.sound__mute {
  opacity: 1;
}

.sound.is-on {
  color: var(--fg);
}

.sound.is-on .sound__wave {
  opacity: 1;
}

.sound.is-on .sound__mute {
  opacity: 0;
}

/* Quando um som toca, as ondas pulsam uma vez. */
.sound.is-on .is-playing .sound__wave--1 {
  animation: wave 0.7s var(--ease-dream);
}

.sound.is-on .is-playing .sound__wave--2 {
  animation: wave 0.7s var(--ease-dream) 0.08s;
}

@keyframes wave {
  40% {
    opacity: 0.2;
    translate: 1.5px 0;
  }
}
</style>
