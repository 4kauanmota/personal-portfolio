import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { centerline, displace, envelope, frameAnchors, frameGeometry, pulse, uprightOffset, whipDuration, whipOffset, whipSettle, WHIP } from '../src/lib/film.ts'
import { dealMemories, MEMORIES, MEMORY_IDS } from '../src/lib/memories.ts'

describe('fitas: geometria', () => {
  test('a linha central passa pelas pontas e mede o comprimento certo', () => {
    const line = centerline([
      [0, 0],
      [300, 0],
    ])
    assert.deepEqual(line.points[0], [0, 0])
    assert.ok(Math.abs(line.points.at(-1)![0] - 300) < 0.01)
    assert.ok(Math.abs(line.length - 300) < 0.5, `comprimento ${line.length}`)
    // Passos iguais (o que mantém os quadros do mesmo tamanho ao longo da curva).
    const steps = line.points.slice(1).map((p, i) => Math.hypot(p[0] - line.points[i]![0], p[1] - line.points[i]![1]))
    assert.ok(Math.max(...steps) - Math.min(...steps) < 0.5)
  })

  test('curvas ficam mais longas que a reta entre as pontas', () => {
    const line = centerline([
      [0, 0],
      [100, 80],
      [200, -80],
      [300, 0],
    ])
    assert.ok(line.length > 320)
  })

  test('um quadro a cada período, seguindo o ângulo da fita', () => {
    const line = centerline([
      [0, 0],
      [0, 200],
    ])
    const frames = frameAnchors(line, 20, 10)
    assert.equal(frames.length, 10)
    assert.ok(frames.every((f) => Math.abs(f.angle - 90) < 0.5))
    assert.ok(Math.abs(frames[3]!.y - 70) < 0.5)
  })

  test('deslocar na perpendicular move cada ponto pela normal', () => {
    const line = centerline([
      [0, 0],
      [100, 0],
    ])
    const moved = displace(line, () => 5)
    assert.ok(moved.every((p, i) => Math.abs(p[0] - line.points[i]![0]) < 1e-9 && Math.abs(Math.abs(p[1]) - 5) < 1e-9))
    const shifted = displace(line, () => 0, () => [0, 3])
    assert.ok(shifted.every((p) => p[1] === 3))
  })
})

describe('fitas: chicote', () => {
  test('nada se move antes de a onda chegar', () => {
    assert.equal(pulse(0), 0)
    assert.equal(pulse(-1), 0)
    // A onda leva comprimento / velocidade para chegar no meio de uma fita de 720 px.
    assert.equal(whipOffset(0.5, 720, 0.4, 0, 10, 'free'), 0)
    assert.notEqual(whipOffset(0.5, 720, 0.6, 0, 10, 'free'), 0)
  })

  test('a onda percorre a fita com atraso: perto do impulso mexe primeiro', () => {
    const first = (s: number) => {
      for (let t = 0; t < 3; t += 0.005) if (Math.abs(whipOffset(s, 900, t, 0.1, 10, 'free')) > 0.01) return t
      return Infinity
    }
    assert.ok(first(0.1) < first(0.5) && first(0.5) < first(0.9))
  })

  test('se dissipa: depois do tempo previsto sobra menos de 4% da amplitude', () => {
    const length = 800
    const delay = 0.3
    const end = whipDuration(length, delay)
    for (const s of [0, 0.25, 0.5, 0.75, 1]) {
      for (let t = end; t < end + 2; t += 0.05) {
        assert.ok(Math.abs(whipOffset(s, length, t, delay, 20, 'free')) < 0.04 * 20, `s=${s} t=${t}`)
      }
    }
    assert.ok(end < 6)
    assert.ok(WHIP.decay > 0)
  })

  test('cada fita para de ser redesenhada quando o balanço fica menor que meio pixel', () => {
    const length = 700
    const delay = 0.2
    for (const amplitude of [2, 6, 15]) {
      const end = delay + length / WHIP.speed + whipSettle(amplitude)
      assert.ok(end <= whipDuration(length, delay) + 1e-9, `amplitude ${amplitude}`)
      for (const s of [0, 0.5, 1]) {
        for (let t = end; t < end + 2; t += 0.02) {
          assert.ok(Math.abs(whipOffset(s, length, t, delay, amplitude, 'free')) < 0.5, `a=${amplitude} s=${s} t=${t}`)
        }
      }
    }
    // Onda menor para antes; onda que nem chega a meio pixel nem começa.
    assert.ok(whipSettle(4) < whipSettle(15))
    assert.equal(whipSettle(0.3), 0)
    assert.ok(whipSettle(15) < 2.71, 'para antes do fim previsto para a cena toda')
  })

  test('presa nas duas pontas, as pontas não se mexem; solta, a ponta chicoteia', () => {
    assert.equal(envelope(0, 'both'), 0)
    assert.ok(envelope(1, 'both') < 1e-6)
    assert.ok(envelope(0.5, 'both') > 0.99)
    assert.equal(envelope(0, 'start'), 0)
    assert.equal(envelope(1, 'start'), 1)
    assert.ok(envelope(1, 'free') > envelope(0, 'free'))
  })
})

describe('fitas: quadros e lembranças', () => {
  test('todo quadro recebe uma lembrança, sem repetir lado a lado nem dentro de uma fita curta', () => {
    let s = 7
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    const counts = [12, 30, 5, 18, 9]
    const dealt = dealMemories(counts, rand)
    assert.deepEqual(dealt.map((d) => d.length), counts)
    for (const strip of dealt) {
      assert.ok(strip.every((id) => MEMORY_IDS.includes(id)))
      assert.ok(strip.every((id, k) => k === 0 || strip[k - 1] !== id), 'vizinhos diferentes')
      const window = strip.slice(0, Math.min(strip.length, MEMORY_IDS.length))
      assert.equal(new Set(window).size, window.length, 'sem repetir enquanto houver desenho novo')
    }
    assert.equal(new Set(dealt.flat()).size, MEMORY_IDS.length, 'a coleção inteira aparece')
  })

  test('cada lembrança tem desenho, e a coleção é variada', () => {
    assert.ok(MEMORIES.length >= 20)
    for (const m of MEMORIES) assert.ok(m.shapes.length > 0 && m.shapes.every((sh) => sh.d.length > 4 && !/NaN|undefined/.test(sh.d)), m.id)
  })

  test('os desenhos ficam em pé: fita deitada mostra o quadro de lado, fita em pé mostra como no cinema', () => {
    const lying = centerline([
      [0, 0],
      [300, 20],
    ])
    const standing = centerline([
      [0, 0],
      [10, 300],
    ])
    const backwards = centerline([
      [300, 0],
      [0, 10],
    ])
    assert.equal(uprightOffset(lying), 0)
    assert.equal(Math.abs(uprightOffset(standing)), 90)
    assert.equal(uprightOffset(backwards), 180)
    const side = frameGeometry(40, 0)
    const cinema = frameGeometry(40, 90)
    assert.ok(side.window.w > side.window.h && cinema.window.h < cinema.window.w)
    assert.ok(side.window.h <= 40 * 0.7 && cinema.window.w <= 40 * 0.7, 'a janela cabe entre as perfurações')
  })
})
