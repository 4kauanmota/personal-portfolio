/**
 * As pequenas lembranças desenhadas nos quadros das fitas de filme (Curiosidades).
 *
 * Silhuetas, como num filme antigo ou num desenho à mão (a cor vem do FilmStrip): famílias caminhando,
 * pessoas dividindo um momento, guarda-chuvas, paisagens, árvores e pequenos astros.
 * Todas saem dos mesmos ajudantes (a mesma pessoa, a mesma estrela, o mesmo traço),
 * para a coleção ter uma unidade só.
 *
 * Cada desenho cabe numa caixa de 100 × 80 centrada na origem (x de -50 a 50, y de -40
 * a 40), com o chão em y = 30. Formas `fill` são silhuetas; `line` são traços (w = espessura).
 */

export interface Shape {
  d: string
  /** Espessura do traço; sem ela, a forma é preenchida. */
  w?: number
}

export interface Memory {
  id: string
  shapes: Shape[]
}

const n = (v: number) => +v.toFixed(2)
const P = (...parts: Array<string | number>) => parts.map((p) => (typeof p === 'number' ? n(p) : p)).join(' ')

const fill = (d: string): Shape => ({ d })
const line = (d: string, w = 2.2): Shape => ({ d, w })

function circle(cx: number, cy: number, r: number): string {
  return P('M', cx - r, cy, 'a', r, r, 0, 1, 0, r * 2, 0, 'a', r, r, 0, 1, 0, -r * 2, 0, 'Z')
}

/** Estrela de quatro pontas (a mesma da identidade do site). */
function sparkle(cx: number, cy: number, r: number): string {
  const k = r / 50
  const pt = (x: number, y: number) => `${n(cx + x * k)} ${n(cy + y * k)}`
  return `M${pt(0, -50)} C${pt(5, -9)}, ${pt(9, -5)}, ${pt(34, 0)} C${pt(9, 5)}, ${pt(5, 9)}, ${pt(0, 50)} C${pt(-5, 9)}, ${pt(-9, 5)}, ${pt(-34, 0)} C${pt(-9, -5)}, ${pt(-5, -9)}, ${pt(0, -50)} Z`
}

/** Lua crescente aberta para a direita. */
function crescent(cx: number, cy: number, r: number): string {
  // Meia-volta pela esquerda e volta por um arco mais aberto: sobra a lua fina.
  return P('M', cx, cy - r, 'A', r, r, 0, 0, 0, cx, cy + r, 'A', r * 1.25, r * 1.25, 0, 0, 1, cx, cy - r, 'Z')
}

/** Morro arredondado de x0 a x1, com o topo em `top`. */
function hill(x0: number, x1: number, top: number, ground = 40): string {
  const mid = (x0 + x1) / 2
  return P('M', x0, ground, 'C', x0 + (mid - x0) * 0.4, top, mid - (x1 - x0) * 0.15, top, mid, top, 'C', mid + (x1 - x0) * 0.15, top, x1 - (x1 - mid) * 0.4, top, x1, ground, 'Z')
}

interface PersonOptions {
  /** Passada: 0 parado, 1 andando. */
  stride?: number
  dress?: boolean
  child?: boolean
  /** Mãos (pontos absolutos); sem elas, os braços caem ao lado do corpo. */
  hands?: [[number, number] | null, [number, number] | null]
}

