import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

const reduceQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
const fineQuery = typeof window !== 'undefined' ? window.matchMedia('(hover: hover) and (pointer: fine)') : null

/** Preferência do sistema por menos movimento (reativa). */
export const prefersReducedMotion = ref(reduceQuery?.matches ?? false)
reduceQuery?.addEventListener('change', (e) => (prefersReducedMotion.value = e.matches))

/** Mouse/trackpad (e não toque): só aí as auréolas seguem o ponteiro. */
export const hasFinePointer = ref(fineQuery?.matches ?? false)
fineQuery?.addEventListener('change', (e) => (hasFinePointer.value = e.matches))

/**
 * Observa se o elemento está perto da tela. Enquanto estiver longe, marca
 * `data-offscreen` para pausar as animações (economiza bateria no celular).
 */
export function useInView(target: Ref<HTMLElement | null>, options: { rootMargin?: string; once?: boolean } = {}) {
  const inView = ref(false)
  let observer: IntersectionObserver | null = null
  onMounted(() => {
    const el = target.value
    if (!el || typeof IntersectionObserver === 'undefined') {
      inView.value = true
      return
    }
    observer = new IntersectionObserver(
      ([entry]) => {
        inView.value = Boolean(entry?.isIntersecting)
        if (inView.value) el.removeAttribute('data-offscreen')
        else el.setAttribute('data-offscreen', '')
        if (inView.value && options.once) observer?.disconnect()
      },
      { rootMargin: options.rootMargin ?? '120px 0px' },
    )
    observer.observe(el)
  })
  onBeforeUnmount(() => observer?.disconnect())
  return inView
}

/**
 * Inclinação suave pelo ponteiro: escreve --px e --py (de -1 a 1) no elemento.
 * Desligado com movimento reduzido ou em telas de toque.
 */
export function usePointerDepth(target: Ref<HTMLElement | null>, active: Ref<boolean>) {
  let frame = 0
  let x = 0
  let y = 0
  let tx = 0
  let ty = 0

  const tick = () => {
    x += (tx - x) * 0.06
    y += (ty - y) * 0.06
    target.value?.style.setProperty('--px', x.toFixed(4))
    target.value?.style.setProperty('--py', y.toFixed(4))
    frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(tick) : 0
  }

  const onMove = (event: PointerEvent) => {
    tx = (event.clientX / window.innerWidth) * 2 - 1
    ty = (event.clientY / window.innerHeight) * 2 - 1
    if (!frame) frame = requestAnimationFrame(tick)
  }

  const enabled = () => active.value && hasFinePointer.value && !prefersReducedMotion.value

  const sync = () => {
    window.removeEventListener('pointermove', onMove)
    if (enabled()) window.addEventListener('pointermove', onMove, { passive: true })
    else {
      tx = 0
      ty = 0
      if (!frame) frame = requestAnimationFrame(tick)
    }
  }

  onMounted(sync)
  watch([active, hasFinePointer, prefersReducedMotion], sync)
  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', onMove)
    cancelAnimationFrame(frame)
  })
}
