import type { Localized } from "../lib/types";

/**
 * Caixa de curiosidades: cada item da lista `curiosities`, mais abaixo, vira um disquete.
 *
 * COMO CRIAR UM DISQUETE NOVO
 * Copie o modelo abaixo para dentro da lista, no ponto em que ele deve aparecer
 * (a ordem da lista é a ordem dos disquetes na caixa), e troque os textos:
 *
 *   {
 *     id: 'bebida-favorita',
 *     topic: { 'pt-BR': 'bebida favorita', en: 'favorite drink' },
 *     answer: { 'pt-BR': 'Café', en: 'Coffee' },
 *     note: {
 *       'pt-BR': 'Texto em português que aparece na TV.',
 *       en: 'Text in English that shows up on the TV.',
 *     },
 *     color: 'mint',
 *   },
 *
 * id      nome interno, único, sem espaços nem acentos. Não aparece no site.
 * topic   escrito na etiqueta do disquete e no topo da TV. Curto, para caber na etiqueta.
 * answer  a resposta, em destaque na TV.
 * note    o texto mais longo, logo abaixo da resposta.
 * color   opcional: lilac, pink, blue, mint, yellow ou peach.
 * image   opcional: { src: 'images/curiosities/foto.jpg', alt: { 'pt-BR': '…', en: '…' } },
 *         com o arquivo salvo em public/images/curiosities/.
 *
 * ONDE FICA CADA IDIOMA
 * Todo texto tem as duas versões lado a lado: 'pt-BR' é o português e `en` é o inglês.
 * Preencha sempre as duas. Se o texto em inglês tiver apóstrofo (it's, I've),
 * use aspas duplas ou crases em volta dele, como nos exemplos da lista.
 *
 * Para remover um disquete, apague o bloco inteiro dele, das chaves { } até a vírgula.
 * Um item com `draft: true` só aparece rodando `npm run dev`, nunca no site publicado.
 */
export type DiskColor = "lilac" | "pink" | "blue" | "mint" | "yellow" | "peach";

export interface Curiosity {
  id: string;
  /** Assunto, escrito à mão na etiqueta do disquete. Curto. */
  topic: Localized;
  /** Resposta curta. */
  answer: Localized;
  /** Por que você gosta disso, ou o que gosta de conversar sobre o assunto. */
  note: Localized;
  /** Imagem opcional (arquivo em public/images/curiosities/ ou URL). */
  image?: { src: string; alt: Localized };
  /** Cor do disquete. Sem cor, ele recebe a próxima da paleta. */
  color?: DiskColor;
  draft?: boolean;
}

export const curiosities: Curiosity[] = [
  {
    id: "dream",
    topic: { "pt-BR": "um sonho", en: "a dream" },
    answer: { "pt-BR": "Criar jogos", en: "Making games" },
    note: {
      "pt-BR":
        "Sempre foi um sonho meu. Hoje ele tem nome: o Pixel Mole, meu estúdio independente.",
      en: "It's always been a dream of mine. Today it has a name: Pixel Mole, my independent studio.",
    },
    color: "blue",
  },
  {
    id: "favorite-game",
    topic: { "pt-BR": "jogo favorito", en: "favorite game" },
    answer: {
      "pt-BR": "Clair Obscur: Expedition 33",
      en: "Clair Obscur: Expedition 33",
    },
    note: {
      "pt-BR":
        "Simplesmente um dos jogos mais lindos que já joguei, com uma das mensagens mais bonitas que já encontrei em um videogame. Menção honrosa a Outer Wilds. E, como se tudo isso não bastasse, ele ainda reúne duas coisas que amo: RPGs de turno e histórias que ficam com você. Foi com Persona que me apaixonei pelo gênero, então Expedition 33 encaixou como uma luva.",
      en: "Simply one of the most beautiful games I have ever played, with one of the most beautiful messages I have ever encountered in a video game. Honorable mention to Outer Wilds. As if that were not enough, it also brings together two things I love: turn-based RPGs and stories that stay with you. Persona was what made me fall in love with the genre, so Expedition 33 felt like a perfect fit.",
    },
    color: "lilac",
  },
  {
    id: "favorite-anime",
    topic: { "pt-BR": "anime favorito", en: "favorite anime" },
    answer: { "pt-BR": "False Memory", en: "False Memory" },
    note: {
      "pt-BR":
        "Um donghua, como são chamados os animes chineses, pouco conhecido e bem curtinho, mas com uma animação impecável. Ele tem algumas das reviravoltas mais devastadoras que já vi e uma história linda, construída com tanto cuidado que tudo se encaixa perfeitamente do começo ao fim.",
      en: "A little-known and very short donghua, the term used for Chinese animation, but with absolutely impeccable animation. It features some of the most devastating plot twists I have ever seen and a beautiful story, crafted with such care that everything fits together perfectly from beginning to end.",
    },
    color: "peach",
  },
  {
    id: "favorite-movie",
    topic: { "pt-BR": "filme favorito", en: "favorite movie" },
    answer: { "pt-BR": "A Chegada", en: "Arrival" },
    note: {
      "pt-BR":
        "Já assisti a muitos filmes sobre alienígenas, especialmente aqueles em que eles invadem a Terra. Mas uau, A Chegada conseguiu inovar ao transformar o maior desafio não em combater os visitantes, mas em entender o que eles estão tentando dizer. E ainda tem a reviravolta que mais me pegou de surpresa na vida. Eu realmente não esperava por aquilo.",
      en: "I have watched many movies about aliens, especially ones where they invade Earth. But wow, Arrival found a way to do something different by making the biggest challenge not fighting the visitors, but understanding what they are trying to say. And then there is the plot twist that surprised me more than anything else in my life. I genuinely did not see it coming.",
    },
    color: "mint",
  },
  {
    id: "favorite-series",
    topic: { "pt-BR": "série favorita", en: "favorite TV series" },
    answer: { "pt-BR": "The Good Place", en: "The Good Place" },
    note: {
      "pt-BR":
        "Acho que ficaria com The Good Place. Sou apaixonado pela forma como a série aborda questões tão profundas, que muitas vezes parecem tristes, com tanta leveza, humor e sensibilidade. E o final é a cereja do bolo: para mim, um dos melhores finais de série que já vi, daqueles que fazem tudo valer ainda mais a pena.",
      en: "I think I would go with The Good Place. I love how the show explores such profound topics, which often seem sad, with so much lightness, humor, and sensitivity. And the ending is the cherry on top: for me, one of the best series finales I have ever seen, the kind that makes the entire journey feel even more worthwhile.",
    },
    color: "yellow",
  },
];
