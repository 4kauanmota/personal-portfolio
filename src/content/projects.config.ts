import type { ExternalProject, ProjectDetails } from '../lib/types'

/**
 * Projetos do portfólio: tudo o que é editado à mão fica neste arquivo.
 *
 * A LISTA continua automática: todo repositório público do GitHub aparece no próximo
 * build, do mais novo para o mais antigo (data de criação). Daqui vêm só os ajustes:
 *
 *   projectDetails    descrição em português e inglês, tipo (WEB, APP, JOGO…),
 *                     link do "Ver site" e filtros extras de cada repositório;
 *   externalProjects  projetos que não estão públicos no GitHub (privados, de cliente,
 *                     em outro serviço). Adicionar um é só acrescentar um item aqui.
 *
 * Tipos (kind): 'web' | 'app' | 'game' | 'cli' | 'api' | 'ai' | 'lib'.
 *   No site: WEB, APP, JOGO (GAME em inglês), CLI, API, IA (AI em inglês) e LIB.
 *
 * Filtros extras (also): 'games' | 'web' | 'apps' | 'tools' | 'servers' | 'ai' | 'other'.
 *
 * Repositório novo sem entrada aqui: aparece mesmo assim, com o tipo sugerido pelos
 * tópicos e pela linguagem do GitHub e sem descrição (o build avisa quais faltam).
 *
 * Imagens: um arquivo com o id do projeto em src/assets/projects/ (ex.: 4notes-app.webp).
 * Formatos e tamanhos: seção "Imagens dos projetos" do README.
 *
 * Esconder um repositório: coloque o nome em `hidden` ou o tópico `portfolio-hide` nele.
 */
export const projectsConfig = {
  /** Mostrar forks? */
  includeForks: false,

  /** Repositórios que nunca aparecem (o repositório de perfil já é ignorado sozinho). */
  hidden: [] as string[],
}

/**
 * Ajustes por repositório do GitHub. A chave é o nome do repositório.
 *
 *   kind         tipo do projeto (etiqueta ao lado do nome e filtro principal)
 *   title        nome no site, se o derivado do repositório não servir (opcional)
 *   description  { 'pt-BR': '…', en: '…' }; null deixa o card sem descrição
 *   liveUrl      link do "Ver site": um endereço substitui o do GitHub, null esconde (opcional)
 *   also         outros filtros em que o projeto também aparece (opcional)
 *
 * As descrições foram escritas a partir dos READMEs e do código de cada repositório.
 */
