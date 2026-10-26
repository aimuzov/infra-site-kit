/** Цветовая схема страницы. */
export type Scheme = 'light' | 'dark'

/** Схема, в которой страница нарисована сейчас: по `color-scheme` корня или по системе. */
export function currentScheme(): Scheme

/**
 * Радиус, при котором круг с центром в (cx, cy) закрывает долю `share` экрана width × height.
 *
 * @param share - Доля экрана, по умолчанию треть.
 */
export function coverRadius(cx: number, cy: number, width: number, height: number, share?: number): number

/**
 * Цепляет круг к кнопке темы, как есть работает и как Svelte attachment.
 *
 * @returns Функцию очистки или ничего на тач-экранах и при reduced motion, где круга нет.
 */
export function themePeek(
	anchor: HTMLElement,
	options?: {
		/** Схема, которую показывает круг, по умолчанию противоположная текущей. */
		target?: (current: Scheme) => Scheme | undefined
	},
): (() => void) | undefined
