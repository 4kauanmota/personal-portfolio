import type { Directive } from 'vue'

/**
 * v-reveal: marca o elemento com `data-reveal` e adiciona `data-revealed`
 * quando ele entra na tela (uma vez só). O efeito em si fica no CSS de cada
 * componente, para cada coisa surgir do seu jeito (foto revelando, fio se desenhando…).
 * Valor opcional: atraso em milissegundos (para entradas em sequência).
 * Com "reduzir movimento", tudo já começa revelado.
 *
 * O estado fica num atributo, não numa classe: o Vue reescreve o `class` inteiro
 * quando uma classe dinâmica do elemento muda (ex.: o card ganha `is-loaded` quando
 * a imagem termina de carregar), e uma classe posta aqui de fora sumiria junto,
 * deixando o card "por revelar" (branco) para sempre. Atributos que o Vue não
 * controla ele não toca.
 */
const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let observer: IntersectionObserver | null = null
function getObserver(): IntersectionObserver | null {
  if (observer || typeof IntersectionObserver === 'undefined') return observer
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.setAttribute('data-revealed', '')
        observer?.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  )
  return observer
}

/** Revela já, sem esperar o observador (ex.: o ponteiro chegou antes da animação). */
function revealNow(this: HTMLElement) {
  this.setAttribute('data-revealed', '')
  observer?.unobserve(this)
}

export const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    el.setAttribute('data-reveal', '')
    if (binding.value) el.style.setProperty('--reveal-delay', `${binding.value}ms`)
    const io = getObserver()
    if (reduce || !io) {
      el.setAttribute('data-revealed', '')
      return
    }
    io.observe(el)
    // Nada que a pessoa toque ou aponte fica "por revelar": a interação revela na hora.
    el.addEventListener('pointerenter', revealNow, { once: true })
    el.addEventListener('focusin', revealNow, { once: true })
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) el.style.setProperty('--reveal-delay', `${binding.value ?? 0}ms`)
  },
  unmounted(el) {
    observer?.unobserve(el)
    el.removeEventListener('pointerenter', revealNow)
    el.removeEventListener('focusin', revealNow)
  },
}

declare module 'vue' {
  interface ComponentCustomProperties {
    vReveal: typeof vReveal
  }
}
