<script setup lang="ts">
import { computed, ref } from 'vue'
import { portraitUrl } from '../../composables/portrait'
import { profilePhoto } from '../../content/profile'
import { tx } from '../../i18n'
import HaloRing from '../atmosphere/HaloRing.vue'

/**
 * Retrato. A imagem é a que estiver em src/assets/profile/ (veja composables/portrait.ts):
 * trocar o arquivo troca o retrato, sem mexer aqui. O recorte e o foco vêm de
 * src/content/profile.ts.
 *
 * No início do site o retrato fica limpo, direto no céu, sem auréola nem luz em volta.
 * Sem imagem (ou se ela não carregar), a moldura continua no lugar, vazia, e o layout
 * não muda. A versão pequena (`compact`, da página de links) mantém a luz suave e o
 * anel de partículas, e sem imagem ela simplesmente não aparece.
 */
const props = withDefaults(defineProps<{ compact?: boolean; eager?: boolean }>(), { compact: false, eager: true })

const failed = ref(false)
const loaded = ref(false)
const showPhoto = computed(() => Boolean(portraitUrl) && !failed.value)
</script>

<template>
  <figure
    v-if="showPhoto || !props.compact"
    class="portrait"
    :class="{ 'portrait--compact': props.compact, 'portrait--loaded': loaded || !showPhoto, 'portrait--empty': !showPhoto }"
    :aria-hidden="showPhoto ? undefined : 'true'"
  >
    <div v-if="props.compact" class="portrait__light" aria-hidden="true" />
    <div class="portrait__frame">
      <img
        v-if="showPhoto && portraitUrl"
        class="portrait__img"
        :src="portraitUrl"
        :alt="tx(profilePhoto.alt)"
        :style="{ objectPosition: profilePhoto.focus }"
        :loading="props.eager ? 'eager' : 'lazy'"
        :fetchpriority="props.eager ? 'high' : 'auto'"
        decoding="async"
        @load="loaded = true"
        @error="failed = true"
      />
    </div>
    <span v-if="props.compact" class="portrait__halo-anchor" :style="{ top: profilePhoto.haloTop }">
      <span class="portrait__halo-arrive">
        <HaloRing variant="motes" size="5rem" :tilt="74" float drawn />
      </span>
    </span>
  </figure>
</template>

<style scoped>
.portrait {
  position: relative;
  width: var(--portrait-w, clamp(14rem, 9rem + 22vw, 27rem));
  aspect-ratio: 4 / 5;
  margin: 0;
}

.portrait__light {
  position: absolute;
  inset: -12% -18% -6%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(255 252 236 / 0.92), rgb(255 248 220 / 0.4) 55%, transparent 78%);
  filter: blur(4px);
}

.portrait__frame {
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* A borda se dissolve na luz, como uma lembrança que perde o contorno. */
  mask-image: radial-gradient(64% 58% at 50% 46%, #000 58%, rgb(0 0 0 / 0.55) 78%, transparent 100%);
  -webkit-mask-image: radial-gradient(64% 58% at 50% 46%, #000 58%, rgb(0 0 0 / 0.55) 78%, transparent 100%);
}

.portrait__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  filter: blur(10px) brightness(1.25) saturate(0.6);
  transition:
    opacity 1.1s var(--ease-dream),
    filter 1.6s var(--ease-dream);
}

.portrait--loaded .portrait__img {
  opacity: 1;
  filter: none;
}

.portrait__halo-anchor {
  position: absolute;
  left: 50%;
  top: 21%;
  translate: -50% -50%;
  transform: translate3d(calc(var(--px, 0) * 14px), calc(var(--py, 0) * 8px), 0);
  transition: transform 0.2s linear;
}

.portrait__halo-arrive {
  display: block;
  --halo-ry: calc(var(--px, 0) * 10);
  --halo-rz: calc(var(--px, 0) * -4);
  animation: halo-arrive 2.2s var(--ease-surface) both;
}

.portrait--compact {
  --portrait-w: 7.5rem;
}

@keyframes halo-arrive {
  from {
    opacity: 0;
    translate: 0 -60%;
    filter: blur(6px);
  }
  to {
    opacity: 1;
    translate: 0 0;
    filter: blur(0);
  }
}
</style>
