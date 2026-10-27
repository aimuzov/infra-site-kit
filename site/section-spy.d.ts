/** Видимая область прокрутки в координатах окна: всё окно или свой контейнер. */
export type Viewport = { top: number; height: number }

export type SectionOptions = {
	/**
	 * Линия в координатах окна, как `getBoundingClientRect().top`: раздел текущий, когда верх
	 * его заголовка поднялся до неё. По умолчанию -- треть видимой высоты.
	 */
	line?: (viewport: Viewport) => number
	/** Контейнер со своей прокруткой, по умолчанию окно. */
	scroller?: Window | HTMLElement
}

/**
 * Текущий раздел разовым замером: последний заголовок, чей верх поднялся до линии.
 *
 * @param headings - Заголовки в порядке документа.
 * @returns Заголовок или `null` выше первого из них.
 */
export function currentSection<T extends Element>(headings: Iterable<T>, options?: SectionOptions): T | null

/**
 * Следит за текущим разделом: первый вызов в ближайшем кадре, дальше при каждой смене.
 *
 * @param headings - Заголовки в порядке документа.
 * @returns Отписку.
 */
export function watchSection<T extends Element>(
	headings: Iterable<T>,
	callback: (heading: T | null) => void,
	options?: SectionOptions,
): () => void
