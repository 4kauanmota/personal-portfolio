import type { Localized } from '../lib/types'

/**
 * Seção "Sobre mim". Tudo aqui vem do LinkedIn, do README do GitHub, dos seus
 * repositórios e do que você contou sobre o Pixel Mole. Cada texto tem português e inglês.
 *
 * As descrições das experiências (`text`) são as do LinkedIn ou as que você escreveu para
 * o portfólio; a versão em inglês é a tradução delas. Para atualizar, troque os dois idiomas
 * no mesmo item. Uma linha em branco (\n\n) separa os parágrafos.
 */

/** Resumo curto, sempre visível. */
export const aboutSummary: Localized = {
  'pt-BR':
    'Sou Kauan Soares Mota, engenheiro de software na LEVTY, em Juiz de Fora (MG). Trabalho principalmente com JavaScript e TypeScript, em Vue, React, React Native e Node. Hoje também desenvolvo jogos em Godot no Pixel Mole, meu estúdio independente.',
  en: "I'm Kauan Soares Mota, a software engineer at LEVTY, based in Juiz de Fora, Brazil. I work mainly with JavaScript and TypeScript, across Vue, React, React Native and Node. I also make games in Godot at Pixel Mole, my independent studio.",
}

/** Texto completo, revelado pelo "Ler mais". */
export const aboutMore: Localized<string[]> = {
  'pt-BR': [
    'Meu primeiro código foi um site de barbearia em HTML e CSS. De 2022 a 2023 cursei Análise e Desenvolvimento de Sistemas no Instituto Vianna Júnior, com projetos em Java, PHP e C# com Blazor, e as primeiras redes neurais.',
    'Durante o curso, estagiei como desenvolvedor front-end na Prefeitura de Juiz de Fora, atualizando o site da prefeitura e criando landing pages para campanhas, e depois como desenvolvedor de aplicativos móveis na Compass UOL, estudando e construindo projetos em React Native em sprints Scrum, sozinho e em equipe.',
    'Na Afilio, como analista de integração, fiz parte do time de implementações de TI: executava e monitorava campanhas com anunciantes, dava suporte técnico a anunciantes e afiliados, cuidava do Google Tag Manager e implementava scripts personalizados. Desde setembro de 2025 sou engenheiro de software na LEVTY.',
    'Fora do trabalho, gosto de explorar formas diferentes de criar software: publiquei uma CLI no npm, fiz experimentos de IA com TensorFlow e criei o 4notes, um app de notas 100% local para computador e celular.',
    'Os jogos sempre foram um sonho, e hoje ele tem nome. No Pixel Mole, meu estúdio independente, administro e desenvolvo o estúdio: programo em Godot, participo da concepção e da implementação dos jogos e contribuo com a parte técnica e a evolução dos projetos.',
  ],
  en: [
    'My first code was a barbershop website in HTML and CSS. From 2022 to 2023 I studied Systems Analysis and Development at Instituto Vianna Júnior, with projects in Java, PHP and C# with Blazor, and my first neural networks.',
    "During the course I interned as a front-end developer at the Juiz de Fora city hall, updating the city's website and building landing pages for campaigns, and then as a mobile app developer at Compass UOL, studying and building React Native projects in Scrum sprints, solo and in teams.",
    'At Afilio, as an integration analyst, I was part of the IT implementations team: I ran and monitored advertiser campaigns, gave technical support to advertisers and affiliates, managed Google Tag Manager and implemented custom scripts. Since September 2025 I have been a software engineer at LEVTY.',
    'Outside work, I like exploring different ways of making software: I published a CLI on npm, ran AI experiments with TensorFlow and built 4notes, a fully local notes app for desktop and phone.',
    "Games have always been a dream, and today that dream has a name. At Pixel Mole, my independent studio, I run and develop the studio: I program in Godot, take part in designing and building the games, and contribute to the technical side and the evolution of the projects.",
  ],
}

/* ------------------------------------------------------------------ */
/* Trajetória                                                          */
/* ------------------------------------------------------------------ */

/** Caminhos paralelos da linha do tempo, da esquerda para a direita. */
export const LANES = ['study', 'work', 'games'] as const
export type Lane = (typeof LANES)[number]

export interface TimelineEntry {
  id: string
  lane: Lane
  /** Início no formato AAAA-MM ou AAAA-MM-DD. Sem início: aparece no fim, como "em andamento". */
  start?: string
  /** Fim no formato AAAA-MM ou AAAA-MM-DD. Ausente = até hoje. */
  end?: string
  title: Localized
  place?: string
  /**
   * Nome do arquivo da logo em src/assets/companies/ (sem a extensão).
   * Ex.: 'levty' → src/assets/companies/levty.svg (ou .png, .webp…). Sem arquivo, o item aparece sem logo.
   */
  company?: string
  mode?: Localized
  text?: Localized
}