export const projectDetails: Record<string, ProjectDetails> = {
  '4notes-web': {
    kind: 'web',
    description: {
      'pt-BR': 'Site de apresentação e download do 4notes, feito com Nuxt 4. Dá para ligar e desligar os módulos e ver o menu mudar, como no app.',
      en: 'Showcase and download site for 4notes, built with Nuxt 4. You can switch modules on and off and watch the menu change, just like in the app.',
    },
  },
  'pixel-mole-web': {
    kind: 'web',
    also: ['games'],
    description: {
      'pt-BR': 'Site oficial e portfólio do Pixel Mole, estúdio independente de jogos: catálogo de jogos, perfis da equipe e links, em português e inglês.',
      en: 'Official website and portfolio of Pixel Mole, an indie game studio: game catalog, team profiles and links, in Portuguese and English.',
    },
  },
  '4notes-app': {
    kind: 'app',
    description: {
      'pt-BR': 'Notas, tarefas, mapas mentais, links e timer num só app para Windows e Android. Sem login: tudo fica numa pasta sua, em Markdown e JSON.',
      en: 'Notes, tasks, mind maps, links and a timer in one app for Windows and Android. No login: everything stays in your own folder, as Markdown and JSON.',
    },
  },
  'customers-api': {
    kind: 'api',
    description: {
      'pt-BR': 'Minha primeira API com Fastify, Prisma e MongoDB: cadastro de clientes com criação, listagem, edição e exclusão, documentado com Swagger.',
      en: 'My first API with Fastify, Prisma and MongoDB: customer records you can create, list, update and delete, documented with Swagger.',
    },
  },
  'dev-calc-web': {
    kind: 'web',
    description: {
      'pt-BR': 'Calculadora que usa a sintaxe das linguagens de programação, como % para o resto da divisão e ** para potência. Feita com Vue e Vuetify.',
      en: 'A calculator that uses programming language syntax, like % for the remainder and ** for powers. Built with Vue and Vuetify.',
    },
  },
  'create-react-toolkit-cli': {
    kind: 'cli',
    description: {
      'pt-BR': 'Cria um projeto React já configurado com TypeScript, Sass, Jest, Babel e React Router, no estilo do create-react-app. Publicado no npm.',
      en: 'Creates a React project already set up with TypeScript, Sass, Jest, Babel and React Router, in the style of create-react-app. Published on npm.',
    },
  },
  'art-portfolio-web': {
    kind: 'web',
    description: {
      'pt-BR': 'Portfólio feito para uma artista, com visualização de fotos e projetos. Feito com React, Zustand e Webpack.',
      en: 'A portfolio made for an artist, for viewing photos and projects. Built with React, Zustand and Webpack.',
    },
  },
  'food-api': {
    kind: 'api',
    description: {
      'pt-BR': 'Minha primeira API em Python: cadastro de alimentos com busca por filtro, criação, edição e exclusão. Feita com Flask e Poetry.',
      en: 'My first Python API: food records with filtered search, create, update and delete. Built with Flask and Poetry.',
    },
  },
  'plant-paradise-app': {
    kind: 'app',
    description: {
      'pt-BR': 'Loja de plantas feita para um desafio da Compass UOL: favoritos, carrinho, login com e-mail e senha e perfil com compras. React Native, Expo e Firebase.',
      en: 'A plant store built for a Compass UOL challenge: favorites, cart, email and password sign in, and a profile with purchases. React Native, Expo and Firebase.',
    },
  },
  'redux-shopping-web': {
    kind: 'web',
    description: {
      'pt-BR': 'Projeto de compras para praticar o gerenciamento de estado com Redux e Redux Toolkit no React, feito acompanhando um tutorial em vídeo.',
      en: 'A shopping project to practice state management with Redux and Redux Toolkit in React, built following a video tutorial.',
    },
  },
  'revenue-management-web': {
    kind: 'web',
    description: {
      'pt-BR': 'Desafio da faculdade: site em C# com Blazor WebAssembly e uma API própria para cadastrar receitas, ingredientes e imagens, com MySQL.',
      en: 'A university challenge: a C# site with Blazor WebAssembly and its own API to manage recipes, ingredients and images, using MySQL.',
    },
  },
  'space-portfolio-web': {
    kind: 'web',
    // Sem README e sem descrição no GitHub: informação insuficiente para uma descrição fiel.
    // Escreva aqui quando quiser, nos dois idiomas.
    description: null,
  },
  'revenue-search-app': {
    kind: 'app',
    description: {
      'pt-BR': 'App de receitas feito para um desafio de um curso da Udemy: navegue entre as receitas e favorite as que quiser. React Native e Expo.',
      en: 'A recipe app built for a Udemy course challenge: browse recipes and save your favorites. React Native and Expo.',
    },
  },
  'expense-tracker-app': {
    kind: 'app',
    description: {
      'pt-BR': 'Controle de gastos feito para um desafio de um curso da Udemy: cadastre, edite e filtre despesas e veja o total. React Native e Expo.',
      en: 'An expense tracker built for a Udemy course challenge: add, edit and filter expenses and see the total. React Native and Expo.',
    },
  },
  'guessing-game-app': {
    kind: 'app',
    also: ['games'],
    description: {
      'pt-BR': 'Jogo de adivinhação feito para um desafio de um curso da Udemy: você escolhe um número e ajuda o celular a descobrir qual é. React Native.',
      en: 'A guessing game built for a Udemy course challenge: you pick a number and help your phone find out which one it is. React Native.',
    },
  },
  'restaurant-menu-app': {
    kind: 'app',
    description: {
      'pt-BR': 'Cardápio de restaurante feito em equipe para um desafio da Compass UOL, com navegação entre telas e dados vindos de uma API. React Native.',
      en: 'A restaurant menu built as a team for a Compass UOL challenge, with screen navigation and data from an API. React Native.',
    },
  },
  'goals-app': {
    kind: 'app',
    description: {
      'pt-BR': 'App de metas feito para um desafio de um curso da Udemy: adicione e remova suas metas. React Native e Expo.',
      en: 'A goals app built for a Udemy course challenge: add and remove your goals. React Native and Expo.',
    },
  },
  'prediction-model-ai': {
    kind: 'ai',
    description: {
      'pt-BR': 'Feito para uma aula de inteligência artificial da faculdade: um modelo de previsão multicamadas com aprendizado de máquina, usando TensorFlow.',
      en: 'Built for a university AI class: a multilayer prediction model using machine learning with TensorFlow.',
    },
  },
  'revenue-control-web': {
    kind: 'web',
    description: {
      'pt-BR': 'Feito para uma aula de PHP da faculdade: cadastro de alimentos com imagens, além de login e registro de usuários. Laravel e Blade.',
      en: 'Built for a university PHP class: food records with images, plus user sign in and registration. Laravel and Blade.',
    },
  },
  'blog-web': {
    kind: 'web',
    description: {
      'pt-BR': 'Blog feito para um desafio da Compass UOL, com posts e comentários gerados por IA, carregados de uma API e renderizados com TypeScript.',
      en: 'A blog built for a Compass UOL challenge, with AI-generated posts and comments loaded from an API and rendered with TypeScript.',
    },
  },
  'sales-and-purchases-web': {
    kind: 'web',
    description: {
      'pt-BR': 'Feito para uma aula de Java da faculdade: compra e venda de sites, com clientes e administradores, senhas criptografadas e controle de acesso.',
      en: 'Built for a university Java class: buying and selling websites, with client and admin users, encrypted passwords and access control.',
    },
  },
  'perceptron-ai': {
    kind: 'ai',
    description: {
      'pt-BR': 'Um perceptron que aprende a dizer se cada ponto está acima ou abaixo de uma linha, feito em JavaScript com base nas aulas da faculdade.',
      en: 'A perceptron that learns to tell whether each point is above or below a line, written in JavaScript based on my university classes.',
    },
  },
  'account-finance-web': {
    kind: 'web',
    description: {
      'pt-BR': 'Feito para uma aula de Java da faculdade: controle financeiro com contas a pagar e a receber, movimentações, categorias e login.',
      en: 'Built for a university Java class: a finance manager with accounts payable and receivable, transactions, categories and sign in.',
    },
  },
  'tic-tac-toe-web': {
    kind: 'game',
    also: ['web'],
    description: {
      'pt-BR': 'Jogo da velha com placar, alternância de quem começa e a opção de jogar contra outra pessoa ou contra a IA, que usa o algoritmo minimax.',
      en: 'Tic tac toe with a scoreboard, alternating first player and the choice of playing against another person or an AI that uses the minimax algorithm.',
    },
  },
  'manda-trends-web': {
    kind: 'web',
    description: {
      'pt-BR': 'Página de notícias criada para a primeira etapa do processo seletivo da Mandarin, com gradiente animado e layout que muda entre celular e computador.',
      en: "A news page created for the first stage of Mandarin's hiring process, with an animated gradient and a layout that adapts to phone and desktop.",
    },
  },
  'forum-web': {
    kind: 'web',
    // Sem README e sem descrição no GitHub: informação insuficiente para uma descrição fiel.
    // Escreva aqui quando quiser, nos dois idiomas.
    description: null,
  },
  'barber-web': {
    kind: 'web',
    description: {
      'pt-BR': 'Meu primeiro código com HTML e CSS: o site de uma barbearia.',
      en: 'My first code with HTML and CSS: a website for a barbershop.',
    },
  },
}

