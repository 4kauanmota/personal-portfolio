import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { externalProjects, projectDetails, projectsConfig } from '../src/content/projects.config.ts'
import snapshot from '../src/generated/projects.json' with { type: 'json' }
import { duplicatedExternals, mergeProjects, toCreatedAt } from '../src/lib/portfolio.ts'
import { LOCALES, PROJECT_CATEGORIES, PROJECT_KINDS, type ExternalProject, type ProjectsSnapshot, type RepoProject } from '../src/lib/types.ts'
import { safeUrl } from '../src/lib/urls.ts'

const repo = (over: Partial<RepoProject> & { id: string }): RepoProject => ({
  title: over.id,
  url: `https://github.com/4kauanmota/${over.id}`,
  readmeUrl: null,
  liveUrl: null,
  liveKind: null,
  kind: null,
  categories: ['other'],
  language: null,
  createdAt: '2024-01-01T00:00:00Z',
  pushedAt: '2024-01-01T00:00:00Z',
  archived: false,
  ...over,
})

const external = (over: Partial<ExternalProject> & { id: string }): ExternalProject => ({
  title: over.id,
  kind: 'web',
  createdAt: '2025-06-10',
  description: null,
  ...over,
})

describe('mergeProjects', () => {
  test('a configuração dá tipo, filtros e descrição; o GitHub continua dando a lista', () => {
    const [p] = mergeProjects([repo({ id: 'loja-web', title: 'Loja', categories: ['web'], kind: 'web' })], {
      details: { 'loja-web': { kind: 'game', also: ['web'], description: { 'pt-BR': 'Uma loja.', en: 'A store.' } } },
    })
    assert.equal(p?.kind, 'game')
    assert.deepEqual(p?.categories, ['games', 'web'])
    assert.deepEqual(p?.description, { 'pt-BR': 'Uma loja.', en: 'A store.' })
    assert.equal(p?.title, 'Loja')
  })

  test('sem entrada na configuração: tipo e filtros sugeridos, sem descrição', () => {
    const [p] = mergeProjects([repo({ id: 'novo', kind: 'app', categories: ['apps'] })])
    assert.equal(p?.kind, 'app')
    assert.deepEqual(p?.categories, ['apps'])
    assert.equal(p?.description, null)
  })

  test('descrição só vale com os dois idiomas', () => {
    const [p] = mergeProjects([repo({ id: 'x' })], { details: { x: { description: { 'pt-BR': 'Só português', en: ' ' } } } })
    assert.equal(p?.description, null)
  })

  test('liveUrl da configuração substitui ou esconde o do GitHub; endereços inválidos não viram botão', () => {
    const repos = [
      repo({ id: 'a', liveUrl: 'https://a.dev/', liveKind: 'site' }),
      repo({ id: 'b', liveUrl: 'https://b.dev/', liveKind: 'site' }),
      repo({ id: 'c' }),
      repo({ id: 'd', liveUrl: 'https://d.dev/', liveKind: 'site' }),
    ]
    const byId = Object.fromEntries(
      mergeProjects(repos, {
        details: { a: { liveUrl: 'https://www.npmjs.com/package/a' }, b: { liveUrl: null }, c: { liveUrl: 'javascript:alert(1)' } },
      }).map((p) => [p.id, p]),
    )
    assert.equal(byId.a?.liveUrl, 'https://www.npmjs.com/package/a')
    assert.equal(byId.a?.liveKind, 'package')
    assert.equal(byId.b?.liveUrl, null)
    assert.equal(byId.c?.liveUrl, null)
    assert.equal(byId.d?.liveUrl, 'https://d.dev/')
  })

  test('do mais novo para o mais antigo, misturando GitHub e configuração', () => {
    const list = mergeProjects([repo({ id: 'velho', createdAt: '2022-01-01T00:00:00Z' }), repo({ id: 'novo', createdAt: '2026-01-01T00:00:00Z' })], {
      external: [external({ id: 'meio', createdAt: '2024-05' })],
    })
    assert.deepEqual(
      list.map((p) => p.id),
      ['novo', 'meio', 'velho'],
    )
  })

  test('projeto privado nunca leva o link do repositório para a página', () => {
    const [p] = mergeProjects([], {
      external: [external({ id: 'cliente', private: true, repoUrl: 'https://gitlab.com/eu/cliente', liveUrl: 'https://cliente.com.br/' })],
    })
    assert.equal(p?.private, true)
    assert.equal(p?.url, null)
    assert.equal(p?.readmeUrl, null)
    assert.equal(p?.liveUrl, 'https://cliente.com.br/')
    assert.equal(p?.source, 'config')
    assert.ok(!JSON.stringify(p).includes('gitlab.com'))
  })

  test('sem cards repetidos: o projeto público do GitHub vence', () => {
    const repos = [repo({ id: 'jogo', url: 'https://github.com/4kauanmota/jogo' })]
    const list = mergeProjects(repos, {
      external: [
        external({ id: 'JOGO' }),
        external({ id: 'outro-nome', repoUrl: 'https://github.com/4KauanMota/jogo.git' }),
        external({ id: 'unico' }),
        external({ id: 'unico', title: 'Repetido' }),
      ],
    })
    assert.deepEqual(
      list.map((p) => p.id).sort(),
      ['jogo', 'unico'],
    )
    assert.equal(list.find((p) => p.id === 'unico')?.title, 'unico')
    assert.deepEqual(duplicatedExternals(repos, [external({ id: 'jogo' }), external({ id: 'x' })]), ['jogo'])
  })

  test('repositórios escondidos saem também na junção', () => {
    assert.equal(mergeProjects([repo({ id: 'segredo' })], { hidden: ['segredo'] }).length, 0)
  })

  test('datas da configuração viram ISO ao meio-dia (o dia não muda no fuso do Brasil)', () => {
    assert.equal(toCreatedAt('2026-03-24'), '2026-03-24T12:00:00Z')
    assert.equal(toCreatedAt('2026-03'), '2026-03-01T12:00:00Z')
  })

  test('imagem da configuração: https ou arquivo de public/, nada além disso', () => {
    const list = mergeProjects([], {
      external: [external({ id: 'a', image: '/projetos/a.png' }), external({ id: 'b', image: 'http://x.dev/b.png' }), external({ id: 'c', image: 'https://x.dev/c.png' })],
    })
    const byId = Object.fromEntries(list.map((p) => [p.id, p.image]))
    assert.deepEqual(byId, { a: '/projetos/a.png', b: null, c: 'https://x.dev/c.png' })
  })
})

