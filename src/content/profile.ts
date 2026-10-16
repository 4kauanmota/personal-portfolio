import type { Localized } from '../lib/types'

/**
 * Retrato do início do site.
 *
 * A imagem não é escolhida aqui: coloque o arquivo em src/assets/profile/ (qualquer nome)
 * e ele aparece sozinho. Para trocar, substitua o arquivo. Veja src/assets/profile/README.md.
 *
 * Aqui ficam só os ajustes da imagem, que valem para qualquer arquivo que estiver na pasta.
 */
export const profilePhoto: {
  alt: Localized
  /** Ponto focal do recorte (CSS object-position). Ex.: '50% 25%' mantém o rosto no alto. */
  focus: string
  /** Altura da auréola sobre o retrato pequeno da página de links (do topo da moldura). Ajuste para ela ficar logo acima da cabeça. */
  haloTop: string
} = {
  alt: {
    'pt-BR': 'Retrato de Kauan',
    en: 'Portrait of Kauan',
  },
  focus: '50% 28%',
  haloTop: '21%',
}

export const profile = {
  location: {
    'pt-BR': 'Juiz de Fora, Minas Gerais',
    en: 'Juiz de Fora, Minas Gerais, Brazil',
  } satisfies Localized,
}
