import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Qual seção está no meio da tela (para marcar o link ativo na navegação). */
export function useActiveSection(ids: string[]) {
  const active = ref<string | null>(null)
  let observer: IntersectionObserver | null = null
  onMounted(() => {
    if (typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) active.value = entry.target.id
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
  })
  onBeforeUnmount(() => observer?.disconnect())
  return active
}

export type HeaderTone = 'light' | 'sunset' | 'night'

/**
 * Que céu está passando por baixo do cabeçalho?
 * Os trechos escuros (fim do pôr do sol, noite, começo do amanhecer) marcam a si
 * mesmos com data-header-tone="night"; o pôr do sol, com "sunset". Uma faixa fina
 * no topo da tela observa esses trechos, e o véu do cabeçalho troca de cor só
 * quando o fundo troca (noite vence pôr do sol; sem marca, é dia).
 */
export function useHeaderTone() {
  const tone = ref<HeaderTone>('light')
  let observer: IntersectionObserver | null = null
  onMounted(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const inside = new Set<Element>()
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inside.add(entry.target)
          else inside.delete(entry.target)
        }
        const tones = new Set([...inside].map((el) => (el as HTMLElement).dataset.headerTone))
        tone.value = tones.has('night') ? 'night' : tones.has('sunset') ? 'sunset' : 'light'
      },
      { rootMargin: '-3% 0px -93% 0px' },
    )
    for (const el of document.querySelectorAll('[data-header-tone]')) observer.observe(el)
  })
  onBeforeUnmount(() => observer?.disconnect())
  return tone
}

/** true depois que a página rola um pouco (o cabeçalho ganha fundo). */
export function useScrolled(threshold = 24) {
  const scrolled = ref(false)
  const update = () => (scrolled.value = window.scrollY > threshold)
  onMounted(() => {
    update()
    window.addEventListener('scroll', update, { passive: true })
  })
  onBeforeUnmount(() => window.removeEventListener('scroll', update))
  return scrolled
}
