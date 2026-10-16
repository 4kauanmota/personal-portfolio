/**
 * Distribuição da trajetória: quem acontece ao mesmo tempo fica lado a lado.
 *
 * As experiências são agrupadas em "trechos": um trecho junta tudo o que se
 * sobrepõe no tempo (direta ou indiretamente). Dentro de um trecho, cada
 * experiência ganha uma coluna, e duas que não se sobrepõem podem dividir a
 * mesma coluna (uma depois da outra). O número de colunas de um trecho é o
 * máximo de coisas acontecendo juntas nele, então:
 *   - 1 coluna  → o item fica centralizado;
 *   - 2 colunas → metade da largura para cada um;
 *   - 3 ou mais → a largura se divide igualmente.
 * Quem decide quantas colunas cabem na tela é o componente; aqui só há a lógica,
 * sem nada de navegador (por isso dá para testar).
 */

/** Data da trajetória ('AAAA-MM' ou 'AAAA-MM-DD') em meses (ano * 12 + mês). */
export function toMonths(value?: string | null): number | null {
  if (!value) return null
  const [y, m] = value.split('-').map(Number)
  if (!y) return null
  return y * 12 + ((m ?? 1) - 1)
}

/** Data da trajetória como ISO (meio-dia, para não virar o dia anterior em nenhum fuso). */
export function toIso(value: string): string {
  const [y, m = '01', d = '01'] = value.split('-')
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00`
}

export interface JourneyInput {
  id: string
  /** Início em meses (ano * 12 + mês); null = sem data (em andamento, sem início conhecido). */
  start: number | null
  /** Fim em meses; null = até hoje. */
  end: number | null
}

export interface JourneyCluster {
  /** Itens do trecho, na ordem de leitura (início). */
  ids: string[]
  /** Coluna de cada item dentro do trecho. */
  column: Record<string, number>
  /** Máximo de itens ao mesmo tempo (= número de colunas). */
  columns: number
  start: number
  /** Fim do trecho (o maior fim entre os itens; "hoje + 1" se algo continua). */
  end: number
  /** Algum item continua até hoje? */
  ongoing: boolean
}

/**
 * Agrupa as experiências em trechos e distribui as colunas.
 * `now` é o mês atual (ano * 12 + mês), para o que ainda não terminou.
 */
export function clusterJourney(items: JourneyInput[], now: number): JourneyCluster[] {
  const current = now + 1
  const dated = items
    .filter((i) => i.start !== null)
    .map((i) => ({ id: i.id, start: i.start as number, end: i.end ?? current }))
    .sort((a, b) => a.start - b.start || a.end - b.end)
  const floating = items.filter((i) => i.start === null)

  const clusters: JourneyCluster[] = []
  let open: { cluster: JourneyCluster; lastEnds: number[] } | null = null

  for (const item of dated) {
    if (!open || item.start >= open.cluster.end) {
      open = { cluster: { ids: [], column: {}, columns: 0, start: item.start, end: item.end, ongoing: false }, lastEnds: [] }
      clusters.push(open.cluster)
    }
    const { cluster, lastEnds } = open
    // Primeira coluna livre (o item anterior dela já tinha terminado).
    let column = lastEnds.findIndex((end) => end <= item.start)
    if (column < 0) {
      column = lastEnds.length
      lastEnds.push(item.end)
    } else {
      lastEnds[column] = item.end
    }
    cluster.ids.push(item.id)
    cluster.column[item.id] = column
    cluster.columns = lastEnds.length
    cluster.end = Math.max(cluster.end, item.end)
    cluster.ongoing = cluster.ongoing || item.end >= current
  }

  // Sem data de início = "em andamento": entra no último trecho se ele chega até hoje.
  if (floating.length) {
    let last = clusters.at(-1)
    if (!last || !last.ongoing) {
      last = { ids: [], column: {}, columns: 0, start: now, end: current, ongoing: true }
      clusters.push(last)
    }
    for (const item of floating) {
      last.ids.push(item.id)
      last.column[item.id] = last.columns
      last.columns += 1
    }
  }

  return clusters
}

/**
 * Quantas colunas cabem: com `width` disponível, colunas de pelo menos `min`
 * e `gap` entre elas. Nunca menos que 1.
 */
export function columnsThatFit(width: number, min: number, gap: number): number {
  return Math.max(1, Math.floor((width + gap) / (min + gap)))
}

/**
 * Colunas na tela para um trecho: as do trecho, limitadas ao que cabe.
 * Quando não cabe tudo, os itens se distribuem em ordem pelas colunas disponíveis.
 */
export function displayColumns(cluster: JourneyCluster, fit: number): { count: number; of: Record<string, number> } {
  const count = Math.max(1, Math.min(cluster.columns, fit))
  const of: Record<string, number> = {}
  for (const id of cluster.ids) of[id] = (cluster.column[id] ?? 0) % count
  return { count, of }
}

/* ------------------------------------------------------------------ */
/* Altura pelo tempo                                                   */
/* ------------------------------------------------------------------ */

export interface SpanItem {
  id: string
  /** Início e fim em meses (fim > início). */
  start: number
  end: number
  /** Altura natural da caixa (o conteúdo), em pixels. */
  height: number
}

export interface SpanOptions {
  /** Onde o trecho começa (px). */
  top: number
  /** Altura mínima de cada mês (px). */
  month: number
  /** Altura mínima de qualquer faixa entre duas datas (px). */
  minRow: number
  /** Espaço entre o fim de uma experiência e a próxima da mesma coluna (px). */
  stack: number
}

export interface SpanTrack {
  /** Onde a experiência começa na linha do tempo (px). */
  top: number
  /** Comprimento da experiência na linha do tempo (px). A caixa tem a altura natural dela e anda dentro deste trilho. */
  length: number
}

/**
 * Trilhos de um trecho em que as experiências aparecem lado a lado.
 *
 * O trecho vira faixas entre todas as datas de início e fim; cada faixa tem pelo menos
 * `month` px por mês. Cada experiência ganha um trilho do seu início ao seu fim, então o
 * comprimento do trilho segue a duração real. A caixa de texto mantém a altura natural
 * e só precisa caber no trilho: se uma experiência curta tem mais texto do que tempo,
 * as faixas dela crescem (primeiro as experiências mais curtas, como numa grade).
 */
export function spanTracks(items: SpanItem[], options: SpanOptions): { tracks: Record<string, SpanTrack>; bottom: number } {
  const { top, month, minRow, stack } = options
  if (!items.length) return { tracks: {}, bottom: top }
  const bounds = [...new Set(items.flatMap((i) => [i.start, Math.max(i.end, i.start + 1)]))].sort((a, b) => a - b)
  const rows = bounds.slice(0, -1).map((b, r) => Math.max(minRow, ((bounds[r + 1] as number) - b) * month))
  const span = (i: SpanItem) => [bounds.indexOf(i.start), bounds.indexOf(Math.max(i.end, i.start + 1))] as const
  const byLength = [...items].sort((a, b) => span(a)[1] - span(a)[0] - (span(b)[1] - span(b)[0]))
  for (const item of byLength) {
    const [from, to] = span(item)
    const need = item.height + stack
    const have = rows.slice(from, to).reduce((sum, h) => sum + h, 0)
    if (need > have) for (let r = from; r < to; r++) rows[r] = (rows[r] as number) + (need - have) / (to - from)
  }
  const rowTop = [top]
  for (const h of rows) rowTop.push((rowTop[rowTop.length - 1] as number) + h)
  const tracks: Record<string, SpanTrack> = {}
  for (const item of items) {
    const [from, to] = span(item)
    tracks[item.id] = { top: rowTop[from] as number, length: (rowTop[to] as number) - (rowTop[from] as number) - stack }
  }
  return { tracks, bottom: (rowTop[rowTop.length - 1] as number) - stack }
}
