import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { renderReadme, resolveRepoUrl, slugify } from '../scripts/lib/readme.ts'

const ctx = { fullName: '4kauanmota/exemplo', branch: 'main', readmePath: 'README.md' }
const render = (md: string) => renderReadme(md, ctx, { idPrefix: 'rd-exemplo' })

describe('README: segurança', () => {
  test('remove scripts, eventos, estilos, iframes e formulários', () => {
    const { html } = render(`
# Título

<script>alert(1)</script>
<img src="x.png" onerror="alert(2)" style="position:fixed">
<iframe src="https://example.com"></iframe>
<form action="https://example.com"><input type="text" name="q"><button>Enviar</button></form>
<div onclick="alert(3)" style="color:red">texto</div>
<svg><script>alert(4)</script></svg>
<object data="x.swf"></object><embed src="x.swf">
`)
    assert.doesNotMatch(html, /<script|alert\(|onerror|onclick|style=|<iframe|<form|<object|<embed|<svg|type="text"/i)
    assert.match(html, /texto/)
  })

  test('neutraliza endereços perigosos em links e imagens', () => {
    const { html } = render(`
[clique](javascript:alert(1))
<a href="javascript:alert(2)">outro</a>
<a href="vbscript:msgbox(1)">vb</a>
![img](data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)
<img src="data:image/png;base64,AAAA">
[arquivo](file:///etc/passwd)
`)
    assert.doesNotMatch(html, /javascript:|vbscript:|data:|file:/i)
    assert.match(html, /clique/)
  })

  test('links externos abrem em nova aba sem dar acesso à página', () => {
    const { html } = render('[site](https://example.com) e [e-mail](mailto:oi@example.com)')
    assert.match(html, /<a href="https:\/\/example.com" target="_blank" rel="noopener noreferrer">site<\/a>/)
    assert.match(html, /href="mailto:oi@example.com"/)
  })
})

describe('README: formatação', () => {
  test('títulos descem de nível, guardam a hierarquia original e ganham âncoras', () => {
    const { html, headings } = render('# Projeto\n\n## Como usar\n\n### Detalhes\n\n## Como usar')
    assert.match(html, /<h3 id="rd-exemplo-projeto" class="md-h1">Projeto<\/h3>/)
    assert.match(html, /<h4 id="rd-exemplo-como-usar" class="md-h2">Como usar<\/h4>/)
    assert.match(html, /<h5 id="rd-exemplo-detalhes" class="md-h3">Detalhes<\/h5>/)
    assert.match(html, /id="rd-exemplo-como-usar-1"/, 'âncoras repetidas ficam únicas')
    assert.deepEqual(headings.map((h) => h.depth), [1, 2, 3, 2])
  })

  test('âncoras internas apontam para os títulos do próprio leitor', () => {
    const { html } = render('Veja [instalação](#Instalação)\n\n## Instalação')
    assert.match(html, /href="#rd-exemplo-instalacao"/)
    assert.match(html, /id="rd-exemplo-instalacao"/)
  })

  test('imagens e links relativos apontam para o repositório', () => {
    const { html } = render('![tela](./docs/tela.png)\n\n[licença](LICENSE)\n\n<img src="assets/logo.png" width="120" height="50%">')
    assert.match(html, /src="https:\/\/raw.githubusercontent.com\/4kauanmota\/exemplo\/main\/docs\/tela.png"/)
    assert.match(html, /href="https:\/\/github.com\/4kauanmota\/exemplo\/blob\/main\/LICENSE"/)
    assert.match(html, /src="https:\/\/raw.githubusercontent.com\/4kauanmota\/exemplo\/main\/assets\/logo.png"/)
    assert.match(html, /width="120"/)
    assert.doesNotMatch(html, /height="50%"/, 'só medidas numéricas')
    assert.match(html, /loading="lazy"/)
  })

  test('tabelas ganham moldura com rolagem; código fica alcançável pelo teclado', () => {
    const { html } = render('| a | b |\n|---|:---:|\n| 1 | 2 |\n\n```js\nconst x = 1\n```')
    assert.match(html, /<div class="md-table" tabindex="0"><table>/)
    assert.match(html, /<\/table><\/div>/)
    assert.match(html, /<pre tabindex="0"><code class="language-js">/)
  })

  test('cabeçalho de tabela vazio vira célula comum', () => {
    const { html } = render('|   | Sim | Não |\n|---|---|---|\n| A | 1 | 0 |')
    assert.doesNotMatch(html, /<th[^>]*>\s*<\/th>/)
    assert.match(html, /<th>Sim<\/th>/)
  })

  test('alertas do GitHub viram quadros de aviso', () => {
    const { html } = render('> [!WARNING]\n> Cuidado com isso.')
    assert.match(html, /<blockquote class="md-alert md-alert--warning"><p class="md-alert__title">/)
    assert.match(html, /Cuidado com isso\./)
    assert.doesNotMatch(html, /\[!WARNING\]|data-alert/)
  })

  test('listas de tarefas viram caixas desabilitadas', () => {
    const { html } = render('- [x] feito\n- [ ] a fazer')
    assert.match(html, /<input type="checkbox" disabled="" checked="" \/>|<input type="checkbox" disabled checked/)
    assert.doesNotMatch(html, /<input(?![^>]*disabled)/)
  })

  test('HTML centralizado comum em READMEs continua centralizado', () => {
    const { html } = render('<p align="center"><img src="logo.png" alt="Logo"></p>\n\n<h1 align="center">Nome</h1>')
    assert.match(html, /<p align="center">/)
    assert.match(html, /<h3 class="md-h1" align="center">Nome<\/h3>/)
  })

  test('detecta o idioma do texto', () => {
    assert.equal(render('This project is a small tool that helps you to organize the notes of your team with ease.').lang, 'en')
    assert.equal(render('Este projeto é uma ferramenta para organizar as notas do seu time com mais facilidade.').lang, 'pt-BR')
  })
})

describe('README: fidelidade ao GitHub', () => {
  test('imagem centralizada com <p align>, <div align> e Markdown dentro de HTML', () => {
    const { html } = render(`<p align="center"><img src="docs/logo.png" width="120" alt="Logo"></p>

<div align="center">

# Projeto

![Vue](https://img.shields.io/badge/Vue-3-4FC08D) ![TS](https://img.shields.io/badge/TS-5-3178C6)

</div>
`)
    assert.match(html, /<p align="center"><img src="https:\/\/raw\.githubusercontent\.com\/4kauanmota\/exemplo\/main\/docs\/logo\.png" width="120"/)
    assert.match(html, /<div align="center">[\s\S]*<h3[^>]*class="md-h1"[^>]*>Projeto<\/h3>[\s\S]*img\.shields\.io[\s\S]*<\/div>/)
  })

  test('alinhamento em títulos, imagens flutuantes e tabelas', () => {
    const { html } = render(`<h1 align="center">Título</h1>
<img align="right" src="https://example.com/a.png" alt="a">
<table align="center"><tr><td align="right">1</td></tr></table>

| Esquerda | Centro | Direita |
| :--- | :---: | ---: |
| a | b | c |
`)
    assert.match(html, /<h3 class="md-h1" align="center">Título<\/h3>/)
    assert.match(html, /<img align="right" src="https:\/\/example\.com\/a\.png"/)
    assert.match(html, /<div class="md-table md-table--center" tabindex="0"><table align="center">[\s\S]*?<\/table><\/div>/)
    assert.match(html, /<th align="center">Centro<\/th>/)
    assert.match(html, /<td align="right">c<\/td>/)
    // Toda tabela tem a moldura aberta e fechada (HTML bem formado).
    assert.equal((html.match(/<div class="md-table/g) ?? []).length, (html.match(/<\/table><\/div>/g) ?? []).length)
  })

  test('imagens de tema: o leitor é claro, então a versão só do tema escuro sai', () => {
    const { html } = render(`<picture>
  <source media="(prefers-color-scheme: dark)" srcset="logo-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="logo-light.png">
  <img alt="Logo" src="logo-light.png">
</picture>

![Escuro](https://example.com/d.png#gh-dark-mode-only)
![Claro](https://example.com/l.png#gh-light-mode-only)
`)
    assert.doesNotMatch(html, /logo-dark|d\.png/)
    assert.match(html, /<source media="\(prefers-color-scheme: light\)" srcset="https:\/\/raw\.githubusercontent\.com\/4kauanmota\/exemplo\/main\/logo-light\.png"/)
    assert.match(html, /src="https:\/\/example\.com\/l\.png"/)
    assert.doesNotMatch(html, /gh-light-mode-only/)
  })

  test('selos, títulos, listas, código e citações continuam no lugar', () => {
    const { html } = render(`[![build](https://img.shields.io/badge/build-ok-green)](https://github.com/x/y)

## Uso

1. Instale
2. Rode

\`\`\`ts
const a = 1
\`\`\`

> citação
`)
    assert.match(html, /<a href="https:\/\/github\.com\/x\/y" target="_blank" rel="noopener noreferrer"><img src="https:\/\/img\.shields\.io/)
    assert.match(html, /<ol>[\s\S]*<li>Instale<\/li>/)
    assert.match(html, /<pre tabindex="0"><code class="language-ts">/)
    assert.match(html, /<blockquote>/)
  })
})

describe('README: endereços', () => {
  test('resolve caminhos relativos a partir da pasta do README', () => {
    const deep = { ...ctx, readmePath: 'docs/README.md' }
    assert.equal(resolveRepoUrl('../img/a.png', deep, 'image'), 'https://raw.githubusercontent.com/4kauanmota/exemplo/main/img/a.png')
    assert.equal(resolveRepoUrl('guia.md#topo', deep, 'link'), 'https://github.com/4kauanmota/exemplo/blob/main/docs/guia.md#topo')
    assert.equal(resolveRepoUrl('https://github.com/a/b/blob/main/x.png?raw=true', ctx, 'image'), 'https://raw.githubusercontent.com/a/b/main/x.png')
    assert.equal(resolveRepoUrl('http://example.com', ctx, 'link'), 'https://example.com')
    assert.equal(resolveRepoUrl('javascript:alert(1)', ctx, 'link'), '')
  })

  test('âncoras no estilo do GitHub', () => {
    assert.equal(slugify('Instalação & Uso!'), 'instalacao--uso')
    assert.equal(slugify('🚀 Começando'), 'comecando')
  })
})
