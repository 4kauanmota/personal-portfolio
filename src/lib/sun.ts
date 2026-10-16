/**
 * A história do sol, calculada só a partir da posição da página.
 *
 * Nada aqui depende do relógio: a mesma rolagem sempre dá o mesmo sol, então descer
 * e subir passam pelos mesmos estados, na ordem inversa. O componente (TravelingSun)
 * só desenha o que esta função diz. Funções puras, testadas em tests/sun.test.ts.
 *
 *   travel (0 a 1)   da tarde até o anoitecer, enquanto o Sobre mim passa pela tela;
 *   lum              brilho: discreto, auge dourado, depois vai se apagando;
 *   swell (0 a 1)    incha e avermelha, perdendo luz (como uma gigante vermelha);
 *   decay (0 a 1)    a degradação antes do fim: forma, brilho e anel se desfazendo;
 *   collapse (0 a 1) o sol encolhe num ponto muito claro;
 *   burst (0 a 1)    a explosão de estrela, do clarão até a última fagulha.
 */

export interface SunGeometry {
  /** Topo e altura do Sobre mim na tela (getBoundingClientRect). */
  top: number
  height: number
  /** Tamanho da tela. */
  vw: number
  vh: number
  /** Preferência por menos movimento. */
  still: boolean
}

export type RGB = readonly [number, number, number]

export interface SunState {
  /** Algo para desenhar? (fora do trecho, o sol nem existe.) */
  active: boolean
  travel: number
  appear: number
  lum: number
  /** A fase de "gigante vermelha": incha, avermelha e perde luz, antes da degradação. */
  swell: number
  decay: number
  collapse: number
  burst: number
  /** Centro do sol na tela (px). */
  x: number
  y: number
  /** Raio do disco (px), já com o tamanho do momento. */
  radius: number
  /** Raio base (px), para medir a explosão. */
  base: number
  /** Cor do disco e da luz em volta. */
  core: RGB
  glow: RGB
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const smooth = (v: number) => {
  const k = clamp(v)
  return k * k * (3 - 2 * k)
}
export const easeOut = (v: number) => 1 - (1 - clamp(v)) ** 3
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** Cor ao longo da história: pálido, ouro, âmbar, coral e rosa do anoitecer. */
const CORE: Array<[number, RGB]> = [
  [0, [255, 250, 236]],
  [0.3, [255, 240, 196]],
  [0.55, [255, 208, 150]],
  [0.8, [250, 160, 130]],
  [1, [240, 150, 170]],
]
const GLOW: Array<[number, RGB]> = [
  [0, [255, 250, 232]],
  [0.3, [255, 236, 190]],
  [0.55, [255, 214, 168]],
  [0.8, [252, 182, 160]],
  [1, [236, 170, 200]],
]

export function colorAt(stops: Array<[number, RGB]>, t: number): RGB {
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i]!
    const [t0, c0] = stops[i - 1]!
    if (t <= t1) {
      const k = smooth((t - t0) / (t1 - t0))
      return [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k)]
    }
  }
  return stops[stops.length - 1]![1]
}

/** Raio base do disco: proporcional à tela, com limites. */
export function baseRadius(vw: number, vh: number): number {
  return clamp(0.045 * Math.min(vw, vh), 22, 46)
}