/** O ponto de partida, antes de todos os caminhos. */
export const timelineOrigin: { title: Localized; text: Localized } = {
  title: { 'pt-BR': 'Primeiro código', en: 'First code' },
  text: { 'pt-BR': 'Um site de barbearia em HTML e CSS.', en: 'A barbershop website in HTML and CSS.' },
}

/** Em qualquer ordem: a linha do tempo organiza pelas datas. */
export const timeline: TimelineEntry[] = [
  {
    id: 'vianna',
    lane: 'study',
    start: '2022-02',
    end: '2023-11',
    title: { 'pt-BR': 'Análise e Desenvolvimento de Sistemas', en: 'Systems Analysis and Development' },
    place: 'Instituto Vianna Júnior',
    company: 'instituto-vianna-junior',
    mode: { 'pt-BR': 'Curso superior de tecnologia', en: 'Technology degree (CST)' },
    // Texto seu, escrito para o portfólio (o inglês é a tradução).
    text: {
      'pt-BR':
        'Minha passagem pelo Instituto Vianna Júnior foi uma jornada transformadora e educacional, marcada por desafios superados, amizades construídas e valiosas lições aprendidas. As memórias dessa fase não apenas enriqueceram minha educação, mas também moldaram meu caráter, preparando-me de maneira excepcional para os desafios futuros.\n\n' +
        'A experiência no Instituto Vianna Júnior foi fundamental para meu desenvolvimento, proporcionando uma base sólida que se reflete na escolha da faculdade. Optei por ingressar em uma instituição que se destaca no cenário acadêmico, classificada como detentora do melhor curso de Análise e Desenvolvimento de Sistemas de Minas Gerais e, orgulhosamente, como a segunda melhor do Brasil, conforme atestado pelo ENADE.',
      en:
        'My time at Instituto Vianna Júnior was a transformative, educational journey, marked by challenges overcome, friendships built and valuable lessons learned. The memories of that period not only enriched my education but also shaped my character, preparing me exceptionally well for the challenges ahead.\n\n' +
        "The experience at Instituto Vianna Júnior was key to my development, giving me a solid foundation that is reflected in my choice of college. I chose to enroll in an institution that stands out in the academic landscape, rated as having the best Systems Analysis and Development program in Minas Gerais and, proudly, the second best in Brazil, according to ENADE (Brazil's national assessment of higher education).",
    },
  },
  {
    id: 'pjf',
    lane: 'work',
    start: '2022-06',
    end: '2022-11',
    title: { 'pt-BR': 'Desenvolvedor de front-end', en: 'Front-end developer' },
    place: 'Prefeitura de Juiz de Fora',
    company: 'prefeitura-de-juiz-de-fora',
    mode: { 'pt-BR': 'Estágio, presencial', en: 'Internship, on-site' },
    text: {
      'pt-BR':
        'Realizei atualizações no site com informações enviadas pelas secretarias e assessorias responsáveis, fiz melhorias no front-end da página principal, bem como nas páginas coadjuvantes, e desenvolvi projetos de campanhas esporádicas, conforme a necessidade, com a criação de landing pages específicas.',
      en: 'I updated the website with information sent by the responsible departments and press offices, improved the front end of the home page and of the secondary pages, and built occasional campaign projects as needed, creating specific landing pages.',
    },
  },
  {
    id: 'compass',
    lane: 'work',
    start: '2023-06',
    end: '2023-11',
    title: { 'pt-BR': 'Desenvolvedor de aplicativos móveis', en: 'Mobile app developer' },
    place: 'Compass UOL',
    company: 'compass-uol',
    mode: { 'pt-BR': 'Estágio, remoto', en: 'Internship, remote' },
    // Texto do LinkedIn; a última frase (certificação AWS, emitida em nov. de 2023) foi pedida por você.
    text: {
      'pt-BR':
        'Estudei diversos tópicos para elevar meu nível de conhecimento, ao mesmo tempo em que participei de reuniões seguindo a metodologia ágil Scrum. Desenvolvi projetos simples durante os estudos e projetos mais complexos em sprints específicas para aplicar todo o conhecimento adquirido. Esses projetos foram realizados tanto de forma individual quanto em grupo, proporcionando oportunidades para aprimorar minha comunicação geral e habilidades de trabalho em equipe. Foi também nesse período que conquistei a certificação AWS Certified Cloud Practitioner.',
      en: 'I studied a range of topics to raise my level of knowledge, while taking part in meetings following the Scrum agile methodology. I built simple projects during my studies and more complex projects in dedicated sprints to apply everything I had learned. These projects were done both individually and in groups, giving me opportunities to improve my overall communication and teamwork skills. It was also during this period that I earned the AWS Certified Cloud Practitioner certification.',
    },
  },
  {
    id: 'afilio',
    lane: 'work',
    start: '2024-05',
    end: '2025-09',
    title: { 'pt-BR': 'Analista de integração', en: 'Integration analyst' },
    place: 'Afilio',
    company: 'afilio',
    mode: { 'pt-BR': 'Tempo integral, remoto', en: 'Full-time, remote' },
    text: {
      'pt-BR':
        'Integrei o time de implementações do departamento de TI, sendo responsável pela execução das campanhas publicitárias em parceria com anunciantes. Minhas atribuições incluíam monitorar campanhas, oferecer suporte técnico e estratégico aos anunciantes e afiliados, gerenciar e otimizar o Google Tag Manager, implementar scripts personalizados e conduzir testes de captação.',
      en: 'I joined the implementations team in the IT department, responsible for running advertising campaigns in partnership with advertisers. My duties included monitoring campaigns, providing technical and strategic support to advertisers and affiliates, managing and optimizing Google Tag Manager, implementing custom scripts and running tracking tests.',
    },
  },
  {
    id: 'levty',
    lane: 'work',
    start: '2025-09',
    title: { 'pt-BR': 'Engenheiro de software', en: 'Software engineer' },
    place: 'LEVTY',
    company: 'levty',
    mode: { 'pt-BR': 'Tempo integral, remoto', en: 'Full-time, remote' },
    // Escrito a partir do que você contou sobre a sua rotina (o inglês é a tradução).
    text: {
      'pt-BR':
        'Atuo como engenheiro de software na LEVTY, trabalhando no projeto da Prefeitura de Belo Horizonte com foco na sustentação e evolução contínua das soluções desenvolvidas na plataforma SYDLE ONE. Minha atuação envolve a correção de problemas, a implementação de melhorias e ajustes para manter o sistema estável e preparado para as necessidades futuras, além do desenvolvimento de novos processos e funcionalidades.\n\n' +
        'Utilizo principalmente JavaScript no desenvolvimento e na manutenção das soluções, trabalhando em conjunto com a equipe por meio de alinhamentos diários e reuniões com os representantes da Prefeitura quando necessário. Também produzo tutoriais, explicações técnicas e videoaulas para facilitar o entendimento de funcionalidades e procedimentos.',
      en:
        'I work as a software engineer at LEVTY on the Belo Horizonte City Hall project, focused on maintaining and continuously evolving the solutions built on the SYDLE ONE platform. My work covers fixing issues, implementing improvements and adjustments that keep the system stable and ready for future needs, and developing new processes and features.\n\n' +
        'I mainly use JavaScript to develop and maintain these solutions, working closely with the team through daily check-ins and, when needed, meetings with City Hall representatives. I also produce tutorials, technical explanations and video lessons that make features and procedures easier to understand.',
    },
  },
  {
    id: 'pixel-mole',
    lane: 'games',
    start: '2026-03-24',
    title: { 'pt-BR': 'Fundador & Desenvolvedor', en: 'Founder & Dev' },
    place: 'Pixel Mole',
    company: 'pixel-mole',
    mode: { 'pt-BR': 'Estúdio independente', en: 'Independent studio' },
    text: {
      'pt-BR': 'Administro e desenvolvo o estúdio: programo em Godot, participo da concepção e da implementação dos jogos e contribuo com a parte técnica e a evolução dos projetos.',
      en: 'I run and develop the studio: I program in Godot, take part in designing and building the games, and contribute to the technical side and the evolution of the projects.',
    },
  },
]

