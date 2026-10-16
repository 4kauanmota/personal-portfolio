<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { prefersReducedMotion } from '../../composables/motion'
import { clamp, easeOut, makeParticles, particleAt, seeded, smooth, sunState, type RGB, type SunState } from '../../lib/sun'

/**
 * O sol que conta uma pequena história ao longo da rolagem, da tarde até a noite.
 *
 * O estado vem de lib/sun (só da posição da página, nunca do relógio): rolar para cima
 * desfaz a história exatamente. Aqui só se desenha, num canvas pequeno que acompanha o sol:
 *   1. surge discreto e pálido, no alto à direita, ainda na tarde dos projetos;
 *   2. ganha brilho e vira ouro no começo do pôr do sol;
 *   3. perde luz e incha, avermelhado, enquanto o céu passa a coral e rosa;
 *   4. se degrada aos poucos: a borda ferve e se deforma, a luz treme, o anel de luz
 *      se parte em arcos que se afastam e fagulhas se soltam;
 *   5. colapsa num ponto muito claro;
 *   6. explode como uma estrela no anoitecer: um clarão, uma onda de luz, uma nuvem
 *      rosada e lilás, partículas com rastro e estilhaços que giram e somem devagar;
 *      algumas viram estrelinhas que piscam antes de sumir, como as da noite logo abaixo.
 *
 * O desenho é o da identidade do site: um disco de luz com um anel fino em volta, como
 * o "o" do logotipo, e estrelas de quatro pontas como as do céu noturno. Fica preso à
 * tela, por cima dos céus de todas as seções e atrás de todo o conteúdo (HomePage o
 * coloca depois das seções). Só desenha quando a rolagem muda algo e o Sobre mim está
 * por perto; longe dali o canvas some. Com "reduzir movimento", o sol fica parado num
 * canto: só aparece, muda de cor e de brilho e some com a rolagem, sem tremer nem explodir.
 */
const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let about: HTMLElement | null = null
let frame = 0
let near = false
let observer: IntersectionObserver | null = null
/** Lado do canvas (px de CSS) e densidade de pixels em uso. */
let box = 0
let ratio = 1
let lastKey = ''

const PARTICLES = makeParticles(96)
/** Fagulhas que se soltam da borda enquanto o sol se degrada. */
const EMBERS = (() => {
  const rand = seeded(7)
  return Array.from({ length: 18 }, (_, k) => ({
    angle: (k / 18) * Math.PI * 2 + (rand() - 0.5) * 0.4,
    reach: rand(),
    drift: (rand() - 0.5) * 3,
    size: 1 + rand() * 1.4,
    phase: rand() * Math.PI * 2,
    stagger: rand() * 0.45,
  }))
})()
/** Poeira fina de luz que fica pairando onde a estrela explodiu. */
const DUST = (() => {
  const rand = seeded(41)
  return Array.from({ length: 70 }, () => ({
    angle: rand() * Math.PI * 2,
    reach: 0.12 + rand() ** 0.8 * 0.65,
    delay: 0.04 + rand() * 0.18,
    life: 0.7 + rand() * 0.3,
    size: 0.6 + rand() * 0.9,
    phase: rand() * Math.PI * 2,
  }))
})()
/** Direções da nuvem que a explosão deixa. */
const NEBULA: Array<{ angle: number; color: RGB }> = [
  { angle: -0.6, color: [248, 186, 210] },
  { angle: 2.1, color: [206, 186, 244] },
  { angle: 3.9, color: [255, 210, 176] },
]

const rgba = (c: RGB, a: number) => `rgba(${c[0].toFixed(0)},${c[1].toFixed(0)},${c[2].toFixed(0)},${clamp(a).toFixed(3)})`

