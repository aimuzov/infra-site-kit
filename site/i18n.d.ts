/** Языки сайтов: по умолчанию русский без префикса, английский под `/en/`. */
export type Locale = 'ru' | 'en'

export const LOCALES: readonly Locale[]
export const DEFAULT_LOCALE: 'ru'
/** Cookie с явным выбором языка. */
export const LOCALE_COOKIE: 'lang'
/** Название языка на нём самом: «Русский», «English». */
export const LOCALE_NAMES: Record<string, string>

/** Схема языков сайта, если она не та, что по умолчанию: например, английский в корне. */
export type Routing = {
	/** Языки сайта, первым удобно ставить язык по умолчанию. */
	locales?: readonly string[]
	/** Язык, у которого нет префикса в адресе. */
	defaultLocale?: string
}

/** Свои строки сервиса по языкам, поверх общих. */
export type Strings = Partial<Record<Locale, Record<string, string>>>

export function toLocale(value: string | null | undefined, routing?: Routing): Locale
export function t(locale: string, key: string, vars?: Record<string, string | number>, extra?: Strings): string
export function pagePath(pathname: string): string
export function localeOfPath(pathname: string, routing?: Routing): Locale
export function localizePath(pathname: string, locale: string, routing?: Routing): string
export function alternates(url: URL | string, routing?: Routing): { hreflang: string; href: string }[]
export function negotiateLocale(header: string | null | undefined, routing?: Routing): Locale
