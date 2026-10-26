/** Языки сайтов: русский по умолчанию без префикса, английский под `/en/`. */
export type Locale = 'ru' | 'en'

export const LOCALES: readonly Locale[]
export const DEFAULT_LOCALE: 'ru'
/** Cookie с явным выбором языка. */
export const LOCALE_COOKIE: 'lang'

/** Свои строки сервиса по языкам, поверх общих. */
export type Strings = Partial<Record<Locale, Record<string, string>>>

export function toLocale(value: string | null | undefined): Locale
export function t(locale: string, key: string, vars?: Record<string, string | number>, extra?: Strings): string
export function pagePath(pathname: string): string
export function localeOfPath(pathname: string): Locale
export function localizePath(pathname: string, locale: string): string
export function alternates(url: URL | string): { hreflang: string; href: string }[]
export function negotiateLocale(header: string | null | undefined): Locale
