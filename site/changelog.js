/**
 * Ченжлог для читателя ("Что нового"): формат записей, их проверка и разметка пунктов.
 * Записи лежат в JSON сайта или приложения (путь -- в поле `changelog` package.json или в
 * `changelog.config.json`), новые сверху.
 * Технический CHANGELOG.md ведёт release-please, а запись для читателя пишется в релизный PR
 * по выводу `site-changelog context`.
 */

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Пункт в HTML: текст экранирован, ссылки `[текст](/путь/)` становятся `<a>`. */
export function itemHtml(item) {
	let html = ''
	let from = 0

	for (const m of item.matchAll(LINK)) {
		html += escape(item.slice(from, m.index)) + `<a href="${escape(m[2])}">${escape(m[1])}</a>`
		from = m.index + m[0].length
	}

	return html + escape(item.slice(from))
}

/** Пути всех ссылок пункта, для проверки, что страницы существуют. */
export const itemLinks = (item) => [...item.matchAll(LINK)].map((m) => m[2])

/** "18 октября 2026" из `2026-10-18`. */
export const releaseDate = (date, locale = 'ru-RU') =>
	new Date(`${date}T00:00:00Z`)
		.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
		.replace(/\s*г\.$/, '')

/** Якорь раздела релиза: `v1-12-0` из `1.12.0`. */
export const releaseId = (version) => `v${version.replaceAll('.', '-')}`

const isLocalized = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * Текст на языке страницы. Заголовок и пункты записи бывают одни на все языки или по языкам,
 * `{ ru, en }`: тогда нужный язык, без него русский, без русского первый какой есть.
 */
export const localized = (value, lang = 'ru') =>
	isLocalized(value) ? (value[lang] ?? value.ru ?? Object.values(value)[0]) : value

/** Запись на языке страницы: её заголовок и пункты. */
export const localizeRelease = (release, lang) => ({
	...release,
	title: localized(release.title, lang),
	items: localized(release.items, lang),
})

/** Все варианты текста: одна строка или по одной на язык. */
const variants = (value) => (isLocalized(value) ? Object.entries(value) : [[undefined, value]])

/** Пункты записи на всех её языках, для проверки ссылок. */
export const releaseItems = (release) => variants(release.items ?? []).flatMap(([, items]) => items ?? [])

/**
 * Записи, которые видит читатель. Скрытая запись (`hidden: true`) только отмечает, что
 * релиз без заметных читателю изменений рассмотрен, и гард не требует её дописать.
 */
export const visibleReleases = (releases) => releases.filter((r) => !r.hidden)

/**
 * Ошибки формата: версия в semver и одна на запись, дата `YYYY-MM-DD`, новые сверху,
 * у видимой записи есть заголовок и пункты. Пустой массив -- всё в порядке.
 *
 * Заголовок и пункты по языкам должны быть на каждом языке из `locales`.
 *
 * @param {unknown} releases
 * @param {{ icons?: string[], locales?: string[] }} [options] Допустимые имена иконок, без списка
 *   не проверяются; языки, на которых обязана быть каждая видимая запись.
 * @returns {string[]}
 */
export function releaseErrors(releases, { icons, locales = [] } = {}) {
	if (!Array.isArray(releases)) return ['the changelog must be an array of releases']

	const errors = []
	const seen = new Set()

	for (const [i, r] of releases.entries()) {
		const at = typeof r?.version === 'string' ? r.version : `#${i}`

		if (!/^\d+\.\d+\.\d+$/.test(r?.version ?? '')) errors.push(`${at}: version must look like 1.2.3`)
		else if (seen.has(r.version)) errors.push(`${at}: the version is listed twice`)

		seen.add(r?.version)

		if (r?.hidden === true) continue

		const dated = /^\d{4}-\d{2}-\d{2}$/.test(r?.date ?? '')

		if (!dated) errors.push(`${at}: date must look like 2026-10-18`)

		for (const [lang, title] of variants(r?.title)) {
			if (typeof title !== 'string' || !title.trim())
				errors.push(`${at}: title${lang ? `.${lang}` : ''} is empty`)
		}

		for (const [lang, items] of variants(r?.items)) {
			if (
				!Array.isArray(items) ||
				!items.length ||
				items.some((item) => typeof item !== 'string' || !item.trim())
			)
				errors.push(`${at}: items${lang ? `.${lang}` : ''} must be a non-empty list of strings`)
		}

		for (const field of ['title', 'items']) {
			if (!isLocalized(r?.[field])) continue

			for (const lang of locales.filter((l) => !(l in r[field])))
				errors.push(`${at}: ${field} has no ${lang} version`)
		}

		if (r?.icon !== undefined && (typeof r.icon !== 'string' || (icons && !icons.includes(r.icon))))
			errors.push(`${at}: unknown icon ${JSON.stringify(r.icon)}`)

		const next = releases.slice(i + 1).find((n) => n?.hidden !== true)

		if (dated && next && /^\d{4}-\d{2}-\d{2}$/.test(next.date ?? '') && r.date < next.date)
			errors.push(`${at}: is older than ${next.version}, newer releases go first`)
	}

	return errors
}
