/**
 * Logos das empresas (src/assets/companies/<company>.<ext>).
 *
 * O Vite encontra os arquivos no build e devolve o endereço final de cada um;
 * o item da trajetória só diz o nome (`company`). Sem arquivo, não há logo.
 */
const files = import.meta.glob<string>('../assets/companies/*.{svg,png,webp,jpg,jpeg,avif}', { eager: true, import: 'default' })

const byName = new Map<string, string>()
for (const [path, url] of Object.entries(files)) {
  const name = (path.split('/').pop() ?? '').replace(/\.[^.]+$/, '').toLowerCase()
  if (name && !byName.has(name)) byName.set(name, url)
}

/** Endereço da logo da empresa, ou null se ainda não houver arquivo. */
export function logoOf(company?: string | null): string | null {
  return company ? (byName.get(company.toLowerCase()) ?? null) : null
}