/**
 * Projetos de fora do GitHub público. Cada item vira um card igual aos outros,
 * na posição da data `createdAt`.
 *
 * Campos:
 *   id           OBRIGATÓRIO  único, minúsculas e hífens; também é o nome da imagem
 *                             em src/assets/projects (ex.: 'loja-da-ana' → loja-da-ana.webp)
 *   title        OBRIGATÓRIO  nome do projeto
 *   kind         OBRIGATÓRIO  'web' | 'app' | 'game' | 'cli' | 'api' | 'ai' | 'lib'
 *   createdAt    OBRIGATÓRIO  'AAAA-MM-DD' ou 'AAAA-MM'
 *   description  OBRIGATÓRIO  { 'pt-BR': '…', en: '…' } ou null
 *   private      opcional     true = código fechado: aparece "Código privado" e o
 *                             link do repositório nunca vai para a página
 *   liveUrl      opcional     endereço do botão "Ver site" (https)
 *   repoUrl      opcional     repositório em outro serviço (GitLab, Bitbucket…); ignorado se private
 *   image        opcional     endereço https ou arquivo de public/ ('/projetos/loja.png');
 *                             sem ele, vale o arquivo com o id em src/assets/projects
 *   language     opcional     linguagem principal (aparece na arte genérica quando não há imagem)
 *   also         opcional     outros filtros, como em projectDetails
 *
 * Se um projeto daqui ficar público no GitHub (mesmo id ou mesmo repoUrl), o do GitHub vale
 * e este é ignorado, sem card repetido. Nunca coloque tokens ou senhas aqui: este arquivo
 * vai para o navegador.
 *
 * Exemplos (tire as barras de comentário e ajuste):
 *
 *   {
 *     id: 'loja-da-ana',
 *     title: 'Loja da Ana',
 *     kind: 'web',
 *     createdAt: '2026-05',
 *     private: true,
 *     liveUrl: 'https://lojadaana.com.br/',
 *     description: {
 *       'pt-BR': 'Loja virtual feita para uma cliente, com catálogo e pedidos pelo WhatsApp.',
 *       en: 'An online store built for a client, with a catalog and orders through WhatsApp.',
 *     },
 *   },
 *   {
 *     id: 'jogo-da-game-jam',
 *     title: 'Jogo da Game Jam',
 *     kind: 'game',
 *     createdAt: '2026-04-12',
 *     liveUrl: 'https://exemplo.itch.io/jogo-da-game-jam',
 *     repoUrl: 'https://gitlab.com/exemplo/jogo-da-game-jam',
 *     language: 'GDScript',
 *     description: null,
 *   },
 */
export const externalProjects: ExternalProject[] = []
