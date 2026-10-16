/**
 * Retrato do início do site (src/assets/profile/).
 *
 * Coloque uma imagem nessa pasta, com qualquer nome (retrato.webp, foto.jpg…), e ela
 * aparece sozinha no início do site e na página de links. Para trocar, substitua o
 * arquivo: o código não muda. O Vite encontra a imagem no build e no `npm run dev`
 * e dá a ela um endereço novo a cada troca, então ninguém fica vendo a antiga em cache.
 *
 * Pasta sem imagem: o espaço do retrato continua reservado no início do site, vazio.
 * Mais de uma imagem: vale a primeira em ordem alfabética.
 */
const files = import.meta.glob<string>(
  '../assets/profile/*.{webp,avif,png,jpg,jpeg,gif,svg,WEBP,AVIF,PNG,JPG,JPEG,GIF,SVG}',
  { eager: true, import: 'default' },
)

const paths = Object.keys(files).sort((a, b) => a.localeCompare(b))
const first = paths[0]

/** Endereço do retrato, ou null se a pasta ainda não tiver imagem. */
export const portraitUrl: string | null = first ? (files[first] ?? null) : null

if (import.meta.env.DEV && paths.length > 1) {
  const names = paths.map((p) => p.split('/').pop()).join(', ')
  console.warn(`[retrato] Há ${paths.length} imagens em src/assets/profile/ (${names}). Usando ${names.split(', ')[0]}. Deixe só uma.`)
}
