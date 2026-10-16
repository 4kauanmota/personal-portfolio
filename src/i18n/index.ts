import { computed, ref } from 'vue'
import { site } from '../content/site'
import { DEFAULT_LOCALE, LOCALES, type Locale, type Localized } from '../lib/types'
import en from './messages/en'
import ptBR, { type Messages } from './messages/pt-BR'
import { META, OG_LOCALE, parsePath, pathFor, type PageId } from './meta'

const STORAGE_KEY = '4kauanmota:locale'
const dictionaries: Record<Locale, Messages> = { 'pt-BR': ptBR, en }

/* Chaves tipadas: o editor sugere e o TypeScript recusa chaves que não existem. */
type Plural = { one: string; other: string }
type Join<K extends string, P extends string> = `${K}.${P}`
type StringPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : T[K] extends Plural ? never : Join<K, StringPaths<T[K]>>
}[keyof T & string]
type PluralPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? never : T[K] extends Plural ? K : Join<K, PluralPaths<T[K]>>
}[keyof T & string]
export type MessageKey = StringPaths<Messages>
export type PluralKey = PluralPaths<Messages>
export type Params = Record<string, string | number>

function readStoredLocale(): Locale | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return (LOCALES as readonly string[]).includes(value ?? '') ? (value as Locale) : null
  } catch {
    return null
  }
}

function storeLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* armazenamento indisponível (modo privado etc.): só não lembra a escolha */
  }
}

const base = import.meta.env.BASE_URL
const initial = typeof window === 'undefined' ? { page: 'home' as PageId, locale: DEFAULT_LOCALE, explicitLocale: false } : parsePath(window.location.pathname, base)
const startLocale: Locale = initial.explicitLocale ? initial.locale : (readStoredLocale() ?? initial.locale)

const locale = ref<Locale>(startLocale)
const page = ref<PageId>(initial.page)

function lookup(key: string, dict: Messages): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), dict)
}

function interpolate(text: string, params?: Params): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

export function t(key: MessageKey, params?: Params): string {
  const value = lookup(key, dictionaries[locale.value]) ?? lookup(key, dictionaries[DEFAULT_LOCALE])
  return typeof value === 'string' ? interpolate(value, params) : key
}

const pluralRules = computed(() => new Intl.PluralRules(locale.value))

export function tp(key: PluralKey, count: number, params?: Params): string {
  const value = (lookup(key, dictionaries[locale.value]) ?? lookup(key, dictionaries[DEFAULT_LOCALE])) as Plural | undefined
  if (!value) return key
  const form = pluralRules.value.select(count) === 'one' ? value.one : value.other
  return interpolate(form, { count: formatNumber(count), ...params })
}

/** Escolhe a versão do idioma atual de um conteúdo { 'pt-BR': ..., en: ... }. */
export function tx<T>(value: Localized<T>): T {
  return value[locale.value] ?? value[DEFAULT_LOCALE]
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat(locale.value, { maximumFractionDigits: digits }).format(value)
}

export function formatDate(iso: string, style: 'month' | 'day' = 'month'): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const options: Intl.DateTimeFormatOptions =
    style === 'day' ? { day: 'numeric', month: 'short', year: 'numeric' } : { month: 'short', year: 'numeric' }
  return new Intl.DateTimeFormat(locale.value, options).format(date)
}

function setMeta(selector: string, attribute: string, value: string): void {
  document.head.querySelector(selector)?.setAttribute(attribute, value)
}

function siteUrl(): string {
  const canonical = document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')
  if (canonical) {
    try {
      return new URL(base, canonical).toString()
    } catch {
      /* usa o padrão */
    }
  }
  return `${site.defaultUrl}/`
}

/** Atualiza <html lang>, título, descrição e tags de compartilhamento para o idioma atual. */
export function applyDocumentLocale(): void {
  if (typeof document === 'undefined') return
  const meta = META[locale.value][page.value]
  const url = new URL(pathFor(page.value, locale.value), siteUrl()).toString()
  document.documentElement.lang = locale.value
  document.title = meta.title
  setMeta('meta[name="description"]', 'content', meta.description)
  setMeta('meta[property="og:title"]', 'content', meta.title)
  setMeta('meta[property="og:description"]', 'content', meta.description)
  setMeta('meta[property="og:locale"]', 'content', OG_LOCALE[locale.value])
  setMeta('meta[property="og:url"]', 'content', url)
  setMeta('link[rel="canonical"]', 'href', url)
}

/** Troca o idioma sem recarregar a página: só o texto muda, a URL é atualizada no lugar. */
export function setLocale(next: Locale): void {
  if (next === locale.value) return
  locale.value = next
  storeLocale(next)
  if (page.value !== 'notfound') {
    const target = `${base}${pathFor(page.value, next)}${window.location.search}${window.location.hash}`
    window.history.replaceState(window.history.state, '', target)
  }
  applyDocumentLocale()
}

/** Endereço de uma página no idioma atual (para links internos). */
export function hrefFor(target: PageId, hash = ''): string {
  return `${base}${pathFor(target, locale.value)}${hash}`
}

export function useI18n() {
  return { locale, page, t, tp, tx, setLocale, formatDate, formatNumber, hrefFor }
}

/** Ajusta a URL quando o idioma salvo difere do endereço aberto (ex.: "/" com preferência por inglês). */
export function syncInitialUrl(): void {
  if (typeof window === 'undefined') return
  if (page.value === 'notfound') {
    applyDocumentLocale()
    return
  }
  const expected = `${base}${pathFor(page.value, locale.value)}`
  const current = window.location.pathname.replace(/index\.html$/, '')
  if (current !== expected) window.history.replaceState(window.history.state, '', `${expected}${window.location.search}${window.location.hash}`)
  applyDocumentLocale()
}
