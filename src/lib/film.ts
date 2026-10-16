/**
 * Geometria das fitas de filme e da onda de chicote (sem Vue nem DOM, testada em
 * tests/film.test.ts).
 *
 * Uma fita é uma linha central lisa (Catmull-Rom pelos pontos dados), reamostrada em
 * passos iguais ao longo do comprimento. Tudo o que se desenha (a faixa, os furos, os
 * quadros e os desenhos dentro deles) sai dessa linha, então deformar a linha deforma
 * a fita inteira, com os quadros acompanhando a curva.
 *
 * A onda de chicote é uma deformação na perpendicular da linha que nasce numa ponta
 * (a mais perto do impulso), percorre o comprimento com atraso entre os trechos e se
 * dissipa até zero: depois do fim, a fita volta exatamente ao repouso.
 */

export type Pt = [number, number]

export interface Centerline {
  points: Pt[]
  normals: Pt[]
  /** Comprimento acumulado até cada ponto. */
  arc: number[]
  length: number
}

/** Ponto de uma Catmull-Rom uniforme entre p1 e p2. */
function catmull(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const t2 = t * t
  const t3 = t2 * t
  const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]
}

/** Linha central lisa pelos pontos, reamostrada a cada `step` px de comprimento. */
export function centerline(control: Pt[], step = 6): Centerline {
  if (control.length < 2) return { points: [...control], normals: control.map(() => [0, 1]), arc: control.map(() => 0), length: 0 }
  // 1) curva densa
  const dense: Pt[] = []
  for (let i = 0; i < control.length - 1; i++) {
    const p0 = control[Math.max(0, i - 1)]!
    const p1 = control[i]!
    const p2 = control[i + 1]!
    const p3 = control[Math.min(control.length - 1, i + 2)]!
    const n = Math.max(8, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 3))
    for (let k = 0; k < n; k++) dense.push(catmull(p0, p1, p2, p3, k / n))
  }
  dense.push(control[control.length - 1]!)
  // 2) comprimento acumulado da curva densa
  const acc = [0]
  for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1]! + Math.hypot(dense[i]![0] - dense[i - 1]![0], dense[i]![1] - dense[i - 1]![1]))
  const total = acc[acc.length - 1]!
  // 3) passos iguais
  const count = Math.max(2, Math.round(total / step) + 1)
  const points: Pt[] = []
  let j = 0
  for (let k = 0; k < count; k++) {
    const target = (k / (count - 1)) * total
    while (j < acc.length - 2 && acc[j + 1]! < target) j++
    const seg = acc[j + 1]! - acc[j]! || 1
    const u = (target - acc[j]!) / seg
    const a = dense[j]!
    const b = dense[j + 1]!
    points.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u])
  }
  return finish(points)
}

/** Normais e comprimentos de uma lista de pontos. */
export function finish(points: Pt[]): Centerline {
  const n = points.length
  const normals: Pt[] = points.map((_, i) => {
    const a = points[Math.max(0, i - 1)]!
    const b = points[Math.min(n - 1, i + 1)]!
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    return [-dy / len, dx / len]
  })
  const arc = [0]
  for (let i = 1; i < n; i++) arc.push(arc[i - 1]! + Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1]))
  return { points, normals, arc, length: arc[n - 1] ?? 0 }
}

/** Caminho SVG (segmentos retos curtos: o navegador mede o mesmo comprimento que nós). */
export function pathOf(points: Pt[]): string {
  let d = ''
  for (let i = 0; i < points.length; i++) d += `${i ? 'L' : 'M'}${points[i]![0].toFixed(1)} ${points[i]![1].toFixed(1)}`
  return d
}

/** Pontos deslocados na perpendicular: offset(s, i) recebe s de 0 a 1 ao longo da fita. */
export function displace(line: Centerline, offset: (s: number, i: number) => number, shift?: (s: number) => Pt): Pt[] {
  const { points, normals, arc, length } = line
  return points.map((p, i) => {
    const s = length ? arc[i]! / length : 0
    const o = offset(s, i)
    const extra = shift ? shift(s) : ([0, 0] as Pt)
    return [p[0] + normals[i]![0] * o + extra[0], p[1] + normals[i]![1] * o + extra[1]]
  })
}