/** Uma pessoa em pé, em silhueta. `g` é o chão, `h` a altura. */
function person(x: number, g: number, h: number, o: PersonOptions = {}): Shape[] {
  const r = h * (o.child ? 0.15 : 0.115)
  const cy = g - h + r
  const shoulder = cy + r + h * 0.05
  const sh = h * (o.child ? 0.13 : 0.12)
  const hip = g - h * 0.44
  const hh = h * 0.085
  const stride = o.stride ?? 0
  const out: Shape[] = [fill(circle(x, cy, r))]
  if (o.dress) {
    const hem = g - h * 0.2
    out.push(fill(P('M', x - sh, shoulder + h * 0.04, 'Q', x - sh, shoulder, x, shoulder, 'Q', x + sh, shoulder, x + sh, shoulder + h * 0.04, 'L', x + hh * 0.9, hip - h * 0.05, 'L', x + h * 0.17, hem, 'L', x - h * 0.17, hem, 'L', x - hh * 0.9, hip - h * 0.05, 'Z')))
    out.push(line(P('M', x - h * 0.05, hem, 'L', x - h * 0.05 - stride * h * 0.08, g), h * 0.06))
    out.push(line(P('M', x + h * 0.05, hem, 'L', x + h * 0.05 + stride * h * 0.1, g), h * 0.06))
  } else {
    out.push(fill(P('M', x - sh, shoulder + h * 0.04, 'Q', x - sh, shoulder, x, shoulder, 'Q', x + sh, shoulder, x + sh, shoulder + h * 0.04, 'L', x + hh, hip, 'L', x - hh, hip, 'Z')))
    out.push(line(P('M', x - hh * 0.45, hip, 'L', x - h * 0.03 - stride * h * 0.13, g), h * 0.075))
    out.push(line(P('M', x + hh * 0.45, hip, 'L', x + h * 0.03 + stride * h * 0.15, g), h * 0.075))
  }
  const handL = o.hands?.[0] ?? [x - sh * 1.15 - stride * h * 0.06, hip + h * 0.02]
  const handR = o.hands?.[1] ?? [x + sh * 1.15 + stride * h * 0.06, hip + h * 0.02]
  out.push(line(P('M', x - sh * 0.85, shoulder + h * 0.05, 'L', handL[0], handL[1]), h * 0.055))
  out.push(line(P('M', x + sh * 0.85, shoulder + h * 0.05, 'L', handR[0], handR[1]), h * 0.055))
  return out
}

/** Uma pessoa sentada (assento em `seat`), de lado, olhando para `facing` (1 direita, -1 esquerda). */
function seated(x: number, seat: number, h: number, facing: 1 | -1 = 1, ground = seat + h * 0.27): Shape[] {
  const r = h * 0.115
  const cy = seat - h * 0.62 + r
  const shoulder = cy + r + h * 0.05
  const knee = x + facing * h * 0.24
  return [
    fill(circle(x + facing * h * 0.02, cy, r)),
    fill(P('M', x - h * 0.1, shoulder + h * 0.03, 'Q', x, shoulder - h * 0.01, x + h * 0.1, shoulder + h * 0.03, 'L', x + h * 0.09, seat, 'L', x - h * 0.09, seat, 'Z')),
    line(P('M', x, seat - h * 0.02, 'L', knee, seat - h * 0.02, 'L', knee + facing * h * 0.02, ground), h * 0.075),
    line(P('M', x + facing * h * 0.05, shoulder + h * 0.06, 'L', x + facing * h * 0.16, seat - h * 0.06), h * 0.055),
  ]
}

const ground = (x0 = -46, x1 = 46, y = 30): Shape => line(P('M', x0, y, 'L', x1, y), 1.4)

function tree(x: number, g: number, h: number): Shape[] {
  return [
    line(P('M', x, g, 'L', x, g - h * 0.45), h * 0.07),
    fill(P('M', x - h * 0.3, g - h * 0.5, 'C', x - h * 0.42, g - h * 0.78, x - h * 0.12, g - h * 1.02, x + h * 0.04, g - h * 0.95, 'C', x + h * 0.32, g - h * 1.02, x + h * 0.44, g - h * 0.7, x + h * 0.28, g - h * 0.5, 'C', x + h * 0.18, g - h * 0.38, x - h * 0.2, g - h * 0.38, x - h * 0.3, g - h * 0.5, 'Z')),
  ]
}

function pine(x: number, g: number, h: number): Shape {
  return fill(P('M', x, g - h, 'L', x + h * 0.16, g - h * 0.62, 'L', x + h * 0.08, g - h * 0.62, 'L', x + h * 0.26, g - h * 0.24, 'L', x + h * 0.04, g - h * 0.24, 'L', x + h * 0.04, g, 'L', x - h * 0.04, g, 'L', x - h * 0.04, g - h * 0.24, 'L', x - h * 0.26, g - h * 0.24, 'L', x - h * 0.08, g - h * 0.62, 'L', x - h * 0.16, g - h * 0.62, 'Z'))
}