export function sunState(g: SunGeometry): SunState {
  const { top, height, vw, vh, still } = g
  const bottom = top + height
  // Viagem: começa com o Sobre mim a uma tela e meia do topo; termina quando o pé dele
  // (o anoitecer) chega a 90% da altura da tela. A explosão vai daí até o anoitecer
  // subir para o primeiro quarto da tela.
  const travel = clamp((1.5 * vh - top) / Math.max(1, height + 0.6 * vh))
  const burst = clamp((0.9 * vh - bottom) / (0.65 * vh))
  const active = travel > 0 && burst < 1

  // O fim da história é medido pela distância até a explosão (e não pela fração da viagem),
  // para a degradação acontecer no fim da trajetória e no céu aberto do anoitecer, onde se vê.
  const toBurst = bottom - 0.9 * vh
  const swell = smooth((2.7 * vh - toBurst) / (1.4 * vh))
  const decay = still ? 0 : smooth((1.75 * vh - toBurst) / (1.45 * vh))
  const collapse = still ? 0 : smooth((0.3 * vh - toBurst) / (0.3 * vh))

  const appear = smooth(travel / 0.08)
  // Discreto, ganha brilho até o auge dourado e começa a perder luz quando incha.
  const lum = smooth((travel - 0.04) / 0.22) * (1 - 0.5 * swell)

  const narrow = vw < 760
  let x: number
  let y: number
  if (still) {
    x = (narrow ? 0.7 : 0.74) * vw
    y = 0.24 * vh
  } else {
    // Da direita alta para a esquerda, descendo devagar em direção ao horizonte.
    x = lerp(narrow ? 0.76 : 0.8, narrow ? 0.5 : 0.34, smooth(travel)) * vw
    y = (lerp(0.17, 0.44, easeOut(travel)) - Math.sin(Math.PI * travel) * 0.04) * vh
  }

  const base = baseRadius(vw, vh)
  // Pequeno e pálido; cresce no auge; incha avermelhado (gigante vermelha); colapsa num ponto.
  const grow = still ? 0.85 : 0.62 + 0.38 * smooth((travel - 0.03) / 0.25) + 0.3 * swell
  const radius = base * grow * (1 - 0.78 * collapse)

  // Cor: pálida no começo, ouro no auge, coral e rosa quando incha.
  const tone = 0.6 * smooth(travel / 0.7) + 0.4 * swell
  let core = colorAt(CORE, tone)
  if (collapse > 0) core = [lerp(core[0], 255, collapse), lerp(core[1], 252, collapse), lerp(core[2], 248, collapse)]
  const glow = colorAt(GLOW, tone)

  return { active, travel, appear, lum, swell, decay, collapse, burst, x, y, radius, base, core, glow }
}

/* ------------------------------------------------------------------ */
/* Partículas da explosão (sempre as mesmas: sorteio com semente)       */
/* ------------------------------------------------------------------ */

export type ParticleKind = 'mote' | 'star' | 'shard'

export interface Particle {
  kind: ParticleKind
  /** Direção (rad) e fração da distância máxima. */
  angle: number
  reach: number
  /** Quando sai (fração da explosão) e quanto dura. */
  delay: number
  life: number
  /** Ondulação lateral do voo e queda leve no fim. */
  curl: number
  fall: number
  phase: number
  size: number
  color: RGB
  /** Só os estilhaços giram. */
  spin: number
}

export const BURST_COLORS: RGB[] = [
  [255, 250, 238],
  [255, 232, 190],
  [255, 206, 170],
  [248, 184, 208],
  [214, 196, 246],
]

export function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function makeParticles(count: number, seed = 23): Particle[] {
  const rand = seeded(seed)
  const golden = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: count }, (_, i) => {
    const kind: ParticleKind = i % 9 === 0 ? 'star' : i % 5 === 0 ? 'shard' : 'mote'
    return {
      kind,
      angle: i * golden + (rand() - 0.5) * 0.6,
      reach: kind === 'shard' ? 0.25 + rand() * 0.45 : 0.3 + rand() ** 0.7 * 0.7,
      delay: rand() * 0.14,
      life: 0.55 + rand() * 0.4,
      curl: (rand() - 0.5) * 0.16,
      fall: 0.02 + rand() * 0.07,
      phase: rand() * Math.PI * 2,
      size: kind === 'star' ? 3.2 + rand() * 2.2 : kind === 'shard' ? 5 + rand() * 6 : 0.9 + rand() * 1.7,
      color: BURST_COLORS[Math.floor(rand() * BURST_COLORS.length)]!,
      spin: (rand() - 0.5) * 7,
    }
  })
}

/** Onde a partícula está e com que brilho, numa fração `burst` da explosão. */
export function particleAt(p: Particle, burst: number, maxReach: number): { x: number; y: number; alpha: number; progress: number } | null {
  const progress = clamp((burst - p.delay) / p.life)
  if (progress <= 0) return null
  const e = easeOut(progress)
  const d = maxReach * p.reach * e
  const side = Math.sin(progress * Math.PI * 1.5 + p.phase) * p.curl * maxReach * p.reach
  const x = Math.cos(p.angle) * d - Math.sin(p.angle) * side
  const y = Math.sin(p.angle) * d + Math.cos(p.angle) * side + p.fall * maxReach * progress * progress
  const alpha = smooth(progress / 0.05) * (1 - progress) ** 1.25
  return { x, y, alpha, progress }
}
