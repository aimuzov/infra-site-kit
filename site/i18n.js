import en from './i18n/en.js'
import ru from './i18n/ru.js'

/** Языки сайтов. Язык по умолчанию без префикса в адресе, остальные под `/<locale>/`. */
export const LOCALES = /** @type {const} */ (['ru', 'en'])

export const DEFAULT_LOCALE = 'ru'

/** Cookie с явным выбором языка: сервер с ним больше не смотрит на `Accept-Language`. */
export const LOCALE_COOKIE = 'lang'

/** Название языка на нём самом: так его узнаёт тот, кто ищет в меню свой язык. */
export const LOCALE_NAMES = /** @type {Record<string, string>} */ ({ ru: 'Русский', en: 'English' })

const DICTS = { ru, en }

/**
 * Схема языков сайта. По умолчанию русский в корне и английский под `/en/`, а сайт
 * с английским в корне передаёт `{ defaultLocale: 'en' }` во все функции путей.
 *
 * @param {import('./i18n.d.ts').Routing} [routing]
 * @returns {{ locales: readonly string[], defaultLocale: string }}
 */
function scheme(routing) {
	return { locales: routing?.locales ?? LOCALES, defaultLocale: routing?.defaultLocale ?? DEFAULT_LOCALE }
}

/**
 * Язык из строки, если он поддерживается, иначе язык по умолчанию.
 *
 * @param {string | null | undefined} value
 * @param {import('./i18n.d.ts').Routing} [routing]
 * @returns {import('./i18n.d.ts').Locale}
 */
export function toLocale(value, routing) {
	const { locales, defaultLocale } = scheme(routing)

	return /** @type {never} */ (value && locales.includes(value) ? value : defaultLocale)
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
	const lang = /** @type {'ru' | 'en'} */ (locale in DICTS ? locale : DEFAULT_LOCALE)
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
 * @param {import('./i18n.d.ts').Routing} [routing]
 */
export function localeOfPath(pathname, routing) {
	const { locales, defaultLocale } = scheme(routing)
	const first = pagePath(pathname).split('/')[1]

	return /** @type {import('./i18n.d.ts').Locale} */ (
		first !== defaultLocale && locales.includes(first) ? first : defaultLocale
	)
}

/**
 * Тот же путь на другом языке: `/account` → `/en/account` и обратно.
 *
 * @param {string} path
 * @param {string} locale
 * @param {import('./i18n.d.ts').Routing} [routing]
 */
export function localizePath(path, locale, routing) {
	const { defaultLocale } = scheme(routing)
	const pathname = pagePath(path)
	const current = localeOfPath(pathname, routing)
	const bare = current === defaultLocale ? pathname : pathname.slice(current.length + 1) || '/'
	const target = toLocale(locale, routing)

	return target === defaultLocale ? bare : `/${target}${bare === '/' ? '/' : bare}`
}

/**
 * Ссылки `hreflang` на все языковые версии страницы и `x-default` на версию по умолчанию.
 *
 * @param {URL | string} url адрес текущей страницы
 * @param {import('./i18n.d.ts').Routing} [routing]
 * @returns {{ hreflang: string, href: string }[]}
 */
export function alternates(url, routing) {
	const { locales, defaultLocale } = scheme(routing)
	const page = new URL(url)

	const href = (/** @type {string} */ locale) =>
		new URL(localizePath(page.pathname, locale, routing), page.origin).href

	return [
		...locales.map((locale) => ({ hreflang: locale, href: href(locale) })),
		{ hreflang: 'x-default', href: href(defaultLocale) },
	]
}

/**
 * Лучший поддерживаемый язык из заголовка `Accept-Language` с учётом весов `q`.
 * Пустой заголовок или незнакомые языки -- язык по умолчанию.
 *
 * @param {string | null | undefined} header
 * @param {import('./i18n.d.ts').Routing} [routing]
 */
export function negotiateLocale(header, routing) {
	const { locales } = scheme(routing)

	const ranked = (header ?? '')
		.split(',')
		.map((part) => {
			const [tag, ...params] = part.trim().split(';')
			const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='))

			return { lang: tag.toLowerCase().split('-')[0], q: q ? Number(q.slice(2)) : 1 }
		})
		.filter(({ lang, q }) => lang && q > 0)
		.sort((a, b) => b.q - a.q)

	return toLocale(ranked.find(({ lang }) => locales.includes(lang))?.lang, routing)
}