/** Centro e ângulo (graus) de cada quadro: um a cada `period` px, o primeiro em `first`. */
export function frameAnchors(line: Centerline, period: number, first: number): Array<{ x: number; y: number; angle: number; at: number }> {
  const out: Array<{ x: number; y: number; angle: number; at: number }> = []
  const { points, arc, length } = line
  let j = 0
  for (let at = first; at <= length; at += period) {
    while (j < arc.length - 2 && arc[j + 1]! < at) j++
    const a = points[j]!
    const b = points[j + 1] ?? a
    const seg = arc[j + 1]! - arc[j]! || 1
    const u = Math.min(1, Math.max(0, (at - arc[j]!) / seg))
    out.push({ x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI, at })
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Chicote                                                             */
/* ------------------------------------------------------------------ */

export interface WhipOptions {
  /** Velocidade da onda ao longo da fita (px/s). */
  speed: number
  /** Oscilações por segundo. */
  frequency: number
  /** Tempo para a energia cair a ~37% (s). */
  decay: number
}

export const WHIP: WhipOptions = { speed: 720, frequency: 2.3, decay: 0.42 }

/**
 * O pulso num ponto, `tau` segundos depois de a onda chegar nele: sobe rápido,
 * oscila e se dissipa. Zero antes de a onda chegar.
 */
export function pulse(tau: number, o: WhipOptions = WHIP): number {
  if (tau <= 0) return 0
  const rise = Math.min(1, tau / 0.06)
  const main = Math.sin(2 * Math.PI * o.frequency * tau) * Math.exp(-tau / o.decay)
  // Um balanço mais lento por baixo deixa o movimento orgânico (não uma senoide de régua).
  const sway = 0.35 * Math.sin(2 * Math.PI * o.frequency * 0.42 * tau + 0.8) * Math.exp(-tau / (o.decay * 1.9))
  return rise * (main + sway)
}

/**
 * Quanto tempo até o pulso ficar desprezível (s), contando o percurso pela fita. Depois
 * disso o que sobra é menor que 4% da amplitude (frações de pixel) e a fita volta ao
 * repouso exato.
 */
export function whipDuration(length: number, delay: number, o: WhipOptions = WHIP): number {
  return delay + length / o.speed + o.decay * 1.9 * 3.4
}

/**
 * Quanto tempo (s), depois de a onda chegar num ponto, até o balanço ficar menor que
 * `limit` px (meio pixel) numa fita de amplitude `amplitude`. Fitas de onda pequena param antes: não
 * há por que redesenhar uma fita que já não se mexe de forma visível.
 */
export function whipSettle(amplitude: number, limit = 0.5, o: WhipOptions = WHIP): number {
  // O pulso nunca passa de 1,35 vez a amplitude (a oscilação mais o balanço lento).
  if (amplitude * 1.35 <= limit) return 0
  // As duas parcelas caem cada uma no seu ritmo; cada uma precisa ficar abaixo da metade do limite.
  const main = o.decay * Math.log((2 * amplitude) / limit)
  const sway = o.decay * 1.9 * Math.log((2 * 0.35 * amplitude) / limit)
  return Math.max(0, main, sway)
}

export type Mount = 'both' | 'start' | 'free'

/**
 * Envelope da onda ao longo da fita (s de 0 a 1, medido a partir da ponta do impulso):
 *   both  presa nas duas pontas (alças entre os aparelhos): zero nas pontas;
 *   start presa só na ponta do impulso (a fita que pendura a TV): cresce até a ponta solta;
 *   free  solta (fitas no ar): já começa forte e cresce até o fim, como um chicote.
 */
export function envelope(s: number, mount: Mount): number {
  if (mount === 'both') return Math.sin(Math.PI * Math.min(1, Math.max(0, s))) ** 0.9
  if (mount === 'start') return Math.min(1, Math.max(0, s)) ** 0.85
  return 0.5 + 0.5 * Math.min(1, Math.max(0, s))
}

/**
 * Deslocamento de um ponto da fita: `s` (0 a 1) a partir da ponta do impulso, `elapsed`
 * segundos desde o impulso, `delay` até a onda chegar na ponta, `amplitude` em px.
 */
export function whipOffset(s: number, length: number, elapsed: number, delay: number, amplitude: number, mount: Mount, o: WhipOptions = WHIP): number {
  const tau = elapsed - delay - (s * length) / o.speed
  return amplitude * envelope(s, mount) * pulse(tau, o)
}

/* ------------------------------------------------------------------ */
/* O que o desenho de um fragmento de filme precisa                    */
/* ------------------------------------------------------------------ */

/** Profundidade: atrás dos aparelhos (longe ou no meio) ou na frente de tudo. */
export type FilmLayer = 'far' | 'mid' | 'near'

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Um quadro: centro, ângulo da fita ali e a lembrança desenhada nele. */
export interface FilmFrame {
  x: number
  y: number
  angle: number
  memory: string
  /** Exposição do quadro (0,8 a 1): uns mais claros, outros mais escuros, como num filme de verdade. */
  exposure: number
  /**
   * Enquadramento da lembrança dentro da janela: deslocamento (fração da janela) e zoom.
   * Com zoom acima de 1, parte do desenho fica fora do quadro, como numa foto de verdade.
   */
  ox: number
  oy: number
  zoom: number
}

export interface FilmStripView {
  id: string
  layer: FilmLayer
  /** Largura da fita (px). */
  width: number
  /** 0 = distante; 1 = perto. */
  depth: number
  /** Linha central em repouso. */
  d: string
  /** Distância entre quadros, ao longo da fita (px). */
  period: number
  /** Janela do quadro no espaço do desenho (largura × altura, px). */
  window: { w: number; h: number }
  /** Giro fixo dos desenhos em relação à fita (0, 180 ou ±90), para ficarem em pé. */
  offset: number
  frames: FilmFrame[]
  /** Dissolução das pontas: do primeiro ao último ponto, com as paradas de opacidade. */
  gradient: { x1: number; y1: number; x2: number; y2: number; stops: Array<[number, number]> }
  /** Área do fragmento no palco (com folga para o chicote): o <svg> dele ocupa só isso. */
  box: Box
  /** Deriva própria no ar (cada fragmento no seu ritmo) e inclinação em perspectiva. */
  drift: { x: number; y: number; r: number; dur: number; delay: number }
  tilt: { x: number; y: number }
  /** Queimado de luz avermelhado nas pontas (0 a 1 em cada uma), como no fim de um rolo. */
  burn: [number, number]
  /** Risco claro ao longo da película (padrão de traços, px). */
  scratch: string
}

/** Retângulo que contém os pontos, com `margin` de folga em volta. */
export function boundsOf(points: Pt[], margin: number): Box {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [x, y] of points) {
    if (x < x0) x0 = x
    if (y < y0) y0 = y
    if (x > x1) x1 = x
    if (y > y1) y1 = y
  }
  if (!points.length) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: Math.floor(x0 - margin), y: Math.floor(y0 - margin), w: Math.ceil(x1 - x0 + margin * 2), h: Math.ceil(y1 - y0 + margin * 2) }
}

/**
 * Como os desenhos ficam em pé numa fita: fitas mais deitadas mostram os quadros de lado
 * (como um negativo de fotografia), fitas mais em pé mostram os quadros como no cinema.
 * O giro é um só para a fita inteira, para nenhum desenho virar de cabeça para baixo no meio.
 */
export function uprightOffset(line: Centerline): number {
  const a = line.points[0]!
  const b = line.points[line.points.length - 1]!
  const mean = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
  const offset = 90 * Math.round(-mean / 90)
  return offset === -180 ? 180 : offset === -0 ? 0 : offset
}

/** Janela do quadro e distância entre quadros para uma fita de largura `t`. */
export function frameGeometry(t: number, offset: number): { window: { w: number; h: number }; period: number } {
  const across = t * 0.64
  const cinema = Math.abs(offset) === 90
  // A lembrança tem proporção 5:4. De lado, o quadro é mais comprido que largo; no cinema, o contrário.
  const along = cinema ? across * 0.8 : across * 1.25
  return { window: cinema ? { w: across, h: along } : { w: along, h: across }, period: along + t * 0.12 }
}
