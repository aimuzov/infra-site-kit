/**
 * Текущий раздел страницы при скролле: по нему оглавление подсвечивает пункт.
 * Текущий -- последний раздел, чей заголовок уже поднялся до линии, выше первого
 * заголовка текущего нет.
 *
 * Линия по умолчанию -- на трети видимой высоты: к этому времени читают уже
 * текст раздела. Под шапкой короткий последний раздел не загорелся бы совсем,
 * страница кончается раньше.
 */

/**
 * Видимая область прокрутки в координатах окна.
 * @typedef {{ top: number, height: number }} Viewport
 */

/**
 * @typedef {object} SectionOptions
 * @property {(viewport: Viewport) => number} [line] Линия в координатах окна, как
 * `getBoundingClientRect().top`.
 * @property {Window | HTMLElement} [scroller] Контейнер со своей прокруткой, по умолчанию окно.
 */

/** @param {Viewport} viewport */
const third = ({ top, height }) => top + height / 3

/**
 * Окно, в том числе окно фрейма: у элемента `innerHeight` нет.
 * @param {Window | HTMLElement} scroller
 * @returns {scroller is Window}
 */
const isWindow = (scroller) => 'innerHeight' in scroller

/**
 * @param {Window | HTMLElement} scroller
 * @returns {Viewport}
 */
function viewportOf(scroller) {
	if (isWindow(scroller)) return { top: 0, height: scroller.innerHeight }

	// Видимая область контейнера начинается под его рамкой.
	return { top: scroller.getBoundingClientRect().top + scroller.clientTop, height: scroller.clientHeight }
}

/**
 * @template {Element} T
 * @param {T[]} headings
 * @param {SectionOptions} options
 */
function measure(headings, { line = third, scroller = globalThis }) {
	const y = line(viewportOf(scroller))

	return headings.findLast((heading) => heading.getBoundingClientRect().top <= y) ?? null
}

/**
 * Текущий раздел разовым замером, например чтобы открыть другую страницу на том же месте.
 * @template {Element} T
 * @param {Iterable<T>} headings Заголовки в порядке документа.
 * @param {SectionOptions} [options]
 * @returns {T | null}
 */
export function currentSection(headings, options = {}) {
	return measure([...headings], options)
}

/**
 * Следит за текущим разделом: зовёт `callback` с его заголовком в ближайшем
 * кадре и потом при каждой смене. Замер -- раз в кадр, сколько бы событий
 * скролла ни пришло между кадрами.
 * @template {Element} T
 * @param {Iterable<T>} headings Заголовки в порядке документа.
 * @param {(heading: T | null) => void} callback
 * @param {SectionOptions} [options]
 * @returns {() => void} Отписка.
 */
export function watchSection(headings, callback, options = {}) {
	const list = [...headings]
	const target = options.scroller ?? globalThis
	// Ресайз приходит окну, даже когда прокручивается контейнер.
	const view = isWindow(target) ? target : globalThis
	/** @type {T | null | undefined} */
	let current
	let frame = 0

	const update = () => {
		frame = 0

		const heading = measure(list, options)

		if (heading === current) return

		current = heading
		callback(heading)
	}
	const schedule = () => {
		frame ||= requestAnimationFrame(update)
	}

	target.addEventListener('scroll', schedule, { passive: true })
	// Без скролла раздел меняется, когда текст перетекает под новую ширину.
	view.addEventListener('resize', schedule)
	// Первый замер тоже в кадре: скрипт мог запуститься, пока статья скрыта
	// и у заголовков нет места на странице. Подсветка всё равно попадает
	// в ту же отрисовку, что и при замере сразу.
	schedule()

	return () => {
		cancelAnimationFrame(frame)
		target.removeEventListener('scroll', schedule)
		view.removeEventListener('resize', schedule)
	}
}