describe('configuração dos projetos', () => {
  const snap = snapshot as unknown as ProjectsSnapshot

  // Repositório novo sem entrada (ou entrada de um repositório renomeado) não quebra nada:
  // o log da sincronização avisa. Aqui só se confere que o que está escrito é válido.
  test('tipos e filtros conhecidos; links válidos', () => {
    for (const [id, d] of Object.entries(projectDetails)) {
      if (d.kind) assert.ok(PROJECT_KINDS.includes(d.kind), `${id}: tipo desconhecido`)
      for (const c of d.also ?? []) assert.ok(PROJECT_CATEGORIES.includes(c), `${id}: filtro desconhecido ${c}`)
      if (d.liveUrl) assert.ok(safeUrl(d.liveUrl), `${id}: liveUrl inválido`)
    }
  })

  test('descrições: os dois idiomas, curtas o bastante para o card', () => {
    for (const [id, d] of Object.entries(projectDetails)) {
      if (!d.description) continue
      for (const locale of LOCALES) {
        const text = d.description[locale]
        assert.ok(text?.trim(), `${id}: falta a descrição em ${locale}`)
        assert.ok(text.length <= 170, `${id}: descrição em ${locale} longa demais para três linhas (${text.length})`)
      }
    }
  })

  test('projetos externos: campos obrigatórios e sem repetir repositórios públicos', () => {
    const ids = externalProjects.map((e) => e.id)
    assert.equal(new Set(ids).size, ids.length, 'ids repetidos em externalProjects')
    for (const e of externalProjects) {
      assert.match(e.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${e.id}: use minúsculas e hífens`)
      assert.ok(e.title.trim(), `${e.id}: falta o título`)
      assert.ok(PROJECT_KINDS.includes(e.kind), `${e.id}: tipo desconhecido`)
      assert.match(e.createdAt, /^\d{4}-\d{2}(-\d{2})?$/, `${e.id}: createdAt deve ser AAAA-MM-DD ou AAAA-MM`)
      if (e.description) for (const locale of LOCALES) assert.ok(e.description[locale]?.trim(), `${e.id}: falta a descrição em ${locale}`)
    }
    assert.deepEqual(duplicatedExternals(snap.projects, externalProjects), [])
  })

  test('a junção real não perde nem repete projetos', () => {
    const list = mergeProjects(snap.projects, { details: projectDetails, external: externalProjects, hidden: projectsConfig.hidden })
    assert.equal(list.length, snap.projects.length - projectsConfig.hidden.length + externalProjects.length)
    assert.equal(new Set(list.map((p) => p.id)).size, list.length)
    for (let i = 1; i < list.length; i++) assert.ok(list[i - 1]!.createdAt >= list[i]!.createdAt, 'ordem do mais novo para o mais antigo')
  })
})
