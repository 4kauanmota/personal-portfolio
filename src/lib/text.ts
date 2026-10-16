/**
 * Parágrafos de um texto do conteúdo: uma linha em branco ("\n\n") separa um do outro.
 * Assim um texto longo (como uma experiência da trajetória) continua num campo só,
 * nos dois idiomas, e aparece com a respiração certa entre os parágrafos.
 */
export function paragraphs(value: string): string[] {
  return value
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}