/* ------------------------------------------------------------------ */
/* Ferramentas e fatos                                                 */
/* ------------------------------------------------------------------ */

export interface ToolGroup {
  id: string
  label: Localized
  items: string[]
}

/** Ordem das linguagens = ordem de familiaridade do seu README. */
export const toolbox: ToolGroup[] = [
  { id: 'languages', label: { 'pt-BR': 'Linguagens', en: 'Languages' }, items: ['TypeScript', 'JavaScript', 'CSS', 'HTML', 'Sass', 'Python', 'GDScript'] },
  {
    id: 'frameworks',
    label: { 'pt-BR': 'Frameworks e bibliotecas', en: 'Frameworks and libraries' },
    items: ['Vue', 'Nuxt', 'Node.js', 'Vuetify', 'React Native', 'React', 'Jest', 'Tailwind CSS', 'Electron', 'Capacitor'],
  },
  { id: 'games', label: { 'pt-BR': 'Jogos', en: 'Games' }, items: ['Godot'] },
  { id: 'data', label: { 'pt-BR': 'Dados', en: 'Data' }, items: ['MySQL', 'Firebase', 'SQLite', 'Supabase', 'MongoDB', 'Elasticsearch'] },
  { id: 'devops', label: { 'pt-BR': 'DevOps', en: 'DevOps' }, items: ['Git', 'GitHub', 'AWS', 'Docker'] },
  { id: 'tools', label: { 'pt-BR': 'Ferramentas e plataformas', en: 'Tools and platforms' }, items: ['VS Code', 'Postman', 'Figma', 'Trello', 'SYDLE ONE'] },
]

export const spokenLanguages: Localized = {
  'pt-BR': 'Português, inglês (intermediário) e espanhol (básico).',
  en: 'Portuguese, English (intermediate) and Spanish (basic).',
}
