import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { categorize, detectLanguage, guessKind, humanizeRepoName, normalizeTechnologies } from '../scripts/lib/classify.ts'
import { hostOf, isSelfLink, liveKind, normalizeHomepage, pageIsThisSite, pointsToSite } from '../scripts/lib/links.ts'

const base = { topics: [] as string[], technologies: [] as string[], languages: [] as string[], readmeText: '' }

describe('categorize', () => {
  test('o nome do repositório não classifica nada', () => {
    assert.deepEqual(categorize({ ...base }), ['other'])
    assert.deepEqual(guessKind(categorize({ ...base })), null)
  })

  test('celular e computador ficam juntos em "apps"', () => {
    assert.deepEqual(categorize({ ...base, topics: ['electron'] }), ['apps'])
    assert.deepEqual(categorize({ ...base, technologies: ['Capacitor'] }), ['apps'])
  })

  test('reconhece jogos por tópico, linguagem ou texto', () => {
    assert.ok(categorize({ ...base, topics: ['game'] }).includes('games'))
    assert.ok(categorize({ ...base, topics: ['indie-games', 'nuxt'] }).includes('games'))
    assert.ok(categorize({ ...base, languages: ['GDScript'] }).includes('games'))
    assert.ok(categorize({ ...base, readmeText: 'Um jogo feito em Godot para uma game jam' }).includes('games'))
  })

  test('app React Native não vira "web" só pelo tópico react', () => {
    assert.deepEqual(categorize({ ...base, topics: ['react', 'react-native'] }), ['apps'])
  })

  test('sem pistas, usa as linguagens; sem nada, "outros"', () => {
    assert.deepEqual(categorize({ ...base, languages: ['HTML'] }), ['web'])
    assert.deepEqual(categorize({ ...base, languages: ['Java'] }), ['other'])
  })
})

describe('guessKind', () => {
  test('o tipo sai da categoria principal', () => {
    assert.equal(guessKind(['games', 'web']), 'game')
    assert.equal(guessKind(['apps']), 'app')
    assert.equal(guessKind(['servers']), 'api')
    assert.equal(guessKind(['tools']), 'cli')
    assert.equal(guessKind(['tools'], ['npm-package']), 'lib')
    assert.equal(guessKind(['web']), 'web')
    assert.equal(guessKind(['other']), null)
  })
})

describe('normalizeTechnologies', () => {
  test('padroniza nomes e ignora ferramentas de apoio', () => {
    assert.deepEqual(normalizeTechnologies(['TYPESCRIPT', 'VISUAL STUDIO CODE', 'Nuxt 4 + Vue 3', 'Electron 44', 'REACT NATIVE', 'typesc']), [
      'TypeScript',
      'Nuxt',
      'Vue',
      'Electron',
      'React Native',
    ])
  })
})

describe('detectLanguage', () => {
  test('distingue português e inglês', () => {
    assert.equal(detectLanguage('Este projeto é um app de notas com tarefas e mapas mentais para você.'), 'pt-BR')
    assert.equal(detectLanguage('This project is a notes app with tasks and mind maps for you.'), 'en')
    assert.equal(detectLanguage('ok'), null)
  })
})

describe('humanizeRepoName', () => {
  test('tira o sufixo da convenção de nomes e capitaliza', () => {
    assert.equal(humanizeRepoName('dev-calc-web'), 'Dev Calc')
    assert.equal(humanizeRepoName('sales-and-purchases-web'), 'Sales and Purchases')
    assert.equal(humanizeRepoName('4notes-app'), '4notes')
  })

  test('o tipo fica na etiqueta, não no nome (sem "Food API API")', () => {
    assert.equal(humanizeRepoName('prediction-model-ai'), 'Prediction Model')
    assert.equal(humanizeRepoName('food-api'), 'Food')
    assert.equal(humanizeRepoName('create-react-toolkit-cli'), 'Create React Toolkit')
  })

  test('nome que é só o sufixo continua inteiro', () => {
    assert.equal(humanizeRepoName('api'), 'API')
  })
})

describe('links', () => {
  test('corrige o GitHub Pages de repositórios renomeados', () => {
    assert.equal(
      normalizeHomepage({ homepage: 'https://4kauanmota.github.io/mandarin_mandaTrends-WEB/', name: 'manda-trends-web', owner: '4kauanmota', hasPages: true }),
      'https://4kauanmota.github.io/manda-trends-web/',
    )
    assert.equal(normalizeHomepage({ homepage: 'dev-calc.vercel.app', name: 'x', owner: 'u', hasPages: false }), 'https://dev-calc.vercel.app/')
    assert.equal(normalizeHomepage({ homepage: '', name: 'x', owner: 'u', hasPages: true }), null)
  })

  test('identifica o tipo de destino', () => {
    assert.equal(liveKind('https://www.npmjs.com/package/create-react-toolkit'), 'package')
    assert.equal(liveKind('https://imgur.com/a/h71mDBV'), 'media')
    assert.equal(liveKind('https://4notes-web.vercel.app/'), 'site')
  })

  test('reconhece links que voltariam para o próprio portfólio', () => {
    const siteHosts = new Set(['4kauanmota.vercel.app', hostOf('www.meusite.dev')])
    assert.equal(pointsToSite('https://4kauanmota.vercel.app/', siteHosts), true)
    assert.equal(pointsToSite('https://4kauanmota.vercel.app/projetos', siteHosts), true)
    assert.equal(pointsToSite('https://meusite.dev', siteHosts), true)
    assert.equal(pointsToSite('https://4notes-web.vercel.app/', siteHosts), false)
    assert.equal(pointsToSite('não é url', siteHosts), false)
  })

  test('mesmo endereço não basta: o link só some se a página publicada for este portfólio', () => {
    const portfolio = '<head><title>4kauanmota | Kauan Soares Mota</title><meta property="og:site_name" content="4kauanmota" /></head>'
    const reversed = "<meta content='4kauanmota' property='og:site_name'>"
    const oldSpace = '<head><meta charset="UTF-8" /><title>Kauan Mota</title></head>'
    const lookalike = '<meta property="og:site_name" content="4kauanmota-blog">'
    assert.equal(pageIsThisSite(portfolio, '4kauanmota'), true)
    assert.equal(pageIsThisSite(reversed, '4kauanmota'), true)
    assert.equal(pageIsThisSite(oldSpace, '4kauanmota'), false)
    assert.equal(pageIsThisSite(lookalike, '4kauanmota'), false)
    // O portfólio antigo (space-portfolio-web) ainda publicado no domínio padrão: o link fica.
    assert.equal(isSelfLink('other-site', false), false)
    assert.equal(isSelfLink('other-site', true), false)
    // Este portfólio já publicado lá: o link sai.
    assert.equal(isSelfLink('this-site', false), true)
    // Sem rede: só sai se o endereço for o do próprio deploy (SITE_URL ou Vercel).
    assert.equal(isSelfLink('unknown', true), true)
    assert.equal(isSelfLink('unknown', false), false)
  })
})
