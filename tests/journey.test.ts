import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { timeline } from '../src/content/about.ts'
import { clusterJourney, columnsThatFit, displayColumns, spanTracks, type JourneyInput } from '../src/lib/journey.ts'

const m = (ym: string) => {
  const [y, mo] = ym.split('-').map(Number)
  return (y ?? 0) * 12 + ((mo ?? 1) - 1)
}
const NOW = m('2026-10')
const item = (id: string, start: string | null, end: string | null = null): JourneyInput => ({ id, start: start ? m(start) : null, end: end ? m(end) : null })

describe('trajetória: distribuição', () => {
  test('um item sozinho: um trecho de uma coluna (fica centralizado)', () => {
    const clusters = clusterJourney([item('a', '2020-01', '2021-01')], NOW)
    assert.equal(clusters.length, 1)
    assert.equal(clusters[0]!.columns, 1)
  })

  test('dois ao mesmo tempo: duas colunas (metade para cada)', () => {
    const [c] = clusterJourney([item('a', '2020-01', '2021-01'), item('b', '2020-06', '2020-12')], NOW)
    assert.equal(c!.columns, 2)
    assert.deepEqual(c!.column, { a: 0, b: 1 })
  })

  test('três ao mesmo tempo: três colunas iguais', () => {
    const [c] = clusterJourney([item('a', '2020-01', '2021-01'), item('b', '2020-02', '2020-12'), item('c', '2020-03', '2020-11')], NOW)
    assert.equal(c!.columns, 3)
    assert.deepEqual(Object.values(c!.column).sort(), [0, 1, 2])
  })

  test('um depois do outro: trechos separados, cada um com uma coluna', () => {
    const clusters = clusterJourney([item('a', '2020-01', '2020-06'), item('b', '2020-06', '2021-01'), item('c', '2022-01', '2022-05')], NOW)
    assert.deepEqual(clusters.map((c) => c.columns), [1, 1, 1])
    assert.deepEqual(clusters.map((c) => c.ids), [['a'], ['b'], ['c']])
  })

  test('sobreposição parcial: quem não se cruza divide a mesma coluna', () => {
    const [c] = clusterJourney([item('longo', '2022-02', '2023-11'), item('x', '2022-06', '2022-11'), item('y', '2023-06', '2023-11')], NOW)
    assert.equal(c!.columns, 2)
    assert.equal(c!.column.x, c!.column.y)
    assert.notEqual(c!.column.longo, c!.column.x)
    assert.deepEqual(c!.ids, ['longo', 'x', 'y'])
  })

  test('sem data de início entra no trecho que chega até hoje, ao lado', () => {
    const clusters = clusterJourney([item('antes', '2024-05', '2025-09'), item('hoje', '2025-09'), item('estudio', null)], NOW)
    assert.equal(clusters.length, 2)
    assert.deepEqual(clusters[1]!.ids, ['hoje', 'estudio'])
    assert.equal(clusters[1]!.columns, 2)
    assert.ok(clusters[1]!.ongoing)
  })

  test('sem data de início e nada em andamento: trecho próprio no fim', () => {
    const clusters = clusterJourney([item('antes', '2020-01', '2020-06'), item('solto', null)], NOW)
    assert.equal(clusters.length, 2)
    assert.deepEqual(clusters[1]!.ids, ['solto'])
  })

  test('a trajetória real: formação e estágios lado a lado, Afilio sozinha, LEVTY e Pixel Mole juntos', () => {
    const months = (ym?: string) => (ym ? m(ym) : null)
    const clusters = clusterJourney(timeline.map((e) => ({ id: e.id, start: months(e.start), end: months(e.end) })), NOW)
    assert.deepEqual(
      clusters.map((c) => [c.ids, c.columns]),
      [
        [['vianna', 'pjf', 'compass'], 2],
        [['afilio'], 1],
        [['levty', 'pixel-mole'], 2],
      ],
    )
  })

  test('colunas que cabem e redistribuição quando falta espaço', () => {
    assert.equal(columnsThatFit(1200, 240, 28), 4)
    assert.equal(columnsThatFit(350, 240, 28), 1)
    assert.equal(columnsThatFit(100, 240, 28), 1)
    const [c] = clusterJourney([item('a', '2020-01', '2021-01'), item('b', '2020-02', '2020-12'), item('c', '2020-03', '2020-11')], NOW)
    const two = displayColumns(c!, 2)
    assert.equal(two.count, 2)
    assert.deepEqual(two.of, { a: 0, b: 1, c: 0 })
    assert.equal(displayColumns(c!, 5).count, 3)
  })
})

describe('trajetória: posição pela duração', () => {
  const opts = { top: 100, month: 10, minRow: 18, stack: 28 }
  const span = (id: string, start: string, end: string, height: number) => ({ id, start: m(start), end: m(end), height })

  test('experiência longa: o trilho segue a duração e a caixa mantém o tamanho natural', () => {
    const { tracks } = spanTracks([span('longa', '2022-02', '2023-11', 130)], opts)
    const t = tracks.longa!
    assert.equal(t.top, 100)
    // 21 meses a 10 px, menos o respiro entre experiências: bem maior que a caixa (130 px).
    assert.equal(t.length, 21 * 10 - 28)
    assert.ok(t.length > 130)
  })

  test('experiência curta com muito texto: o trilho cresce até a caixa caber, nunca o contrário', () => {
    const { tracks } = spanTracks([span('curta', '2023-06', '2023-08', 300)], opts)
    assert.ok(tracks.curta!.length >= 300, `${tracks.curta!.length}`)
  })

  test('simultâneas: a longa cobre as duas curtas da outra coluna, cada uma no seu período', () => {
    const { tracks, bottom } = spanTracks(
      [span('formacao', '2022-02', '2023-11', 130), span('estagio1', '2022-06', '2022-11', 220), span('estagio2', '2023-06', '2023-11', 290)],
      opts,
    )
    const f = tracks.formacao!
    const a = tracks.estagio1!
    const b = tracks.estagio2!
    // Começam nas datas: o primeiro estágio depois do início da formação, o segundo depois do primeiro.
    assert.ok(a.top > f.top && b.top > a.top + a.length)
    // A formação termina junto com o segundo estágio (mesmo mês de fim).
    assert.equal(Math.round(f.top + f.length), Math.round(b.top + b.length))
    // Cada caixa cabe no seu trilho.
    assert.ok(a.length >= 220 && b.length >= 290 && f.length >= 130)
    assert.equal(Math.round(bottom), Math.round(f.top + f.length))
  })

  test('mais tempo, trilho maior (proporcional quando o texto cabe)', () => {
    const { tracks } = spanTracks([span('a', '2020-01', '2020-07', 40), span('b', '2021-01', '2022-07', 40)], opts)
    assert.ok(tracks.b!.length > tracks.a!.length * 2.5)
  })
})