/** Guarda-chuva aberto, com o cabo descendo até a mão. */
function umbrella(cx: number, top: number, span: number, hand: [number, number]): Shape[] {
  const half = span / 2
  const rim = top + span * 0.32
  const scallop = Array.from({ length: 4 }, (_, i) => {
    const a = cx - half + (span / 4) * i
    return P('Q', a + span / 8, rim - span * 0.07, a + span / 4, rim)
  }).join(' ')
  return [
    fill(`${P('M', cx - half, rim, 'Q', cx - half, top, cx, top, 'Q', cx + half, top, cx + half, rim)} ${scallop} Z`),
    line(P('M', cx, top - 2, 'L', cx, top)),
    line(P('M', cx, rim, 'L', hand[0], hand[1], 'q', 0, 3, -2.5, 3), 1.6),
  ]
}

const rain = (cells: Array<[number, number]>): Shape[] => cells.map(([x, y]) => line(P('M', x, y, 'l', -2, 6), 1.1))

/* ------------------------------------------------------------------ */
/* A coleção                                                           */
/* ------------------------------------------------------------------ */

export const MEMORIES: Memory[] = [
  {
    // Uma família caminhando de mãos dadas.
    id: 'family',
    shapes: [
      ground(),
      ...person(-17, 30, 50, { stride: 0.8, hands: [null, [-6.5, 9]] }),
      ...person(0, 30, 45, { stride: 0.7, dress: true, hands: [[-6.5, 9], [10, 13]] }),
      ...person(18, 30, 27, { stride: 0.9, child: true, hands: [[10, 13], null] }),
    ],
  },
  {
    // Duas pessoas num banco, sob um poste aceso.
    id: 'bench',
    shapes: [
      ground(),
      line(P('M', -26, 17, 'L', 14, 17), 2.6),
      line(P('M', -22, 17, 'L', -22, 30, 'M', 10, 17, 'L', 10, 30), 1.8),
      line(P('M', -27, 6, 'L', 15, 6), 1.6),
      ...seated(-12, 16, 40, 1),
      ...seated(2, 16, 37, -1),
      line(P('M', 32, 30, 'L', 32, -22, 'Q', 32, -28, 27, -28), 2),
      fill(P('M', 22, -27, 'L', 32, -27, 'L', 30, -23, 'L', 24, -23, 'Z')),
      line(P('M', 22, -18, 'l', -4, 5, 'M', 27, -17, 'l', 0, 6, 'M', 32, -18, 'l', 4, 5), 1),
    ],
  },
  {
    // Alguém caminhando na chuva com o guarda-chuva.
    id: 'umbrella',
    shapes: [
      ground(),
      ...umbrella(-1, -32, 40, [4, 2]),
      ...person(0, 30, 48, { stride: 0.7, hands: [null, [4, 2]] }),
      ...rain([[-38, -30], [-30, -12], [-42, 4], [30, -26], [40, -8], [34, 10], [-24, 16], [26, 18]]),
    ],
  },
  {
    // Duas pessoas dividindo o mesmo guarda-chuva.
    id: 'sharing',
    shapes: [
      ground(),
      ...umbrella(-1, -34, 46, [-6, 0]),
      ...person(-9, 30, 47, { hands: [null, [-6, 0]] }),
      ...person(7, 30, 43, { dress: true, hands: [[-1, 4], null] }),
      ...rain([[-40, -24], [-34, -2], [36, -20], [42, 2], [-44, 14], [38, 18]]),
    ],
  },
  {
    // Uma criança soltando pipa no alto de um morro.
    id: 'kite',
    shapes: [
      fill(hill(-50, 30, 16)),
      ...person(-14, 16, 26, { child: true, hands: [null, [-4, 0]] }),
      line(P('M', -4, 0, 'Q', 14, -6, 28, -24), 0.9),
      fill(P('M', 28, -24, 'L', 33, -33, 'L', 38, -24, 'L', 33, -17, 'Z')),
      line(P('M', 33, -17, 'q', -3, 5, 0, 9, 't', 0, 9), 0.9),
      line(P('M', 31, -8, 'l', 4, -1, 'M', 31, -2, 'l', 4, 1), 0.9),
    ],
  },
  {
    // Passeio com o cachorro.
    id: 'dog',
    shapes: [
      ground(),
      ...person(-12, 30, 48, { stride: 0.8, hands: [null, [-1, 6]] }),
      line(P('M', -1, 6, 'Q', 6, 20, 15, 18), 0.9),
      fill(P('M', 13, 26, 'L', 13, 18, 'Q', 15, 14, 22, 15, 'L', 30, 15, 'L', 31, 10, 'L', 34, 12, 'L', 37, 13, 'L', 36, 17, 'L', 32, 18, 'L', 32, 26, 'L', 30, 26, 'L', 29, 21, 'L', 18, 21, 'L', 17, 26, 'Z')),
      line(P('M', 13, 18, 'q', -3, -3, -5, -5), 1.5),
      line(P('M', 14, 24, 'L', 13, 30, 'M', 18, 24, 'L', 19, 30, 'M', 28, 24, 'L', 27, 30, 'M', 31, 24, 'L', 32, 30), 1.6),
    ],
  },
  {
    // Uma árvore grande com um balanço.
    id: 'swing',
    shapes: [
      ground(),
      line(P('M', -26, 30, 'L', -26, -6), 5),
      line(P('M', -26, -10, 'Q', -6, -16, 18, -14), 2.6),
      fill(P('M', -48, 0, 'C', -54, -20, -36, -34, -20, -30, 'C', -8, -38, 18, -34, 22, -22, 'C', 34, -20, 30, -6, 16, -10, 'C', 6, -4, -10, -10, -16, -4, 'C', -26, 2, -42, 6, -48, 0, 'Z')),
      line(P('M', 4, -13, 'L', 6, 12, 'M', 14, -14, 'L', 16, 12), 0.9),
      line(P('M', 3, 12, 'L', 18, 12), 2),
      ...seated(11, 11, 24, 1, 20),
    ],
  },
  {
    // Piquenique no morro, debaixo de uma árvore.
    id: 'picnic',
    shapes: [
      fill(hill(-56, 56, 12)),
      ...tree(22, 13, 40),
      ...seated(-10, 11, 26, 1, 13),
      ...seated(4, 11, 24, -1, 13),
      line(P('M', -26, 9, 'L', -8, 8), 1),
      fill(sparkle(-34, -24, 4)),
      fill(sparkle(-20, -30, 2.4)),
    ],
  },
  {
    // Montanhas sob a lua.
    id: 'mountains',
    shapes: [
      fill(P('M', -50, 30, 'L', -30, 2, 'L', -22, 10, 'L', -6, -14, 'L', 6, -2, 'L', 14, -10, 'L', 34, 14, 'L', 50, 4, 'L', 50, 30, 'Z')),
      fill(crescent(26, -24, 8)),
      fill(sparkle(-28, -26, 3.4)),
      fill(sparkle(-12, -32, 2.2)),
      fill(sparkle(42, -8, 2.2)),
    ],
  },
  {
    // O mar, o sol se pondo e um barquinho.
    id: 'sea',
    shapes: [
      fill(P('M', -18, 8, 'A', 14, 14, 0, 0, 1, 10, 8, 'Z')),
      line(P('M', -46, 8, 'L', 46, 8), 1.4),
      line(P('M', -40, 15, 'q', 5, -3, 10, 0, 't', 10, 0, 't', 10, 0, 'M', 4, 22, 'q', 5, -3, 10, 0, 't', 10, 0, 't', 10, 0, 'M', -30, 28, 'q', 5, -3, 10, 0, 't', 10, 0), 1.2),
      fill(P('M', 22, 4, 'L', 38, 4, 'L', 35, 8, 'L', 25, 8, 'Z')),
      fill(P('M', 30, 3, 'L', 30, -14, 'L', 38, 2, 'Z')),
    ],
  },
  {
    // Um farol sobre as pedras.
    id: 'lighthouse',
    shapes: [
      fill(P('M', -50, 30, 'Q', -40, 14, -22, 18, 'Q', -12, 10, 0, 18, 'Q', 8, 20, 12, 30, 'Z')),
      fill(P('M', -14, 18, 'L', -11, -14, 'L', -3, -14, 'L', 0, 18, 'Z')),
      fill(P('M', -12.5, -16, 'L', -1.5, -16, 'L', -1.5, -22, 'L', -12.5, -22, 'Z')),
      fill(P('M', -14, -22, 'L', 0, -22, 'L', -7, -29, 'Z')),
      line(P('M', -1, -19, 'L', 44, -30, 'M', -1, -19, 'L', 44, -8), 0.9),
      line(P('M', 14, 26, 'q', 5, -3, 10, 0, 't', 10, 0, 't', 10, 0), 1.2),
    ],
  },
  {
    // A casa com fumaça na chaminé e uma árvore ao lado.
    id: 'house',
    shapes: [
      ground(),
      {
        d: `${P('M', -26, 30, 'L', -26, 4, 'L', -8, -12, 'L', 10, 4, 'L', 10, 30, 'Z')} ${P('M', -20, 10, 'h', 8, 'v', 7, 'h', -8, 'Z')} ${P('M', -4, 16, 'h', 7, 'v', 14, 'h', -7, 'Z')}`,
      },
      fill(P('M', 0, -6, 'L', 0, -14, 'L', 5, -14, 'L', 5, -2, 'Z')),
      line(P('M', 3, -17, 'q', -4, -4, 0, -8, 't', 0, -8, 't', 2, -6), 1.1),
      ...tree(30, 30, 40),
    ],
  },
  {
    // Andando de bicicleta.
    id: 'bicycle',
    shapes: [
      ground(),
      line(circle(-15, 20, 9.5), 1.8),
      line(circle(17, 20, 9.5), 1.8),
      line(P('M', -15, 20, 'L', -4, 6, 'L', 11, 6, 'L', 17, 20, 'M', -15, 20, 'L', 0, 20, 'L', -4, 6, 'M', 0, 20, 'L', 11, 6, 'M', 11, 6, 'L', 9, -1, 'L', 14, -2), 1.6),
      fill(circle(4, -21, 4.6)),
      line(P('M', -3, 4, 'L', 3, -12), 6),
      line(P('M', 2, -10, 'L', 12, -2), 2.6),
      line(P('M', -2, 4, 'L', 6, 12, 'L', 1, 21), 3),
    ],
  },
  {
    // Passarinhos num fio (como os do começo do site).
    id: 'birds',
    shapes: [
      line(P('M', -50, -6, 'Q', 0, 10, 50, -10), 1.1),
      ...[-30, -13, 6].map((x) => {
        // Pousados de verdade: os pés no fio (a mesma curva do traço acima).
        const t = (x + 50) / 100
        const y = (1 - t) ** 2 * -6 + 2 * t * (1 - t) * 10 + t * t * -10 - 2.2
        return fill(P('M', x - 5, y, 'Q', x - 5.5, y - 6, x, y - 6.5, 'Q', x + 1.5, y - 9.5, x + 4, y - 8.6, 'L', x + 6.8, y - 7.8, 'L', x + 4.4, y - 6.6, 'Q', x + 4.8, y - 1.6, x + 1, y, 'L', x + 0.6, y + 2.2, 'L', x - 0.6, y + 2.2, 'L', x - 1.4, y + 0.4, 'L', x - 3.4, y + 0.6, 'L', x - 8, y + 4.4, 'Z'))
      }),
      line(P('M', 22, -26, 'q', 4, -4, 7, 0, 'q', 3, -4, 7, 0, 'M', 34, -14, 'q', 3, -3, 5, 0, 'q', 2, -3, 5, 0), 1.4),
    ],
  },
  {
    // A lua e pequenas estrelas.
    id: 'night',
    shapes: [
      fill(crescent(-14, -6, 15)),
      fill(sparkle(16, -20, 6)),
      fill(sparkle(30, 4, 3.6)),
      fill(sparkle(8, 14, 2.6)),
      fill(sparkle(-38, 20, 3)),
      line(P('M', 10, 26, 'q', 6, -6, 14, -2, 'q', 6, -6, 14, 0), 1.2),
    ],
  },
  {
    // Uma criança no morro fazendo um pedido para a estrela cadente.
    id: 'wish',
    shapes: [
      fill(hill(-56, 40, 18)),
      ...person(-16, 18, 26, { child: true, hands: [null, [-9, 4]] }),
      fill(sparkle(30, -24, 5)),
      line(P('M', 26, -21, 'L', -4, -4), 1),
      line(P('M', 24, -26, 'L', 6, -16), 0.7),
      fill(sparkle(-36, -26, 2.4)),
    ],
  },
  {
    // Um balão sobre os morros.
    id: 'balloon',
    shapes: [
      fill(P('M', -50, 30, 'Q', -30, 14, -10, 24, 'Q', 14, 12, 50, 26, 'L', 50, 30, 'Z')),
      fill(P('M', 6, -6, 'C', -10, -12, -10, -36, 6, -36, 'C', 22, -36, 22, -12, 6, -6, 'Z')),
      line(P('M', 1, -6, 'L', 3, 2, 'M', 11, -6, 'L', 9, 2), 0.9),
      fill(P('M', 2, 2, 'h', 8, 'v', 5, 'h', -8, 'Z')),
      line(P('M', -36, -18, 'q', 4, -5, 9, -2, 'q', 5, -4, 9, 1), 1.2),
    ],
  },
  {
    // Um gato na janela, olhando a lua.
    id: 'window',
    shapes: [
      line(P('M', -26, -30, 'L', 26, -30, 'L', 26, 22, 'L', -26, 22, 'Z', 'M', 0, -30, 'L', 0, 22, 'M', -26, -4, 'L', 26, -4), 2),
      line(P('M', -32, 24, 'L', 32, 24), 3),
      fill(crescent(12, -18, 6)),
      fill(P('M', -18, 22, 'Q', -20, 10, -14, 6, 'L', -15, 0, 'L', -12, 3, 'L', -9, 3, 'L', -7, 0, 'L', -7, 6, 'Q', -2, 12, -6, 22, 'Z')),
      line(P('M', -6, 21, 'q', 6, 1, 6, -6), 1.4),
    ],
  },
  {
    // Um abraço.
    id: 'hug',
    shapes: [
      ground(),
      ...person(-6, 30, 48, { hands: [null, [6, -2]] }),
      ...person(7, 30, 44, { dress: true, hands: [[-6, -4], null] }),
      fill(sparkle(-30, -24, 3)),
      fill(sparkle(30, -28, 2.4)),
    ],
  },
  {
    // A roda-gigante sob as estrelas.
    id: 'wheel',
    shapes: [
      ground(),
      line(circle(0, -4, 24), 1.4),
      line(P('M', -24, -4, 'L', 24, -4, 'M', 0, -28, 'L', 0, 20, 'M', -17, -21, 'L', 17, 13, 'M', 17, -21, 'L', -17, 13), 0.8),
      line(P('M', -14, 30, 'L', 0, -4, 'L', 14, 30), 2),
      ...Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return fill(circle(Math.cos(a) * 24, -4 + Math.sin(a) * 24 + 3, 2.6))
      }),
      fill(sparkle(-38, -26, 3)),
      fill(sparkle(38, -18, 2.4)),
    ],
  },
  {
    // Um barco a remo no lago, sob a lua.
    id: 'lake',
    shapes: [
      line(P('M', -46, 12, 'L', 46, 12), 1.2),
      fill(P('M', -18, 6, 'L', 10, 6, 'Q', 6, 12, -2, 12, 'L', -12, 12, 'Q', -16, 10, -18, 6, 'Z')),
      ...seated(-4, 6, 22, 1, 7),
      line(P('M', 2, 2, 'L', 14, 16), 1.2),
      line(P('M', 34, 12, 'q', -2, -10, 2, -18, 'M', 38, 12, 'q', 0, -8, 4, -14, 'M', 30, 12, 'q', -1, -6, -4, -10), 1),
      fill(crescent(-30, -22, 7)),
      line(P('M', -32, 20, 'h', 6, 'M', -30, 25, 'h', 4), 1),
    ],
  },
  {
    // Alguém lendo sob o poste.
    id: 'lamp',
    shapes: [
      ground(),
      line(P('M', -18, 30, 'L', -18, -24, 'Q', -18, -30, -10, -30), 2),
      fill(P('M', -14, -30, 'L', -4, -30, 'L', -6, -26, 'L', -12, -26, 'Z')),
      line(P('M', -12, -22, 'L', -24, 24, 'M', -6, -22, 'L', 10, 24), 0.6),
      ...person(-2, 30, 44, { hands: [[2, -1], [6, -2]] }),
      fill(P('M', 1, -4, 'L', 9, -6, 'L', 9, 0, 'L', 1, 2, 'Z')),
    ],
  },
  {
    // Um bosque de pinheiros e a lua.
    id: 'pines',
    shapes: [
      ground(),
      pine(-34, 30, 40),
      pine(-18, 30, 54),
      pine(-2, 30, 36),
      pine(14, 30, 48),
      pine(30, 30, 32),
      fill(crescent(34, -26, 6)),
    ],
  },
  {
    // Duas pessoas de mãos dadas diante do sol.
    id: 'sunset',
    shapes: [
      line(circle(0, -2, 22), 1.4),
      line(P('M', -46, 30, 'L', 46, 30), 1.4),
      ...person(-8, 30, 46, { hands: [null, [0, 10]] }),
      ...person(8, 30, 42, { dress: true, hands: [[0, 10], null] }),
    ],
  },
  {
    // Uma criança soltando um aviãozinho de papel.
    id: 'plane',
    shapes: [
      ground(),
      ...person(-24, 30, 28, { child: true, hands: [null, [-14, 2]] }),
      line(P('M', -10, 0, 'Q', 8, -18, 22, -12), 1),
      fill(P('M', 24, -20, 'L', 40, -16, 'L', 26, -12, 'L', 28, -16, 'Z')),
      fill(sparkle(-8, -28, 2.6)),
    ],
  },
  {
    // Uma fogueira entre amigos, sob as estrelas.
    id: 'campfire',
    shapes: [
      ground(),
      ...seated(-18, 22, 32, 1, 30),
      ...seated(18, 22, 30, -1, 30),
      fill(P('M', 0, 26, 'C', -6, 22, -4, 14, 0, 6, 'C', 1, 12, 6, 14, 4, 20, 'C', 6, 18, 6, 22, 0, 26, 'Z')),
      line(P('M', -7, 29, 'L', 7, 25, 'M', -7, 25, 'L', 7, 29), 1.6),
      fill(sparkle(-28, -26, 3)),
      fill(sparkle(4, -32, 2.4)),
      fill(sparkle(32, -22, 3.4)),
    ],
  },
]

/** Os ids da coleção, na ordem acima. */
export const MEMORY_IDS = MEMORIES.map((m) => m.id)

/**
 * Distribui os desenhos pelos quadros: embaralha a coleção (sempre do mesmo jeito) e vai
 * dando um desenho por quadro, sem repetir dentro de uma fita enquanto houver desenho novo
 * e sem o mesmo desenho em dois quadros vizinhos.
 */
export function dealMemories(frameCounts: number[], rand: () => number): string[][] {
  const deck: string[] = []
  const refill = () => {
    const batch = [...MEMORY_IDS]
    for (let i = batch.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[batch[i], batch[j]] = [batch[j]!, batch[i]!]
    }
    deck.push(...batch)
  }
  return frameCounts.map((count) => {
    const strip: string[] = []
    for (let k = 0; k < count; k++) {
      if (deck.length < MEMORY_IDS.length) refill()
      const seen = new Set(strip.slice(-Math.min(strip.length, MEMORY_IDS.length - 1)))
      let pick = deck.findIndex((id) => !seen.has(id))
      if (pick < 0) pick = 0
      strip.push(deck.splice(pick, 1)[0]!)
    }
    return strip
  })
}
