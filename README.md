# 4kauanmota

Portfólio pessoal de **Kauan Soares Mota**. Um site sobre memórias e sonhos: rolar a página é atravessar um dia inteiro, do céu dourado do meio-dia ao pôr do sol, à noite e ao amanhecer, sem nenhum corte entre uma seção e outra. A luz (o "o" do logotipo, as auréolas) marca a identidade e o novo capítulo nos jogos.

- **Projetos:** a lista vem direto do GitHub, do repositório mais novo ao mais antigo (pela data de criação), e se atualiza sozinha. Descrições em português e inglês, tipo de cada projeto (WEB, APP, JOGO…) e projetos privados ou de fora do GitHub ficam num arquivo de configuração do portfólio. O README de cada repositório abre dentro do próprio portfólio.
- **Bilíngue de verdade:** português (padrão) e inglês, com troca sem recarregar a página.
- **Estático:** sem banco de dados, sem servidor, sem token no navegador.

## Sumário

- [Rodando no computador](#rodando-no-computador)
- [Onde editar cada coisa](#onde-editar-cada-coisa)
- [Como a integração com o GitHub funciona](#como-a-integração-com-o-github-funciona)
- [Projetos de fora do GitHub](#projetos-de-fora-do-github)
- [Imagens dos projetos](#imagens-dos-projetos)
- [Logos das empresas](#logos-das-empresas)
- [Idiomas](#idiomas)
- [Sons](#sons)
- [Publicando na Vercel](#publicando-na-vercel)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Identidade visual](#identidade-visual)
- [Acessibilidade e movimento](#acessibilidade-e-movimento)
- [Créditos](#créditos)

## Rodando no computador

Requisitos: **Node.js 22.12 ou mais novo** e npm.

```bash
npm install
npm run dev          # http://localhost:5173 (e /en/, /links/, /en/links/)
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento. Usa o último snapshot dos projetos, sem chamar a API. |
| `npm run sync:github` | Busca os repositórios no GitHub e atualiza o snapshot dos projetos (nomes, datas, links publicados) e os READMEs. |
| `npm run build` | Sincroniza com o GitHub (se a API falhar, mantém o snapshot) e gera o site em `dist/`. |
| `npm run build:offline` | Gera o site sem sincronizar. |
| `npm run preview` | Abre o `dist/` localmente, como vai ficar publicado. |
| `npm test` | Testes da configuração e da junção dos projetos, das categorias, dos links publicados (inclusive os que usam o endereço deste portfólio), da limpeza e da fidelidade dos READMEs, da distribuição da trajetória, do sol, das fitas de filme (geometria e chicote), dos links, do conteúdo bilíngue e da pontuação (nenhum travessão nos textos). |
| `npm run typecheck` | Checagem de tipos (Vue + TypeScript). |

> **Dica:** sem token, a API do GitHub aceita só 60 requisições por hora por IP. A primeira sincronização usa umas 30 (uma por repositório, para buscar o README); as seguintes, só 1 mais uma por repositório que recebeu push desde a última vez. Para sincronizar à vontade, copie `.env.example` para `.env` e preencha `GITHUB_TOKEN`.

## Onde editar cada coisa

Todo o conteúdo fica em `src/content/`. Os componentes só leem desses arquivos.

| Quero mudar… | Arquivo |
| --- | --- |
| **Retrato do início do site** | Coloque a imagem em `src/assets/profile/` (foco e texto alternativo em `src/content/profile.ts`) |
| Texto "Sobre mim" (resumo e "Ler mais"), trajetória, ferramentas | `src/content/about.ts` |
| **Curiosidades** (os disquetes) | `src/content/curiosities.ts` |
| **Links e redes sociais** | `src/content/links.ts` (plataformas disponíveis em `platforms.ts`) |
| **Descrição de um projeto** (português e inglês) | `src/content/projects.config.ts` → `projectDetails` |
| **Tipo de um projeto** (WEB, APP, JOGO, CLI…) e filtros | `src/content/projects.config.ts` → `kind` e `also` |
| **Link do "Ver site"** (trocar ou esconder) | Campo *Website* do repositório no GitHub, ou `liveUrl` em `projectDetails` |
| **Projeto privado ou de fora do GitHub** | `src/content/projects.config.ts` → `externalProjects` |
| **Imagem de um projeto** | `src/assets/projects/` (arquivo com o nome do repositório ou o `id`) |
| **Logo de uma empresa** da trajetória | `src/assets/companies/` (arquivo com o valor de `company`) |
| Esconder projetos, mostrar forks | Tópico `portfolio-hide` no GitHub, ou `src/content/projects.config.ts` |
| Textos da interface (botões, títulos, mensagens) | `src/i18n/messages/pt-BR.ts` e `en.ts` |
| Título e descrição para buscadores e prévias de link | `src/i18n/meta.ts` |
| Nome de usuário do GitHub, endereço do site | `src/content/site.ts` |
| Cores, fontes e espaçamentos | `src/styles/tokens.css` |
| Efeitos sonoros | `src/composables/sound.ts` |

### Retrato do início do site

1. Coloque **uma** imagem na pasta `src/assets/profile/`, com qualquer nome (`retrato.webp`, `foto.jpg`…). Valem WebP, AVIF, PNG, JPG, GIF e SVG.
2. Pronto: ela aparece sozinha no início do site e, pequena, na página /links. Com o `npm run dev` rodando, a troca aparece na hora, sem recarregar.
3. Para trocar, apague a imagem antiga e coloque a nova. Não precisa mexer em código. Cada imagem nova ganha um endereço novo no build, então ninguém fica vendo a antiga em cache.
4. Faça o commit da imagem junto: é o arquivo da pasta que vai para o site publicado.

Os ajustes ficam em `src/content/profile.ts` e valem para qualquer imagem: `focus` (o ponto da imagem que fica no centro do recorte, como `'50% 25%'`), `alt` (o texto alternativo, em português e inglês) e `haloTop` (a altura da auréola do retrato pequeno da página de links, para ela ficar logo acima da cabeça). No início do site o retrato fica limpo, sem auréola.

Com a pasta vazia, o espaço do retrato continua reservado no início do site, vazio, e a página /links aparece sem retrato. Se a imagem não carregar, acontece o mesmo. Com mais de uma imagem na pasta, vale a primeira em ordem alfabética (o `npm run dev` avisa no console). O recorte é 4:5, de preferência com uns 1000 × 1250 px, e as bordas se dissolvem na luz, então imagens com fundo simples ou transparente funcionam melhor. A pasta tem um `README.md` com esse mesmo passo a passo.

### Sobre mim e trajetória

Em `src/content/about.ts`:

- `aboutSummary` é o resumo que aparece sempre; `aboutMore` são os parágrafos que abrem com **Ler mais**. Os dois formam um texto só, que corre como numa página de revista: enquanto os cartões-postais de "o que faço hoje" ocupam a direita, o texto fica à esquerda deles; quando eles acabam, o texto passa a usar a largura toda, sem divisões. Em telas estreitas, os cartões vêm depois do texto. Os idiomas fecham a carta.
- Cada item de `timeline` tem uma trilha (`lane`: `study`, `work` ou `games`), início e fim no formato `'AAAA-MM'` ou `'AAAA-MM-DD'`, em qualquer ordem: a trajetória se organiza pelas datas. Sem `end`, o item continua até hoje.
- **Tamanho pelo tempo:** cada experiência tem uma linha com o comprimento da duração real (a formação vai até o fim dela, mesmo com outras coisas acontecendo no meio). A caixa fica sempre no tamanho natural do texto e, ao rolar, desce junto da própria linha enquanto ela dura; a linha continua depois da caixa quando a experiência é mais longa que o texto. Quando o texto é mais longo que a duração, a linha cresce o bastante para a caixa caber, sem atropelar a próxima. O que acontece ao mesmo tempo aparece lado a lado: um item sozinho fica centralizado, dois dividem o espaço meio a meio, três ou mais se dividem por igual. Se a tela não comporta todas as colunas, elas se redistribuem; no celular os cartões empilham, com fios paralelos mostrando o que foi simultâneo. Nada tem posição fixa.
- **Textos das experiências:** os da Prefeitura de Juiz de Fora, da Compass UOL e da Afilio são os do LinkedIn, sem mudar nada no português (o inglês é a tradução); na Compass UOL foi acrescentada a frase da certificação AWS Certified Cloud Practitioner (conquistada nesse período). Os do Instituto Vianna Júnior e da LEVTY são os que você escreveu para o portfólio. Para trocar, edite `text` no item; uma linha em branco (`\n\n`) separa os parágrafos. O texto aparece na trajetória e, nas experiências que continuam até hoje, também no cartão-postal de "o que faço hoje".
- **Logos:** o campo `company` liga o item à logo em `src/assets/companies/` (veja [Logos das empresas](#logos-das-empresas)). Sem arquivo, o item aparece normalmente, sem logo.
- A trajetória termina numa auréola de estrelas em órbita: o "agora" (tocar nela faz um sininho).
- **O que faço hoje:** os cartões-postais ao lado do resumo saem da própria trajetória (os itens sem `end`), então não há nada para manter em dois lugares.
- Os idiomas que você fala (`spokenLanguages`) aparecem dentro do próprio resumo, sem uma área separada.

### Curiosidades

Cada item vira um disquete. Para adicionar, copie um bloco em `curiosities.ts`, troque o `id` e preencha os dois idiomas:

```ts
{
  id: 'favorite-game',
  topic: { 'pt-BR': 'jogo favorito', en: 'favorite game' },      // etiqueta do disquete
  answer: { 'pt-BR': 'Nome do jogo', en: 'Game name' },          // resposta curta
  note: { 'pt-BR': 'Por que eu gosto…', en: 'Why I like it…' },  // o porquê
  image: { src: 'images/curiosities/jogo.webp', alt: { 'pt-BR': '…', en: '…' } }, // opcional
  color: 'blue', // lilac | pink | blue | mint | yellow | peach (opcional)
},
```

Os itens com `draft: true` (jogo, filme e anime favoritos, referências artísticas) só aparecem em `npm run dev`, para lembrar de preencher. Quando completar um, apague a linha `draft: true`.

Escolher um disquete coloca ele no leitor e mostra o conteúdo na tela: o disquete voa até a entrada do leitor, a tela faz um glitch ao ligar e as ondas de rádio saem da TV.

**Fitas de filme:** fragmentos de um filme de lembranças soltos no ar, espalhados pelas bordas da tela (passam da largura do conteúdo e ocupam as laterais), em direções diferentes (em pé, deitados, na diagonal e em curva) e em três profundidades: os de longe e do meio passam por trás da TV e da caixa; os de perto ficam na frente, nos cantos livres. São delicados, um complemento da cena: bem transparentes, de pouco contraste e em tons pastéis. Nenhum prende ou liga os aparelhos: a TV e o leitor flutuam sozinhos. A película é rosa antigo, pouco saturada (um eco suave do vermelho do filme revelado), com furos vazados de verdade, bordas que pegam um pouco da luz da TV, granulação, um risco fino de projetor e um queimado de luz cor de pêssego nas pontas. Cada quadro deixa passar uma luz rosada, e **todo quadro tem uma lembrança desenhada em silhueta escura e suave**, enquadrada como numa foto (às vezes um pedaço fica fora do quadro): famílias caminhando, duas pessoas num banco, alguém na chuva com o guarda-chuva, um guarda-chuva dividido, pipa, passeio com o cachorro, balanço, piquenique, montanhas, mar, farol, casa, bicicleta, passarinhos no fio, lua e estrelas, estrela cadente, balão, gato na janela, abraço, roda-gigante, barco no lago, leitura sob o poste, pinheiros, pôr do sol a dois, aviãozinho de papel e fogueira. Os desenhos se espalham pela cena sem se repetir lado a lado, e ficam sempre em pé dentro do quadro. Cada fragmento deriva no seu ritmo (os de longe ficam parados), então o céu parece vivo sem que tudo se mova junto. A composição se refaz para cada largura de tela, a partir da posição da TV, do leitor, da caixa e dos textos (`src/components/curiosities/FilmScene.vue`; a geometria fica em `src/lib/film.ts` e os desenhos em `src/lib/memories.ts`).

**A onda das fitas:** quando o disquete assenta no leitor, além das ondas de rádio da TV, uma onda nasce na fenda e atravessa os fragmentos, primeiro os de perto e depois os de longe, deformando cada um ao longo do comprimento até se dissipar. Inserções seguidas somam as ondas, e no fim tudo volta exatamente à posição de repouso. A tela muda de altura devagar quando o texto é longo. Escolher outro ejeta o atual (ele volta para a caixa) antes de o novo entrar, então a tela nunca mostra duas lembranças ao mesmo tempo. Também dá para usar as setas do teclado entre os disquetes, Enter para inserir e o botão do leitor para ejetar.

### Links

Em `src/content/links.ts`, cada linha é um link, na ordem em que aparece: GitHub, LinkedIn, o seu perfil no site do Pixel Mole (`pixelmole.com.br/members/4kauanmota`, com o símbolo comum de link, uma corrente, no mesmo estilo dos outros ícones) e e-mail. Só entram perfis confirmados; há exemplos comentados para itch.io e Instagram. A seção **Links** e a página **/links** (feita para a bio das redes sociais, e linkada logo abaixo de "Em todo lugar, 4kauanmota.", na seção Links) usam a mesma lista. A página /links é compacta: retrato, nome e um painel só com os links (o e-mail tem um botão de copiar).

## Como a integração com o GitHub funciona

**Por que no build e não no navegador:** a API pública sem token permite 60 requisições por hora *por visitante*, e qualquer rede compartilhada estouraria o limite. Um token também não pode ir para o navegador. Por isso o site busca tudo **durante o build**, com o token guardado só no servidor, e entrega um arquivo pronto e rápido.

O script `scripts/sync-github.ts`:

1. Lista os repositórios públicos de `4kauanmota`. Ficam de fora os forks, o repositório de perfil e os que tiverem o tópico `portfolio-hide`.
2. Ordena pela **data de criação** do repositório, do mais novo para o mais antigo (a data de atualização não muda a ordem).
3. Monta o nome a partir do nome do repositório, sem o sufixo da sua convenção (`manda-trends-web` → "Manda Trends", `food-api` → "Food"): o tipo aparece na etiqueta ao lado do nome, sem repetir.
4. Baixa o README de cada repositório e o converte para HTML **no build** (veja [O leitor de README](#o-leitor-de-readme)). Repositório sem push desde a última sincronização reaproveita o README já convertido, sem gastar requisição. Sem README, o botão **Ler README do projeto** não aparece.
5. Confere se o site publicado (campo *Website* do repositório ou GitHub Pages) responde. Links fora do ar ficam de fora. Um link que usa um endereço deste portfólio (`4kauanmota.com.br` ou o da Vercel, em `src/content/site.ts`) só sai se a página publicada lá for mesmo este portfólio (o script abre a página e procura a assinatura dele): hoje o `space-portfolio-web` aponta para `4kauanmota.vercel.app`, onde ainda está o portfólio antigo, então o **Ver site** aparece. Quando este portfólio passar a ocupar esse endereço, o link sai sozinho na sincronização seguinte. Sem rede para conferir, o link só sai se o endereço for o do próprio deploy (`SITE_URL` ou o domínio de produção da Vercel).
6. Grava `src/generated/projects.json` e um arquivo por README em `src/generated/readmes/`, que entram no site.
7. Mostra no log um resumo: que projetos têm o botão **Ver site** (e se o link veio do GitHub ou da configuração), quais estão sem descrição e quais repositórios ainda não têm entrada na configuração.

No navegador, a lista do GitHub é juntada com `src/content/projects.config.ts` (descrições, tipos, links e projetos de fora do GitHub). O que é editado à mão nunca vem do GitHub, e o que vem do GitHub nunca precisa ser copiado para a configuração.

Repositório novo aparece sozinho no próximo build, no começo da lista (é o mais recente), com o tipo sugerido pelos tópicos e pela linguagem e sem descrição, até você completar a entrada dele. Se a API falhar no build, o site usa o último snapshot salvo e continua no ar. Se o limite da API acabar no meio, a lista e os links novos são gravados mesmo assim.

> **"Ver site" não apareceu depois de preencher o *Website* no GitHub?** O site é gerado no build, então a mudança só aparece num deploy novo: faça um push, rode o deploy na Vercel ou configure a [atualização automática](#atualização-automática-dos-projetos). Sem `GITHUB_TOKEN`, a Vercel pode esbarrar no limite da API e usar o snapshot antigo; o log do build mostra a lista de links encontrados. Para definir o link sem depender do GitHub, use `liveUrl` em `projectDetails`.

### O leitor de README

O botão **Ler README do projeto** abre o README dentro do portfólio, numa janela de leitura (em vez de mandar para o GitHub). Títulos, listas, tabelas (que rolam para o lado no celular), blocos de código, citações, avisos do GitHub (`> [!NOTE]`…), listas de tarefas e imagens aparecem formatados; com três títulos ou mais, surge um sumário. Fecha com o X, com Esc, clicando fora ou com o botão voltar do navegador, e o foco volta para o card.

**Fiel ao GitHub:** o alinhamento que o README pede é respeitado (`<p align="center">`, `<div align="center">`, imagens e títulos centralizados, imagens com `align="left"` ou `align="right"` ao lado do texto e o alinhamento das colunas das tabelas). Imagens e selos (badges) ficam lado a lado como no GitHub, sem esticar; imagens largas nunca passam da largura do leitor. Imagens feitas só para o tema escuro do GitHub (`#gh-dark-mode-only` e `<picture>` com `prefers-color-scheme: dark`) ficam de fora, para não aparecerem duas vezes.

**Segurança:** o README é conteúdo de fora, então é tratado como não confiável. Ele é convertido no build com `marked` e passa por `sanitize-html` com uma lista fechada do que pode ficar: sem scripts, `iframe`, formulários, `style`, atributos de evento (`onclick`…) ou SVG embutido; links só `https:` e `mailto:`; imagens só `https:`. Links e imagens relativos apontam para o repositório no GitHub. Nenhum token chega ao navegador: o site só carrega o HTML já limpo, e só quando a pessoa abre o leitor.

### Descrições, tipos e links

Tudo fica em `src/content/projects.config.ts`, em `projectDetails`, com uma entrada por repositório:

```ts
'dev-calc-web': {
  kind: 'web',                       // WEB, APP, JOGO… (etiqueta ao lado do nome e filtro principal)
  also: ['tools'],                   // opcional: outros filtros em que o projeto aparece
  liveUrl: 'https://devcalc.app/',   // opcional: troca o link do "Ver site"; null esconde o botão
  description: {
    'pt-BR': 'Calculadora que usa a sintaxe das linguagens de programação…',
    en: 'A calculator that uses programming language syntax…',
  },
},
```

- **Tipos:** `web`, `app`, `game`, `cli`, `api`, `ai` e `lib`. No site: WEB, APP, JOGO (GAME em inglês), CLI, API, IA (AI em inglês) e LIB, sempre em letras maiúsculas ao lado do nome. O tipo vem só daqui (ou, para repositório sem entrada, dos tópicos e da linguagem), nunca de palavras do nome.
- **Descrições:** as atuais foram escritas a partir dos READMEs e do código de cada repositório. Cabem três linhas no card (até uns 150 caracteres). `space-portfolio-web` e `forum-web` não têm README nem descrição no GitHub, então estão sem descrição (`null`) até você escrever. Sem descrição, o espaço fica vazio: nada é inventado.
- A descrição do GitHub (*About*) não é mais usada no site.

### Curadoria sem mexer no código

Use **tópicos** (topics) nos repositórios do GitHub:

| Tópico | Efeito |
| --- | --- |
| `portfolio-hide` | Esconde o projeto do site. |
| `game`, `godot`, `gamedev`, `game-jam`… | Repositório sem entrada na configuração entra no filtro **Jogos** com a etiqueta JOGO. |

Em `src/content/projects.config.ts` dá para esconder repositórios pelo nome (`hidden`) e incluir forks (`includeForks`).

### Galeria

Os cards têm todos o mesmo tamanho: imagem, nome com a etiqueta do tipo, descrição no idioma do site, data de criação (no carimbo da imagem) e os botões do site, do repositório e do README. Enquanto a imagem de um projeto carrega, a foto mostra um pedacinho de céu em que uma constelação se forma (cada projeto com a sua, cada card no seu tempo); quando a imagem chega, o céu se dissolve nela. O espaço da foto é sempre o mesmo, então nada pula. Se a imagem falhar, ou demorar mais de 20 segundos, entra a arte do site no lugar (e a imagem ainda aparece se chegar depois). A galeria começa com os primeiros projetos (duas linhas no computador, três cards no celular) e abre com **Mostrar mais** (e fecha com **Mostrar menos**), sempre do mais novo ao mais antigo, inclusive com um filtro escolhido.

Com o mouse sobre um card, ele sobe um pouco, uma luz acompanha o ponteiro e a imagem se desloca devagar no sentido contrário, como uma foto com profundidade. O card não muda de tamanho e nada cobre os botões. Com o teclado, o foco em qualquer botão do card dá o mesmo destaque.

## Projetos de fora do GitHub

Projetos privados, de clientes ou guardados em outro serviço entram em `externalProjects`, no mesmo arquivo. Cada item vira um card igual aos outros, na posição da data, com os mesmos filtros e animações. Não precisa mexer em nenhum componente.

```ts
export const externalProjects: ExternalProject[] = [
  {
    id: 'loja-da-ana',               // obrigatório: único, minúsculas e hífens (também é o nome da imagem)
    title: 'Loja da Ana',            // obrigatório
    kind: 'web',                     // obrigatório
    createdAt: '2026-05',            // obrigatório: 'AAAA-MM-DD' ou 'AAAA-MM'
    description: { 'pt-BR': '…', en: '…' }, // obrigatório (pode ser null)
    private: true,                   // opcional: mostra "Código privado" e nunca mostra o repositório
    liveUrl: 'https://lojadaana.com.br/', // opcional: botão "Ver site"
    repoUrl: 'https://gitlab.com/…', // opcional: repositório em outro serviço (ignorado se private)
    image: '/projetos/loja.png',     // opcional: https ou arquivo de public/; sem ele, vale src/assets/projects/<id>
    language: 'Vue',                 // opcional: aparece na arte genérica
    also: ['apps'],                  // opcional: outros filtros
  },
]
```

- **Privado:** o card mostra um aviso discreto, "Código privado", no lugar do botão do repositório. O endereço do repositório nunca vai para a página, mesmo que esteja no arquivo.
- **Sem repetição:** se o projeto ficar público no GitHub (mesmo `id` ou mesmo `repoUrl`), vale o do GitHub e este item é ignorado. Os testes e o log do build avisam.
- Nunca coloque tokens ou senhas nesse arquivo: ele vai para o navegador.

## Imagens dos projetos

Coloque a imagem em `src/assets/projects/`, com **o nome do repositório** (ou o `id` de um projeto de fora do GitHub) como nome do arquivo (ex.: `src/assets/projects/4notes-app.webp`). O site encontra sozinho; sem imagem, o card usa a arte do site.

- Formatos: `.webp`, `.avif`, `.png`, `.jpg`, `.jpeg`, `.gif` e `.svg`. Maiúsculas e minúsculas no nome não importam. Com dois arquivos para o mesmo projeto, vale o primeiro dessa lista (e o build avisa).
- **Captura de tela:** de preferência 16:10 (ex.: 1600 × 1000 px). Ela preenche a imagem do card a partir do topo; em outra proporção, as sobras são cortadas.
- **Logo ou ícone:** imagens quase quadradas aparecem inteiras, centralizadas sobre a arte do projeto. PNG com fundo transparente ou SVG ficam melhores.
- Renomeou o repositório? Renomeie a imagem também.

A descoberta acontece no build (um plugin do Vite lê a pasta), então funciona igual na Vercel, sem nenhum pedido a mais no navegador. No build, as imagens viram WebP leve com nome versionado.

## Logos das empresas

As logos da trajetória ficam em `src/assets/companies/`, com o valor do campo `company` do item (em `src/content/about.ts`) como nome do arquivo:

| Experiência | Arquivo |
| --- | --- |
| Instituto Vianna Júnior | `instituto-vianna-junior.svg` (ou `.png`, `.webp`…) |
| Prefeitura de Juiz de Fora | `prefeitura-de-juiz-de-fora.png` |
| Compass UOL | `compass-uol.svg` |
| Afilio | `afilio.png` |
| LEVTY | `levty.svg` |
| Pixel Mole | `pixel-mole.webp` (já está lá: a mascote do estúdio) |

- Formatos: `.svg`, `.png`, `.webp`, `.jpg`, `.jpeg` e `.avif`, de preferência com fundo transparente e sem margem grande em volta.
- Empresa nova: escolha um nome em minúsculas e com hífens, coloque `company: 'nome-escolhido'` no item e salve a imagem com esse nome.
- A logo aparece num selo claro, pequeno e proporcional (sem esticar), que garante a leitura sobre o pôr do sol. Sem arquivo, não aparece imagem quebrada nem espaço vazio. Como as imagens passam pelo Vite, funcionam igual na Vercel.

## Idiomas

- Português é o padrão (`/`); inglês fica em `/en/`. A página de links é `/links/` e `/en/links/`, e abre direto pelo endereço.
- O build gera um HTML por página e idioma, com `lang`, título, descrição, `hreflang`, link canônico e prévia social corretos, para buscadores e aplicativos que não executam JavaScript.
- A troca de idioma não recarrega a página: o texto se refaz com uma transição suave, a URL e os metadados são atualizados e a escolha fica salva no navegador.
- Os textos da interface ficam em `src/i18n/messages/`. O arquivo `en.ts` é tipado a partir do `pt-BR.ts`, então o TypeScript avisa se faltar alguma tradução.
- Nomes próprios, de projetos e de tecnologias não são traduzidos.

## Sons

Os efeitos sonoros (inserir e ejetar um disquete, as ondas de rádio, abrir e fechar o README, escolher um filtro, o passarinho, o sininho da auréola, copiar o e-mail) são **sintetizados na hora** com a Web Audio API: não há arquivo de áudio para baixar nem serviço externo.

- Nada toca ao abrir a página. O som só começa depois de um gesto da pessoa (clique, toque ou tecla), como os navegadores exigem; passar o mouse não conta.
- O botão de alto-falante no cabeçalho liga e desliga, e a escolha fica salva no navegador.
- Os sons ficam em `src/composables/sound.ts`, cada um numa receita curta.

## Publicando na Vercel

O endereço do portfólio é `4kauanmota.com.br` (o `defaultUrl` de `src/content/site.ts`). O portfólio atual está na Vercel, então ela é o caminho mais direto.

> **Antes de criar o repositório:** não use o repositório `4kauanmota/4kauanmota`. Ele é o README do seu perfil no GitHub, e o README deste projeto substituiria o do perfil. Um nome que segue sua convenção é `4kauanmota-web`.

1. Crie o repositório no GitHub e envie este projeto.
2. Na Vercel, importe o repositório. O framework (Vite), o comando (`npm run build`) e a pasta (`dist`) são detectados sozinhos, e o `vercel.json` já define o resto. As imagens dos projetos são convertidas no próprio build da Vercel (o `sharp` é instalado junto).
3. Em *Settings › Environment Variables*, adicione `GITHUB_TOKEN`: um *fine-grained token* criado em [github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens/new), sem nenhuma permissão extra (o acesso só de leitura a repositórios públicos basta). Ele só aumenta o limite da API; funciona sem ele, com o limite menor.
4. Em *Settings › Domains*, adicione `4kauanmota.com.br` (e, se quiser, `www.4kauanmota.com.br` redirecionando para ele). A Vercel mostra os registros de DNS que precisam ser criados no registro.br; copie os valores exatamente como aparecem lá. Com o domínio ativo, o endereço canônico, o sitemap e as tags de compartilhamento usam o domínio de produção sozinhos. Se publicar em outro endereço, defina `SITE_URL`.
5. O endereço `4kauanmota.vercel.app` ainda é do portfólio antigo. Se quiser que ele também leve a este, ligue o projeto antigo da Vercel a este repositório (*Settings › Git*) ou tire o domínio do projeto antigo e adicione a este (*Settings › Domains*).

### Atualização automática dos projetos

A Vercel publica de novo a cada push. Para pegar repositórios novos e links de site novos (o campo *Website* do GitHub) sem precisar de push:

1. Na Vercel, em *Settings › Git › Deploy Hooks*, crie um hook (ex.: "atualizar projetos") e copie a URL.
2. No GitHub, em *Settings › Secrets and variables › Actions* do repositório do portfólio, crie o secret `VERCEL_DEPLOY_HOOK` com essa URL.
3. O workflow `.github/workflows/refresh-projects.yml` dispara um deploy todo dia às 6h17 (horário de Brasília). Ele também pode ser rodado à mão na aba *Actions*.

O workflow `ci.yml` roda testes, checagem de tipos e build a cada push.

### Outros serviços

O resultado do build é estático: funciona no Netlify, no Cloudflare Pages ou no GitHub Pages. Para publicar como projeto do GitHub Pages (`4kauanmota.github.io/nome-do-repo/`), rode o build com `BASE_PATH=/nome-do-repo/`.

## Estrutura do projeto

```text
├── index.html                 # modelo do HTML (o build gera uma cópia por página e idioma)
├── vite.config.ts             # Vue + plugins: imagens dos projetos, HTML por idioma, sitemap e robots.txt
├── scripts/
│   ├── sync-github.ts         # sincronização com o GitHub
│   ├── lib/                   # cliente da API, nomes e categorias, README (Markdown limpo), checagem de links
│   └── vite/project-images.ts # descobre e otimiza as imagens dos projetos
├── src/
│   ├── content/               # todo o conteúdo editável
│   ├── assets/
│   │   ├── projects/          # imagens dos projetos (nome do repositório)
│   │   ├── companies/         # logos das empresas da trajetória
│   │   └── textures/          # nuvens pintadas usadas no céu
│   ├── i18n/                  # traduções da interface, rotas e metadados
│   ├── generated/             # snapshot dos projetos e READMEs (gerado; não editar)
│   ├── components/
│   │   ├── atmosphere/        # céus de cada hora do dia, auréolas, grão de filme
│   │   ├── brand/             # logotipo
│   │   ├── hero/ projects/ about/ curiosities/ links/ layout/
│   ├── composables/           # cena de rolagem (profundidade), abrir e fechar, seções, projetos, README, sons
│   ├── lib/                   # tipos, junção dos projetos, endereços, distribuição da trajetória, geometria dos fios
│   ├── directives/            # v-reveal (entrada dos elementos na tela)
│   ├── pages/                 # início, /links e 404
│   └── styles/                # tokens (cores, fontes) e base
├── public/
│   └── images/                # suas imagens: foto e curiosidades (crie quando precisar)
└── tests/                     # testes (node:test)
```

## Identidade visual

**Conceito:** um dia inteiro de lembranças. Cada seção é uma hora do dia, e a página nunca corta de uma para outra: cada céu termina na mesma cor em que o próximo começa, e nuvens atravessam as divisas.

| Seção | Hora | O que aparece |
| --- | --- | --- |
| Início | Meio-dia | Céu dourado, nuvens pintadas, fios balançando presos a um poste (com um passarinho que dá uns passinhos pelo fio, para, dá pulinhos de vez em quando e voa quando você chega perto), um bando que cruza o céu e o retrato, limpo, direto no céu |
| Projetos | Tarde | Luz de janela atravessando a sala, poeira nos feixes e a sombra de uma nuvem que passa; a galeria |
| Sobre mim | Pôr do sol | Um sol que conta uma história com a rolagem: surge discreto, ganha brilho, perde a luz, incha e se desfaz aos poucos (forma, brilho e intensidade) até explodir como uma estrela, em partículas e fragmentos que se apagam. Tudo segue a rolagem e volta ao subir. Um banco de nuvens com fagulhas de luz, nuvens soltas e pássaros; cartões-postais do que faço hoje, as áreas com astros da mesma família (sol radiante, estrela em órbita, estrela cadente, constelação, sol com coroa e estrela-guia) e a trajetória |
| Curiosidades | Noite | Estrelas, estrelas de quatro pontas e cadentes; a TV e o leitor de disquetes flutuando, ligados pelo cabo; fragmentos de um filme de lembranças em volta, cada quadro com um desenho em silhueta, em tons pastéis; ondas de rádio quando um disquete entra |
| Links | Amanhecer | Violeta, lilás, rosa e dourado; um mar de nuvens, o sol nasce atrás dele e a luz volta |

**Logotipo:** o "o" de 4kauanmota é a própria luz. Grande, vira um anel luminoso com uma luz que percorre o anel devagar; pequeno (cabeçalho, rodapé), é um "o" dourado aceso.

**Auréolas:** cada uma tem uma forma: anel de partículas (retrato da página de links), estrelas em órbita (o "agora", no fim da trajetória) e anel partido (página 404). O retrato do início e as curiosidades não têm auréola.

**Paleta:** meio-dia `#e9d055`, palha `#ece3c5`, tarde `#f4ead2`, pôr do sol `#f6bf91` e `#f0a07e`, crepúsculo `#a77ea8` e `#3a3d72`, noite `#131833`, amanhecer `#a98cbb` e `#eab3c1`, tinta sépia `#2a2518`. Os disquetes usam tons pastel (lilás, rosa, azul, menta, amarelo e pêssego). Tudo em `src/styles/tokens.css`.

**Tipografia:** *Jost* (geométrica, fina, com o "o" circular que vira luz no logotipo), *Spectral* (serifa delicada para os textos) e *Nanum Pen Script* (escrita à mão, só nas etiquetas dos disquetes).

## Acessibilidade e movimento

- Navegação por teclado em tudo, com foco visível e link "Pular para o conteúdo".
- Contraste AA em todas as camadas (verificado com axe-core).
- O menu do celular usa `<dialog>` nativo: foco preso, Esc fecha e o foco volta ao botão que abriu.
- Os cards de projeto têm o mesmo destaque com o mouse e com o foco do teclado; o efeito que segue o ponteiro só existe com mouse.
- **Mostrar mais**, **Ler mais** e os disquetes avisam o estado (`aria-expanded`, `aria-pressed`) e anunciam o que mudou para leitores de tela; o texto recolhido não recebe foco.
- Textos em outro idioma recebem o atributo `lang` correto, para os leitores de tela pronunciarem direito.
- O leitor de README é um `<dialog>` com título, foco preso enquanto aberto e retorno do foco ao fechar; o corpo rola pelo teclado.
- Com "reduzir movimento" ativado no sistema, auréolas, nuvens, fios, fitas, pássaros, profundidade da rolagem e transições param, os disquetes trocam sem voo, as fitas não balançam, o passarinho fica parado no fio, o carregamento das imagens mostra a constelação já formada e o sol fica parado no céu, sem se desfazer nem explodir; nada depende de animação para ser entendido.
- O seletor de idiomas usa a mesma letra, tamanho e peso do menu, e marca o idioma escolhido com a mesma luzinha da seção atual (além de `aria-pressed` para leitores de tela).
- A profundidade da rolagem só usa `transform` e é mais suave no celular: fundo, enfeites e ilustrações andam em velocidades diferentes, e títulos, textos e botões ficam parados, para a leitura, os cliques e para nunca encostarem uns nos outros. Animações de seções fora da tela ficam pausadas, e o sol só é desenhado enquanto está perto da tela.
- O logotipo grande (4kauanmota) e o título Projetos são desenhos de letras e não se selecionam; todo o resto do texto continua selecionável.
- Os sons nunca tocam sozinhos e podem ser desligados no cabeçalho.

## Créditos

- Fontes: Jost, Spectral e Nanum Pen Script (SIL Open Font License), via Fontsource, servidas pelo próprio site.
- Ícones de marca: [Simple Icons](https://simpleicons.org) (CC0).
- Nuvens, céus, auréolas e ilustrações foram feitos para este site.
