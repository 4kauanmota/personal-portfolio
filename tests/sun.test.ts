import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { makeParticles, particleAt, sunState } from '../src/lib/sun.ts'

/** Sobre mim de 5500 px numa tela de 1440 × 900, com o topo em `top`. */
const at = (top: number, still = false) => sunState({ top, height: 5500, vw: 1440, vh: 900, still })
/** Topo do Sobre mim para que o pé dele fique a `toBurst` px do início da explosão. */
const topFor = (toBurst: number) => 0.9 * 900 + toBurst - 5500

describe('sol: a história segue só a rolagem', () => {
  test('não existe antes do Sobre mim nem depois da explosão', () => {
    assert.equal(at(5000).active, false)
    assert.equal(at(topFor(-0.7 * 900)).active, false)
  })

  test('surge discreto, ganha brilho e depois perde luz', () => {
    const early = at(1.5 * 900 - 0.05 * (5500 + 540))
    const peak = at(1.5 * 900 - 0.35 * (5500 + 540))
    const late = at(topFor(1.4 * 900))
    assert.ok(early.active && early.lum < 0.3, `início ${early.lum}`)
    assert.ok(peak.lum > 0.95, `auge ${peak.lum}`)
    assert.ok(late.lum < peak.lum * 0.75, `fim ${late.lum}`)
    assert.ok(late.radius > peak.radius, 'incha antes de morrer')
  })

  test('degrada aos poucos antes de explodir; colapsa; e só então explode', () => {
    const beforeDecay = at(topFor(1.9 * 900))
    const decaying = at(topFor(1.0 * 900))
    const collapsing = at(topFor(0.12 * 900))
    const exploding = at(topFor(-0.2 * 900))
    assert.equal(beforeDecay.decay, 0)
    assert.ok(decaying.decay > 0.2 && decaying.decay < 0.9 && decaying.burst === 0, `degradando ${decaying.decay}`)
    assert.ok(collapsing.collapse > 0.3 && collapsing.burst === 0)
    assert.ok(exploding.burst > 0.2 && exploding.burst < 0.6)
  })

  test('voltar a rolagem devolve exatamente o mesmo estado', () => {
    const a = at(-2400)
    at(-3800)
    const b = at(-2400)
    assert.deepEqual(a, b)
  })

  test('movimento reduzido: parado, sem tremer nem explodir', () => {
    const s1 = at(topFor(1.0 * 900), true)
    const s2 = at(topFor(0.4 * 900), true)
    assert.equal(s1.decay, 0)
    assert.equal(s2.collapse, 0)
    assert.equal(s1.x, s2.x)
    assert.equal(s1.y, s2.y)
  })

  test('partículas: sempre as mesmas, saem do centro e somem no fim', () => {
    assert.deepEqual(makeParticles(10), makeParticles(10))
    const p = makeParticles(40)
    assert.ok(p.every((q) => particleAt(q, 0, 400) === null))
    const mid = p.map((q) => particleAt(q, 0.4, 400)).filter(Boolean)
    assert.ok(mid.length > 30)
    assert.ok(mid.some((q) => Math.hypot(q!.x, q!.y) > 100))
    const end = p.map((q) => particleAt(q, 1, 400))
    assert.ok(end.every((q) => !q || q.alpha < 0.02))
  })
})
