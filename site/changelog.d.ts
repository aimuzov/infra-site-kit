/** Текст на все языки сразу или по языкам: `{ ru, en }`. */
export type Localized<T> = T | Record<string, T>

/** Запись ченжлога, которую видит читатель. */
export type VisibleRelease = {
	version: string
	/** `YYYY-MM-DD`, как в CHANGELOG.md. */
	date: string
	title: Localized<string>
	/** Имя иконки: экспорт lucide-static (`Goal`) или своя иконка сайта. */
	icon?: string
	/** Пункты; ссылка внутри -- `[текст](/путь/)` или `[текст](https://…)`. */
	items: Localized<string[]>
	hidden?: false
}

/**
 * Релиз без заметных читателю изменений: на странице не показывается. `boolean`, а не `true`:
 * импорт JSON расширяет литерал. Запись с `false` и без полей ловит уже `releaseErrors`.
 */
export type HiddenRelease = {
	version: string
	hidden: boolean
}

/** Запись ченжлога для читателя: видимая или скрытая. */
export type Release = VisibleRelease | HiddenRelease

/** Пункт в HTML: текст экранирован, ссылки `[текст](/путь/)` становятся `<a>`. */
export function itemHtml(item: string): string

/** Пути всех ссылок пункта. */
export function itemLinks(item: string): string[]

/** "18 октября 2026" из `2026-10-18`. */
export function releaseDate(date: string, locale?: string): string

/** Якорь раздела релиза: `v1-12-0` из `1.12.0`. */
export function releaseId(version: string): string

/** Текст на языке страницы: нужный язык, без него русский, без русского первый. */
export function localized<T>(value: Localized<T>, lang?: string): T

/** Запись на языке страницы. */
export function localizeRelease(
	release: VisibleRelease,
	lang?: string,
): Omit<VisibleRelease, 'title' | 'items'> & { title: string; items: string[] }

/** Пункты записи на всех её языках. */
export function releaseItems(release: VisibleRelease): string[]

/** Записи без скрытых. */
export function visibleReleases<T extends { hidden?: boolean }>(releases: T[]): Exclude<T, { hidden: boolean }>[]

/** Ошибки формата записей; пустой массив -- всё в порядке. */
export function releaseErrors(releases: unknown, options?: { icons?: string[]; locales?: string[] }): string[]
