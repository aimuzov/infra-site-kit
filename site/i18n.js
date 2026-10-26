import en from './i18n/en.js'
import ru from './i18n/ru.js'

/** Языки сайтов. Русский без префикса в адресе, остальные под `/<locale>/`. */
export const LOCALES = /** @type {const} */ (['ru', 'en'])

export const DEFAULT_LOCALE = 'ru'

/** Cookie с явным выбором языка: сервер с ним больше не смотрит на `Accept-Language`. */
export const LOCALE_COOKIE = 'lang'

const DICTS = { ru, en }

/**
 * Язык из строки, если он поддерживается, иначе язык по умолчанию.
 *
 * @param {string | null | undefined} value
 * @returns {import('./i18n.d.ts').Locale}
 */
export function toLocale(value) {
	return LOCALES.includes(/** @type {never} */ (value)) ? /** @type {never} */ (value) : DEFAULT_LOCALE
}

/**
 * Строка словаря с подстановкой `{name}`. Чего нет в словаре языка, берётся по-русски,
 * а неизвестный ключ возвращается как есть: так пропуск виден на странице, а не прячется.
 *
 * @param {string} locale
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 * @param {Record<string, Record<string, string>>} [extra] свои словари сервиса поверх общих
 */
export function t(locale, key, vars, extra) {
	const lang = toLocale(locale)
	const text = extra?.[lang]?.[key] ?? DICTS[lang][key] ?? extra?.[DEFAULT_LOCALE]?.[key] ?? ru[key] ?? key

	return vars ? text.replace(/\{(\w+)\}/g, (all, name) => (name in vars ? String(vars[name]) : all)) : text
}

/**
 * Путь страницы без расширения: на сборке с `build.format: 'file'` Astro отдаёт `/en.html`
 * и `/login/index.html`, а языки и `hreflang` считаются от `/en` и `/login`.
 *
 * @param {string} pathname
 */
export function pagePath(pathname) {
	const bare = pathname.replace(/(?:\/index)?\.html$/, '')

	return bare === '' ? '/' : bare
}

/**
 * Язык страницы по её пути: первый сегмент, если это язык не по умолчанию.
 *
 * @param {string} pathname
 */
export function localeOfPath(pathname) {
	const first = pagePath(pathname).split('/')[1]

	return first !== DEFAULT_LOCALE && LOCALES.includes(/** @type {never} */ (first))
		? /** @type {import('./i18n.d.ts').Locale} */ (first)
		: DEFAULT_LOCALE
}

/**
 * Тот же путь на другом языке: `/account` → `/en/account` и обратно.
 *
 * @param {string} path
 * @param {string} locale
 */
export function localizePath(path, locale) {
	const pathname = pagePath(path)
	const current = localeOfPath(pathname)
	const bare = current === DEFAULT_LOCALE ? pathname : pathname.slice(current.length + 1) || '/'

	return toLocale(locale) === DEFAULT_LOCALE ? bare : `/${locale}${bare === '/' ? '/' : bare}`
}

/**
 * Ссылки `hreflang` на все языковые версии страницы и `x-default` на русскую.
 *
 * @param {URL | string} url адрес текущей страницы
 * @returns {{ hreflang: string, href: string }[]}
 */
export function alternates(url) {
	const page = new URL(url)

	const href = (/** @type {string} */ locale) => new URL(localizePath(page.pathname, locale), page.origin).href

	return [
		...LOCALES.map((locale) => ({ hreflang: locale, href: href(locale) })),
		{ hreflang: 'x-default', href: href(DEFAULT_LOCALE) },
	]
}

/**
 * Лучший поддерживаемый язык из заголовка `Accept-Language` с учётом весов `q`.
 * Пустой заголовок или незнакомые языки -- язык по умолчанию.
 *
 * @param {string | null | undefined} header
 */
export function negotiateLocale(header) {
	const ranked = (header ?? '')
		.split(',')
		.map((part) => {
			const [tag, ...params] = part.trim().split(';')
			const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='))

			return { lang: tag.toLowerCase().split('-')[0], q: q ? Number(q.slice(2)) : 1 }
		})
		.filter(({ lang, q }) => lang && q > 0)
		.sort((a, b) => b.q - a.q)

	return toLocale(ranked.find(({ lang }) => LOCALES.includes(/** @type {never} */ (lang)))?.lang)
}
