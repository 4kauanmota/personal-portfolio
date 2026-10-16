import { nextTick } from 'vue'
import { prefersReducedMotion } from './motion'
import { refreshScenes } from './scene'

/**
 * Abre e fecha blocos (galeria, "Ler mais") animando a altura, sem saltos:
 *   - ao abrir, o bloco cresce para baixo;
 *   - ao fechar, a página acompanha o encolhimento, para o botão continuar
 *     no mesmo lugar da tela em vez de "pular" para cima.
 * Com "reduzir movimento", a troca é imediata (e o botão continua no lugar).
 */
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)

export function tween(duration: number, step: (k: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now()
    let done = false
    const finish = () => {
      if (done) return
      done = true
      step(1)
      resolve()
    }
    const frame = (now: number) => {
      if (done) return
      const k = Math.min(1, (now - start) / duration)
      if (k >= 1) return finish()
      step(ease(k))
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
    // Se a aba for para o segundo plano no meio, a animação termina assim mesmo.
    window.setTimeout(finish, duration + 400)
  })
}

export interface MorphOptions {
  /** Elemento que deve ficar parado na tela enquanto o bloco encolhe (o botão). */
  anchor?: HTMLElement | null
  /** Ao encolher: altura final, medida antes da troca (o conteúdo extra sai só no fim). */
  shrinkTo?: () => number
}

let running = false

/** Anima a altura de `el` enquanto `change` troca o conteúdo. */
export async function morphHeight(el: HTMLElement | null, change: () => void, options: MorphOptions = {}): Promise<void> {
  const shrinking = Boolean(options.shrinkTo)
  if (!el || prefersReducedMotion.value || running) {
    const anchorTop = options.anchor?.getBoundingClientRect().top
    change()
    await nextTick()
    if (anchorTop !== undefined && options.anchor) {
      window.scrollBy({ top: options.anchor.getBoundingClientRect().top - anchorTop, behavior: 'instant' })
    }
    refreshScenes()
    return
  }

  running = true
  let changed = false
  try {
    const from = el.getBoundingClientRect().height
    if (!shrinking) {
      change()
      changed = true
      await nextTick()
    }
    const to = shrinking ? (options.shrinkTo?.() ?? 0) : el.scrollHeight
    const delta = from - to
    const startY = window.scrollY
    const keepAnchor = shrinking && Boolean(options.anchor)
    el.style.height = `${from}px`
    // "clip" corta sem virar outro contexto de layout (um texto que contorna uma figura
    // continua contornando durante a animação); onde não existe, fica o "hidden".
    el.style.overflow = 'hidden'
    el.style.overflow = 'clip'
    await tween(Math.min(950, 420 + Math.abs(delta) * 0.22), (k) => {
      el.style.height = `${from - delta * k}px`
      if (keepAnchor) window.scrollTo({ top: startY - delta * k, behavior: 'instant' })
    })
  } finally {
    // Aconteça o que acontecer, o bloco volta ao normal: nada fica travado ou recortado.
    if (!changed) {
      change()
      await nextTick()
    }
    el.style.height = ''
    el.style.overflow = ''
    running = false
    refreshScenes()
  }
}
