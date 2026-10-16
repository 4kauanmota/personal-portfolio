import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { aboutMore, aboutSummary, LANES, timeline, timelineOrigin, toolbox } from '../src/content/about.ts'
import { curiosities } from '../src/content/curiosities.ts'
import { links } from '../src/content/links.ts'
import { platforms } from '../src/content/platforms.ts'
import { existsSync, readFileSync } from 'node:fs'
import * as about from '../src/content/about.ts'
import * as projectsConfig from '../src/content/projects.config.ts'
import { site } from '../src/content/site.ts'
import en from '../src/i18n/messages/en.ts'
import { parsePath, pathFor } from '../src/i18n/meta.ts'
import ptBR from '../src/i18n/messages/pt-BR.ts'
import { LOCALES } from '../src/lib/types.ts'

function assertLocalized(value: Record<string, unknown>, where: string) {
  for (const locale of LOCALES) {
    const text = value[locale]
    assert.ok(typeof text === 'string' ? text.trim().length > 0 : Array.isArray(text) && text.length > 0, `${where}: falta o texto em ${locale}`)
  }
}

describe('conteúdo bilíngue', () => {
  test('Sobre mim e trajetória têm os dois idiomas', () => {
    assertLocalized(aboutSummary, 'aboutSummary')
    assertLocalized(aboutMore, 'aboutMore')
    assert.equal(aboutMore['pt-BR'].length, aboutMore.en.length, 'mesmo número de parágrafos')
    assertLocalized(timelineOrigin.title, 'timelineOrigin.title')
    assertLocalized(timelineOrigin.text, 'timelineOrigin.text')
    for (const entry of timeline) {
      assertLocalized(entry.title, `timeline.${entry.id}.title`)
      if (entry.text) assertLocalized(entry.text, `timeline.${entry.id}.text`)
      if (entry.mode) assertLocalized(entry.mode, `timeline.${entry.id}.mode`)
    }
    for (const group of toolbox) assertLocalized(group.label, `toolbox.${group.id}`)
  })

  test('trajetória: datas válidas, caminhos conhecidos e sem sobreposição no mesmo caminho', () => {
    const month = (ym: string) => {
      assert.match(ym, /^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/, `data inválida: ${ym}`)
      const [y, m] = ym.split('-').map(Number)
      return (y ?? 0) * 12 + (m ?? 0)
    }
    const ids = timeline.map((e) => e.id)
    assert.equal(new Set(ids).size, ids.length, 'ids repetidos')
    for (const entry of timeline) {
      if (entry.start) month(entry.start)
      if (entry.end) month(entry.end)
      assert.ok(LANES.includes(entry.lane), `${entry.id}: caminho desconhecido`)
      if (entry.end) assert.ok(entry.start, `${entry.id}: tem fim mas não tem início`)
      if (entry.start && entry.end) assert.ok(month(entry.start) <= month(entry.end), `${entry.id}: termina antes de começar`)
    }
    for (const lane of LANES) {
      const dated = timeline.filter((e) => e.lane === lane && e.start).sort((a, b) => month(a.start!) - month(b.start!))
      for (let i = 1; i < dated.length; i++) {
        const prev = dated[i - 1]!
        assert.ok(prev.end && month(prev.end) <= month(dated[i]!.start!), `${lane}: ${prev.id} e ${dated[i]!.id} se sobrepõem`)
      }
    }
  })

  test('curiosidades: ids únicos e textos completos', () => {
    const ids = curiosities.map((c) => c.id)
    assert.equal(new Set(ids).size, ids.length, 'ids repetidos')
    for (const c of curiosities.filter((item) => !item.draft)) {
      assertLocalized(c.topic, `${c.id}.topic`)
      assertLocalized(c.answer, `${c.id}.answer`)
      assertLocalized(c.note, `${c.id}.note`)
    }
  })

  test('links usam plataformas conhecidas e endereços válidos', () => {
    for (const link of links) {
      assert.ok(link.platform in platforms, `plataforma desconhecida: ${link.platform}`)
      assert.match(link.url, /^(https:\/\/|mailto:)/, `endereço inválido: ${link.url}`)
    }
  })

  test('links: GitHub, LinkedIn, Pixel Mole e e-mail, nessa ordem, sem WakaTime', () => {
    assert.ok(!links.some((l) => l.platform === 'wakatime'), 'o WakaTime não deve aparecer nos links')
    assert.deepEqual(
      links.map((l) => l.platform),
      ['github', 'linkedin', 'pixelmole', 'email'],
    )
    // O endereço exato do perfil no site do Pixel Mole.
    assert.equal(links.find((l) => l.platform === 'pixelmole')?.url, 'https://pixelmole.com.br/members/4kauanmota')
    assert.equal(platforms.pixelmole.label, 'Pixel Mole')
    // Ícone: o símbolo comum de link, um caminho simples (sem números quebrados).
    assert.match(platforms.pixelmole.icon, /^M[\d.\sMLAZ]+$/)
  })

  test('página de links: um link só, na seção Links, logo abaixo de "Em todo lugar"', () => {
    const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
    const section = read('../src/components/links/LinksSection.vue')
    const footer = read('../src/components/layout/SiteFooter.vue')
    assert.ok(section.includes("hrefFor('links')"), 'a seção Links leva à página de links')
    assert.ok(section.indexOf("t('links.lead')") < section.indexOf("hrefFor('links')"), 'o link vem depois do texto')
    assert.ok(!footer.includes("hrefFor('links')"), 'o rodapé não repete o link')
    assert.ok(footer.includes('href="#conteudo"'), 'o rodapé mantém o voltar ao topo')
  })

  test('textos longos da trajetória: os mesmos parágrafos nos dois idiomas', () => {
    for (const entry of timeline) {
      if (!entry.text) continue
      const count = (v: string) => v.split(/\n\s*\n/).filter((p) => p.trim()).length
      assert.equal(count(entry.text['pt-BR']), count(entry.text.en), `${entry.id}: parágrafos diferentes entre os idiomas`)
    }
    const levty = timeline.find((e) => e.id === 'levty')
    assert.ok(levty?.text?.['pt-BR'].includes('SYDLE ONE') && levty.text.en.includes('SYDLE ONE'), 'LEVTY com a descrição nos dois idiomas')
    const vianna = timeline.find((e) => e.id === 'vianna')
    assert.ok(vianna?.text?.['pt-BR'].startsWith('Minha passagem pelo Instituto Vianna Júnior'), 'texto do Instituto Vianna Júnior')
  })
})

