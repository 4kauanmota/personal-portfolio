/**
 * Os fios do céu do meio-dia, num só lugar: o desenho (NoonSky) e o passarinho
 * pousado (HeroSection) usam a mesma geometria, então ele fica sempre em cima do fio.
 *
 * Espaço do desenho: viewBox 0 0 1600 900, espelhado na horizontal (o poste fica à
 * direita) e ajustado com `xMaxYMin slice` (cobre a caixa, alinhado à direita e no alto).
 */
export type Point = [number, number]
export type Wire = [Point, Point, Point, Point]

export const VIEW_W = 1600
export const VIEW_H = 900

/** Cada fio: sai de um isolador do poste e cruza o céu até sair pela esquerda. */
export const NOON_WIRES: Wire[] = [
  [[24, 71], [420, 170], [1000, 150], [1720, 30]],
  [[70, 69], [460, 186], [1040, 166], [1720, 52]],
  [[120, 71], [500, 160], [1080, 140], [1720, 14]],
  [[35, 126], [440, 220], [1020, 196], [1720, 82]],
  [[109, 126], [520, 214], [1080, 188], [1720, 104]],
]

/** O fio onde o passarinho pousa e em que ponto dele (0 = poste, 1 = saída). */
export const PERCH = { wire: 3, t: 0.12 }

const f = (n: number) => n.toFixed(1)

/** O caminho do fio, com as alças do meio deslocadas na vertical (balanço, puxão). */
export function wirePath([p0, c1, c2, p3]: Wire, dy1 = 0, dy2 = 0): string {
  return `M${f(p0[0])} ${f(p0[1])} C ${f(c1[0])} ${f(c1[1] + dy1)}, ${f(c2[0])} ${f(c2[1] + dy2)}, ${f(p3[0])} ${f(p3[1])}`
}

/** Ponto do fio em t (Bézier cúbica), no espaço do desenho (já espelhado). */
export function pointOnWire([p0, c1, c2, p3]: Wire, t: number): Point {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  const x = a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0]
  const y = a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1]
  return [VIEW_W - x, y]
}

/** Converte um ponto do desenho para pixels de uma caixa (mesmo ajuste do SVG). */
export function toBox([x, y]: Point, width: number, height: number): Point {
  const k = Math.max(width / VIEW_W, height / VIEW_H)
  return [width - (VIEW_W - x) * k, y * k]
}