function glowDisc(x: number, y: number, r: number, c: RGB, a: number) {
  if (!ctx || a <= 0.002 || r <= 0) return
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(c, a))
  g.addColorStop(0.32, rgba(c, a * 0.38))
  g.addColorStop(0.65, rgba(c, a * 0.09))
  g.addColorStop(1, rgba(c, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

function ring(x: number, y: number, r: number, width: number, c: RGB, a: number, from = 0, to = Math.PI * 2) {
  if (!ctx || a <= 0.002 || r <= 0) return
  ctx.beginPath()
  ctx.arc(x, y, r, from, to)
  ctx.lineWidth = width
  ctx.strokeStyle = rgba(c, a)
  ctx.stroke()
}

/** Estrela de quatro pontas, como as do céu do site. */
function sparkle(x: number, y: number, r: number, c: RGB, a: number, turn = 0) {
  if (!ctx || a <= 0.002) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  ctx.beginPath()
  ctx.moveTo(0, -r)
  ctx.bezierCurveTo(r * 0.1, -r * 0.2, r * 0.2, -r * 0.1, r, 0)
  ctx.bezierCurveTo(r * 0.2, r * 0.1, r * 0.1, r * 0.2, 0, r)
  ctx.bezierCurveTo(-r * 0.1, r * 0.2, -r * 0.2, r * 0.1, -r, 0)
  ctx.bezierCurveTo(-r * 0.2, -r * 0.1, -r * 0.1, -r * 0.2, 0, -r)
  ctx.fillStyle = rgba(c, a)
  ctx.fill()
  ctx.restore()
  glowDisc(x, y, r * 1.6, c, a * 0.5)
}

function draw(s: SunState, reach: number, narrow: boolean) {
  if (!ctx) return
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, box, box)
  ctx.globalCompositeOperation = 'lighter'
  const c = box / 2
  const still = prefersReducedMotion.value
  const { appear, lum, decay, collapse, burst, travel, radius: R, base } = s
  // O corpo do sol some logo no começo da explosão (ou devagar, sem movimento).
  const life = appear * (still ? 1 - smooth(burst / 0.6) : 1 - smooth(burst / 0.05))
  // Na degradação a luz treme conforme a rolagem.
  const flicker = 1 - 0.3 * decay * (0.5 + 0.5 * Math.sin(travel * 190))

  if (life > 0.002) {
    // Luz em volta: pálida, dourada, rosada; encolhe no colapso.
    glowDisc(c, c, R * (3.2 + 1.1 * lum) * (1 + 0.8 * collapse), s.glow, 0.42 * (0.3 + 0.7 * Math.max(lum, collapse)) * life * flicker)

    // O anel de luz (o "o" do logotipo): inteiro no auge; na degradação se parte em arcos.
    const ringA = life * (0.22 + 0.55 * lum) * flicker * (1 - smooth(collapse * 1.3))
    const ringR = R * 1.62 + decay * base * 0.4
    if (decay < 0.02 || still) {
      ring(c, c, ringR, 1.2, [255, 250, 236], ringA)
      ring(c, c, ringR, 5, s.glow, ringA * 0.18)
      // Uma estrelinha correndo pelo anel, como a luz do "o".
      const at = still ? -0.6 : travel * 24
      sparkle(c + Math.cos(at) * ringR, c + Math.sin(at) * ringR, 5.5, [255, 252, 240], appear * lum * 0.9 * life)
    } else {
      for (let k = 0; k < 3; k++) {
        const span = ((Math.PI * 2) / 3) * (1 - 0.72 * decay)
        const start = (k * Math.PI * 2) / 3 + travel * 15 + decay * k * 0.9
        const r = ringR * (1 + 0.14 * decay * (k - 1))
        ring(c, c, r, 1.3, [255, 250, 236], ringA, start, start + span)
        ring(c, c, r, 5, s.glow, ringA * 0.22, start, start + span)
      }
    }

    // O disco: a borda ferve e se deforma durante a degradação.
    const g = ctx.createRadialGradient(c, c, 0, c, c, R * 1.08)
    g.addColorStop(0, rgba([255, 255, 250], life))
    g.addColorStop(0.5, rgba(s.core, life * (0.8 + 0.2 * lum)))
    g.addColorStop(0.86, rgba(s.core, life * (0.62 - 0.2 * decay) * flicker))
    g.addColorStop(1, rgba(s.core, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    if (decay > 0.01 && !still) {
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * Math.PI * 2
        const k = 1 + decay * (0.13 * Math.sin(3 * a + travel * 31) + 0.08 * Math.sin(5 * a - travel * 23) + 0.05 * Math.sin(11 * a + travel * 47))
        const px = c + Math.cos(a) * R * k
        const py = c + Math.sin(a) * R * k
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
    } else {
      ctx.arc(c, c, R, 0, Math.PI * 2)
    }
    ctx.fill()

    // Manchas de luz mais fraca na superfície: o sol perde a uniformidade enquanto morre.
    if (decay > 0.05 && !still) {
      ctx.globalCompositeOperation = 'destination-out'
      for (let k = 0; k < 4; k++) {
        const a = k * 1.9 + travel * (6 + k * 2.3)
        const d = R * (0.25 + 0.4 * ((k * 0.37) % 1))
        const r = R * (0.22 + 0.08 * k)
        const hole = ctx.createRadialGradient(c + Math.cos(a) * d, c + Math.sin(a) * d, 0, c + Math.cos(a) * d, c + Math.sin(a) * d, r)
        hole.addColorStop(0, `rgba(0,0,0,${(0.35 * decay * life).toFixed(3)})`)
        hole.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = hole
        ctx.fillRect(c + Math.cos(a) * d - r, c + Math.sin(a) * d - r, r * 2, r * 2)
      }
      ctx.globalCompositeOperation = 'lighter'
    }

    // Fagulhas que se soltam da borda.
    if (decay > 0 && !still) {
      for (const e of EMBERS) {
        const rel = smooth((decay - e.stagger) / 0.45)
        if (rel <= 0) continue
        const a = e.angle + travel * e.drift
        const d = R * (1.05 + rel * (0.35 + 1.7 * e.reach))
        const alpha = rel * (1 - rel * 0.7) * life * (1 - collapse) * (0.55 + 0.45 * Math.sin(travel * 140 + e.phase))
        const x = c + Math.cos(a) * d
        const y = c + Math.sin(a) * d
        const tail = 6 + rel * 14
        ctx.beginPath()
        ctx.moveTo(x - Math.cos(a) * tail, y - Math.sin(a) * tail)
        ctx.lineTo(x, y)
        ctx.lineWidth = e.size
        ctx.lineCap = 'round'
        ctx.strokeStyle = rgba(s.glow, alpha * 0.7)
        ctx.stroke()
        glowDisc(x, y, e.size * 4.5, [255, 244, 226], Math.min(1, alpha * 1.3))
      }
    }
  }

  if (burst <= 0 || still) return

  // Clarão: a luz da explosão ilumina o anoitecer por um instante.
  const flash = smooth(burst / 0.035) * (1 - smooth((burst - 0.04) / 0.32))
  glowDisc(c, c, base * 1.6 + reach * 0.9 * easeOut(burst / 0.28), [255, 246, 238], 0.7 * flash)
  // O que sobra do sol: um ponto muito claro que se apaga.
  glowDisc(c, c, base * 1.1, [255, 252, 246], 0.95 * (1 - smooth(burst / 0.45)))

  // Nuvem rosada e lilás que se espalha devagar.
  const neb = Math.sin(Math.PI * clamp((burst - 0.02) / 0.98)) ** 1.2
  for (const n of NEBULA) {
    const off = reach * 0.22 * easeOut(burst)
    glowDisc(c + Math.cos(n.angle) * off, c + Math.sin(n.angle) * off, reach * (0.22 + 0.62 * easeOut(burst)), n.color, 0.3 * neb)
  }

  // Ondas de luz: uma clara e rápida, uma rosada e mais lenta.
  const p1 = clamp(burst / 0.55)
  if (p1 < 1) {
    const r1 = base * 0.6 + reach * 1.08 * easeOut(p1)
    const a1 = 0.55 * (1 - p1) ** 1.4 * smooth(burst / 0.02)
    ring(c, c, r1, 0.6 + 2 * (1 - p1), [255, 246, 236], a1)
    ring(c, c, r1, 14 * (1 - p1) + 3, [255, 226, 214], a1 * 0.16)
  }

  // Poeira fina: brilha de leve e some por último.
  for (let i = 0; i < DUST.length; i++) {
    if (narrow && i % 2) continue
    const d = DUST[i]!
    const q = clamp((burst - d.delay) / d.life)
    if (q <= 0) continue
    const dist = reach * d.reach * easeOut(q) ** 0.8
    const a = smooth(q / 0.1) * (1 - q) ** 1.1 * (0.5 + 0.5 * Math.sin(burst * 38 + d.phase)) * 0.75
    if (a <= 0.01) continue
    ctx.fillStyle = rgba([255, 244, 236], a)
    ctx.beginPath()
    ctx.arc(c + Math.cos(d.angle) * dist, c + Math.sin(d.angle) * dist + reach * 0.03 * q * q, d.size, 0, Math.PI * 2)
    ctx.fill()
  }
  const p2 = clamp((burst - 0.07) / 0.7)
  if (p2 > 0 && p2 < 1) ring(c, c, reach * 0.8 * easeOut(p2), 1.4, [246, 190, 214], 0.4 * (1 - p2) ** 1.5 * smooth(p2 / 0.05))

  // Partículas com rastro, estrelinhas e estilhaços.
  ctx.lineCap = 'round'
  PARTICLES.forEach((p, i) => {
    if (narrow && i % 2) return
    const q = particleAt(p, burst, reach)
    if (!q) return
    const x = c + q.x
    const y = c + q.y
    const twinkle = 0.65 + 0.35 * Math.sin(burst * 46 + p.phase)
    if (p.kind === 'shard') {
      const turn = p.angle + p.spin * q.progress
      const a = q.alpha * (1 - q.progress) ** 0.5
      ctx!.save()
      ctx!.translate(x, y)
      ctx!.rotate(turn)
      ctx!.beginPath()
      ctx!.moveTo(p.size, 0)
      ctx!.lineTo(-p.size * 0.6, p.size * 0.22)
      ctx!.lineTo(-p.size * 0.45, -p.size * 0.18)
      ctx!.closePath()
      ctx!.fillStyle = rgba(p.color, a)
      ctx!.fill()
      ctx!.restore()
      return
    }
    if (p.kind === 'star' && q.progress > 0.35) {
      sparkle(x, y, p.size * (0.8 + 0.2 * twinkle), p.color, q.alpha * twinkle * 1.2, p.phase)
      return
    }
    // Rastro curto, que some na cauda (fica mais curto conforme a partícula desacelera).
    const prev = particleAt(p, Math.max(0, burst - 0.018), reach)
    if (prev) {
      const tail = ctx!.createLinearGradient(c + prev.x, c + prev.y, x, y)
      tail.addColorStop(0, rgba(p.color, 0))
      tail.addColorStop(1, rgba(p.color, q.alpha * 0.55))
      ctx!.beginPath()
      ctx!.moveTo(c + prev.x, c + prev.y)
      ctx!.lineTo(x, y)
      ctx!.lineWidth = p.size * 0.9
      ctx!.strokeStyle = tail
      ctx!.stroke()
    }
    glowDisc(x, y, p.size * 4, p.color, q.alpha * (q.progress > 0.5 ? twinkle : 1))
  })
}

function update() {
  frame = 0
  const el = canvas.value
  if (!el || !ctx || !about) return
  const vw = window.innerWidth
  const vh = window.innerHeight
  const r = about.getBoundingClientRect()
  const s = sunState({ top: r.top, height: r.height, vw, vh, still: prefersReducedMotion.value })
  if (!s.active) {
    if (el.style.display !== 'none') el.style.display = 'none'
    lastKey = ''
    return
  }
  el.style.display = 'block'
  // Até onde a explosão chega; o canvas só é grande enquanto ela acontece.
  const reach = clamp(0.34 * Math.min(vw, vh) + 50, 160, 430)
  const big = s.burst > 0 || s.collapse > 0.5
  const side = big ? Math.ceil(2 * (reach + 70)) : Math.ceil(s.base * 10)
  const density = Math.min(window.devicePixelRatio || 1, big ? 1.5 : 2)
  if (side !== box || density !== ratio) {
    box = side
    ratio = density
    el.width = Math.round(side * density)
    el.height = Math.round(side * density)
    el.style.width = `${side}px`
    el.style.height = `${side}px`
    lastKey = ''
  }
  el.style.transform = `translate3d(${(s.x - side / 2).toFixed(1)}px, ${(s.y - side / 2).toFixed(1)}px, 0)`
  // Só redesenha quando a história avançou de fato.
  const key = `${Math.round(s.travel * 4000)}|${Math.round(s.burst * 4000)}|${side}|${vw}`
  if (key === lastKey) return
  lastKey = key
  draw(s, reach, vw < 760)
}

function schedule() {
  if (near && !frame) frame = requestAnimationFrame(update)
}

onMounted(() => {
  about = document.getElementById('sobre')
  ctx = canvas.value?.getContext('2d') ?? null
  if (!about || !ctx) return
  observer = new IntersectionObserver(
    ([entry]) => {
      near = Boolean(entry?.isIntersecting)
      if (near) schedule()
      else update()
    },
    // Acorda uma tela e meia antes do Sobre mim e dorme uma tela depois dele.
    { rootMargin: '150% 0px 100% 0px' },
  )
  observer.observe(about)
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  update()
})

watch(prefersReducedMotion, () => {
  lastKey = ''
  update()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  cancelAnimationFrame(frame)
})
</script>

<template>
  <div class="sun" aria-hidden="true">
    <canvas ref="canvas" class="sun__canvas" />
  </div>
</template>

<style scoped>
.sun {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.sun__canvas {
  position: absolute;
  left: 0;
  top: 0;
  display: none;
  will-change: transform;
}
</style>