describe('rotas por idioma', () => {
  test('caminhos e leitura do endereço', () => {
    assert.equal(pathFor('home', 'pt-BR'), '')
    assert.equal(pathFor('home', 'en'), 'en/')
    assert.equal(pathFor('links', 'en'), 'en/links/')
    assert.deepEqual(parsePath('/en/links/', '/'), { page: 'links', locale: 'en', explicitLocale: true })
    assert.deepEqual(parsePath('/portfolio/', '/portfolio/'), { page: 'home', locale: 'pt-BR', explicitLocale: false })
    assert.equal(parsePath('/qualquer-coisa', '/').page, 'notfound')
  })
})

/** Todos os textos de um valor (objetos, listas e strings), com o caminho de cada um. */
function* textsOf(value: unknown, path: string): Generator<[string, string]> {
  if (typeof value === 'string') yield [path, value]
  else if (Array.isArray(value)) for (const [i, item] of value.entries()) yield* textsOf(item, `${path}[${i}]`)
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) yield* textsOf(item, `${path}.${key}`)
}

describe('pontuação', () => {
  // Travessão (—), meia-risca (–) e hífen solto usado como travessão (" - ") não aparecem em nenhum texto do site.
  const DASH = /[\u2012\u2013\u2014\u2015]|\s-\s/

  test('sem travessões nos textos do site, nas traduções e nas descrições dos projetos', () => {
    const sources: Record<string, unknown> = { ptBR, en, about, curiosities, links, site, projects: projectsConfig }
    for (const [name, value] of Object.entries(sources)) {
      for (const [path, text] of textsOf(value, name)) assert.doesNotMatch(text, DASH, `${path}: "${text}"`)
    }
  })

  test('sem travessões no HTML base e na documentação', () => {
    for (const file of ['index.html', 'README.md']) {
      const url = new URL(`../${file}`, import.meta.url)
      if (!existsSync(url)) continue
      const lines = readFileSync(url, 'utf8').split('\n')
      for (const [i, line] of lines.entries()) assert.doesNotMatch(line, /[\u2012\u2013\u2014\u2015]/, `${file}:${i + 1}`)
    }
  })
})

