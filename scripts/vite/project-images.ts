/**
 * Imagens personalizadas dos projetos.
 *
 * Coloque um arquivo com o nome do repositório na pasta (ex.: src/assets/projects/meu-projeto.png)
 * e ele aparece no card desse projeto. Sem arquivo, o card usa a arte genérica do site.
 *
 * Como funciona: um site estático não consegue listar uma pasta no navegador, e tentar
 * baixar "meu-projeto.png" para cada repositório geraria um erro 404 por projeto sem imagem.
 * Então a descoberta acontece no Vite: este plugin lê a pasta e entrega ao site um mapa
 * { repositório → imagem } pelo módulo "virtual:project-images".
 *
 *   - npm run dev: usa os arquivos originais e recarrega a página quando a pasta muda.
 *   - build (inclusive na Vercel): converte cada imagem para WebP com no máximo 1280 px
 *     de largura (com sharp) e publica com nome versionado, em cache longo.
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'
import type { Plugin } from 'vite'

const VIRTUAL_ID = 'virtual:project-images'
const RESOLVED_ID = `\0${VIRTUAL_ID}`
/** Em ordem de preferência, se houver mais de um arquivo para o mesmo repositório. */
const EXTENSIONS = ['webp', 'avif', 'png', 'jpg', 'jpeg', 'gif', 'svg']
const MAX_WIDTH = 1280

interface Entry {
  src: string
  width: number | null
  height: number | null
}

type SharpModule = (typeof import('sharp'))['default']
let sharpLoader: Promise<SharpModule | null> | null = null
function loadSharp(): Promise<SharpModule | null> {
  sharpLoader ??= import('sharp').then((m) => m.default).catch(() => null)
  return sharpLoader
}

/** Um arquivo por repositório: nome em minúsculas → arquivo. */
async function scan(dir: string, warn: (message: string) => void): Promise<Map<string, string>> {
  const found = new Map<string, string>()
  if (!existsSync(dir)) return found
  const files = (await readdir(dir)).filter((file) => EXTENSIONS.includes(extname(file).slice(1).toLowerCase()))
  files.sort((a, b) => EXTENSIONS.indexOf(extname(a).slice(1).toLowerCase()) - EXTENSIONS.indexOf(extname(b).slice(1).toLowerCase()))
  for (const file of files) {
    const name = file.slice(0, -extname(file).length).toLowerCase()
    if (found.has(name)) {
      warn(`imagens de projetos: "${file}" ignorado, já existe "${found.get(name)}" para "${name}"`)
      continue
    }
    found.set(name, file)
  }
  return found
}

async function dimensions(file: string): Promise<{ width: number | null; height: number | null }> {
  const sharp = await loadSharp()
  if (!sharp) return { width: null, height: null }
  try {
    const meta = await sharp(file, { animated: true }).metadata()
    return { width: meta.width ?? null, height: meta.pageHeight ?? meta.height ?? null }
  } catch {
    return { width: null, height: null }
  }
}

/** Versão leve para publicar: WebP até 1280 px (GIF animado continua animado). SVG vai como está. */
async function optimize(file: string): Promise<{ buffer: Buffer; ext: string; width: number | null; height: number | null }> {
  const original = await readFile(file)
  const ext = extname(file).slice(1).toLowerCase()
  const sharp = await loadSharp()
  if (!sharp || ext === 'svg') return { buffer: original, ext, ...(await dimensions(file)) }
  try {
    const { data, info } = await sharp(original, { animated: ext === 'gif' || ext === 'webp' })
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toBuffer({ resolveWithObject: true })
    const height = (info as { pageHeight?: number }).pageHeight ?? info.height
    // Se a conversão não ajudar (arquivo já pequeno), publica o original.
    if (data.length >= original.length && ext === 'webp') return { buffer: original, ext, width: info.width, height }
    return { buffer: data, ext: 'webp', width: info.width, height }
  } catch {
    return { buffer: original, ext, ...(await dimensions(file)) }
  }
}

export function projectImages(options: { dir: string }): Plugin {
  let root = process.cwd()
  let base = '/'
  let isBuild = false

  return {
    name: 'project-images',
    configResolved(config) {
      root = config.root
      base = config.base
      isBuild = config.command === 'build'
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },
    async load(id) {
      if (id !== RESOLVED_ID) return undefined
      const dir = resolve(root, options.dir)
      const files = await scan(dir, (message) => this.warn(message))
      const entries: Record<string, Entry> = {}
      for (const [name, file] of files) {
        const path = join(dir, file)
        this.addWatchFile(path)
        if (!isBuild) {
          entries[name] = { src: `${base}${relative(root, path).split(sep).join('/')}`, ...(await dimensions(path)) }
          continue
        }
        const out = await optimize(path)
        const hash = createHash('sha256').update(out.buffer).digest('hex').slice(0, 10)
        const fileName = `assets/projects/${name}-${hash}.${out.ext}`
        this.emitFile({ type: 'asset', fileName, source: out.buffer })
        entries[name] = { src: `${base}${fileName}`, width: out.width, height: out.height }
      }
      return `export default ${JSON.stringify(entries)}`
    },
    configureServer(server) {
      const dir = resolve(server.config.root, options.dir)
      server.watcher.add(dir)
      const refresh = (file: string) => {
        if (!resolve(file).startsWith(dir)) return
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', refresh)
      server.watcher.on('unlink', refresh)
      server.watcher.on('change', refresh)
    },
  }
}
