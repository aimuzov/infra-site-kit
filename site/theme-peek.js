/**
 * Подглядывание за другой темой из переключателя темы: при наведении на кнопку вокруг неё
 * раскрывается круг на треть экрана. Внутри круга страница нарисована в другой схеме: это копия страницы, положенная поверх,
 * а клик гасит круг до следующего наведения.
 */

/** @typedef {'light' | 'dark'} Scheme */

/** Доля экрана, которую закрывает раскрытый круг. */
const COVER = 0.33
/** На сколько раскрытый круг вырастает на вдохе. */
const PULSE = 1.05

/**
 * Что кадр читает со страницы до того как что-то в неё пишет: центры кнопок и их целевые
 * схемы, вьюпорт и текущую схему. Чтение после записи заставило бы браузер заново
 * раскладывать страницу на каждую кнопку.
 * @typedef {object} View
 * @property {Scheme} current
 * @property {number} width
 * @property {number} height
 * @property {Map<HTMLElement, { x: number, y: number, scheme: Scheme | undefined }>} spots
 */

/**
 * Круги на странице. У переключателя с кнопкой на каждую тему их несколько рядом.
 * @type {Map<HTMLElement, { target: (current: Scheme) => Scheme | undefined, hovered: boolean, render: (view: View) => void, settle: (event: TransitionEvent) => void }>}
 */
const peeks = new Map()
/** После клика все круги погашены, пока указатель снова не зайдёт на одну из кнопок. */
let dismissed = false
/** Уже запрошенный кадр: события между двумя кадрами отрисовываются один раз. */
let frame = 0

function schedule() {
	frame ||= requestAnimationFrame(renderAll)
}

function renderAll() {
	frame = 0

	const current = currentScheme()
	/** @type {View['spots']} */
	const spots = new Map()

	for (const [anchor, { target }] of peeks) {
		const rect = anchor.getBoundingClientRect()

		spots.set(anchor, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, scheme: target(current) })
	}

	const view = { current, width: document.documentElement.clientWidth, height: innerHeight, spots }

	for (const { render } of peeks.values()) render(view)
}

/**
 * Схема, в которой страница нарисована сейчас. Сайт может хранить выбор в атрибуте или
 * в классе, но так или иначе он попадает в `color-scheme` корня, а `light dark` значит,
 * что решает система.
 * @returns {Scheme}
 */
export function currentScheme() {
	const value = getComputedStyle(document.documentElement).colorScheme
	const light = /\blight\b/.test(value)
	const dark = /\bdark\b/.test(value)

	if (light !== dark) return dark ? 'dark' : 'light'

	return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Площадь той части круга, что попадает на экран: сумма хорд по столбцам пикселей.
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {number} width
 * @param {number} height
 */
function visibleArea(cx, cy, r, width, height) {
	let area = 0

	for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(width, cx + r); x++) {
		const half = Math.sqrt(Math.max(0, r * r - (x + 0.5 - cx) ** 2))

		area += Math.max(0, Math.min(height, cy + half) - Math.max(0, cy - half))
	}

	return area
}

/**
 * Радиус, при котором круг с центром в (cx, cy) закрывает долю `share` экрана width × height.
 * Кнопка стоит у края и большая часть круга уходит за экран, поэтому формулы нет,
 * радиус ищется делением пополам.
 * @param {number} cx
 * @param {number} cy
 * @param {number} width
 * @param {number} height
 * @param {number} [share]
 */
export function coverRadius(cx, cy, width, height, share = COVER) {
	const target = width * height * share
	let low = 0
	let high = Math.hypot(width, height) * 2

	for (let i = 0; i < 24; i++) {
		const mid = (low + high) / 2

		if (visibleArea(cx, cy, mid, width, height) < target) low = mid
		else high = mid
	}

	return high
}

/**
 * `cloneNode` не переносит ни то, что введено в поля, ни прокрутку контейнеров, без этого
 * копия показала бы пустую форму и списки, отмотанные к началу.
 * Прокрутка применяется только когда копия уже в документе.
 * @param {Element} from
 * @param {Element} to
 */
function copyState(from, to) {
	const source = from.querySelectorAll('*')
	const target = to.querySelectorAll('*')

	source.forEach((node, i) => {
		const twin = target[i]

		if (!twin) return

		if (node.scrollTop || node.scrollLeft) twin.scrollTo(node.scrollLeft, node.scrollTop)

		if (node instanceof HTMLInputElement && twin instanceof HTMLInputElement) twin.checked = node.checked

		if ('value' in node && 'value' in twin && node.matches('input, textarea, select')) twin.value = node.value
	})
}

/**
 * Копирует страницу без скриптов и без копий всех кругов, включая собственную,
 * и красит её в `scheme`.
 * `color-scheme` переключает цвета из `light-dark()`, а класс `light`/`dark` нужен сайтам,
 * которые переключают свои токены классом.
 * @param {HTMLElement} copy
 * @param {Scheme} scheme
 */
function fill(copy, scheme) {
	const pairs = [...document.body.children]
		.filter((child) => !child.classList.contains('theme-peek') && child.tagName !== 'SCRIPT')
		.map((child) => [child, /** @type {Element} */ (child.cloneNode(true))])

	copy.replaceChildren(...pairs.map(([, twin]) => twin))
	copy.style.colorScheme = scheme
	copy.classList.toggle('light', scheme === 'light')
	copy.classList.toggle('dark', scheme === 'dark')
	copy.dataset.scheme = scheme

	for (const [node, twin] of pairs) copyState(node, twin)
}

/** @param {TransitionEvent} event */
function onTransitionEnd(event) {
	for (const { settle } of peeks.values()) settle(event)
}

/** Слушатели страницы общие для всех кругов: включены, пока есть хотя бы один. */
function listen() {
	addEventListener('scroll', schedule, { passive: true })
	addEventListener('resize', schedule)
	addEventListener('transitionend', onTransitionEnd)
}

function unlisten() {
	removeEventListener('scroll', schedule)
	removeEventListener('resize', schedule)
	removeEventListener('transitionend', onTransitionEnd)
	cancelAnimationFrame(frame)
	frame = 0
}

/**
 * Цепляет круг к кнопке темы. Как есть работает и как Svelte attachment:
 * `{@attach themePeek}`. Возвращает функцию очистки.
 * @param {HTMLElement} anchor
 * @param {{ target?: (current: Scheme) => Scheme | undefined }} [options]
 * `target` -- схема, которую показывает круг, по умолчанию противоположная текущей. Если она
 * совпадает с текущей, то показывать нечего и круг остаётся скрытым.
 * @returns {(() => void) | undefined}
 */
export function themePeek(anchor, { target = (current) => (current === 'dark' ? 'light' : 'dark') } = {}) {
	// Без мыши наводить нечем, а reduced motion просит обойтись без круга.
	if (!matchMedia('(hover: hover)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return

	/** @type {HTMLElement | undefined} */
	let peek
	/** Радиус раскрытого круга для последних центра и вьюпорта, меняется только при скролле и ресайзе. */
	let open = { key: '', r: 0 }

	const entry = { target, hovered: false, render, settle }

	/**
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} width
	 * @param {number} height
	 */
	function openRadius(cx, cy, width, height) {
		const key = `${cx} ${cy} ${width} ${height}`

		if (open.key !== key) open = { key, r: coverRadius(cx, cy, width, height) }

		return open.r
	}

	/**
	 * Круг есть, только пока на кнопку навели и её схема отличается от текущей.
	 * @param {View} view
	 * @param {{ x: number, y: number, scheme: Scheme | undefined }} spot
	 */
	function shape(view, { x, y, scheme }) {
		if (dismissed || !entry.hovered || !scheme || scheme === view.current) return { r: 0, opacity: 0 }

		return { r: openRadius(x, y, view.width, view.height), opacity: 1 }
	}

	/** @param {View} view */
	function render(view) {
		const spot = view.spots.get(anchor)

		if (!spot) return

		const { r, opacity } = shape(view, spot)

		if (!r && !peek) return

		if (!peek) {
			peek = document.createElement('div')
			peek.className = 'theme-peek'
			peek.inert = true
			peek.ariaHidden = 'true'
			document.body.append(peek)
		}

		// Сжимающийся круг остаётся со старой копией, свежая снимается только для растущего.
		if (r && spot.scheme && peek.dataset.scheme !== spot.scheme) {
			const first = !peek.dataset.scheme

			fill(peek, spot.scheme)

			// Первый кадр с нулевым кругом, иначе transition не от чего расти.
			if (first) peek.getBoundingClientRect()
		}

		// Копия скроллится вместе со страницей, поэтому центр в координатах документа.
		peek.style.setProperty('--peek-x', `${spot.x + scrollX}px`)
		peek.style.setProperty('--peek-y', `${spot.y + scrollY}px`)
		peek.style.setProperty('--peek-r', `${r}px`)
		peek.style.opacity = String(opacity)
		peek.classList.toggle('theme-peek--open', entry.hovered && r > 0)
		aim(entry.hovered && r > 0 ? { x: spot.x + scrollX, y: spot.y + scrollY, r } : undefined)
	}

	/**
	 * Раскрытый круг дышит. Дыхание -- анимация clip-path с готовыми пикселями, её Chrome
	 * отдаёт композитору. Но только если по clip-path больше ничего не идёт, иначе она
	 * до конца остаётся на основном потоке и перерисовывает копию каждый кадр. Поэтому
	 * вдох начинается не по таймеру, а когда закончилось раскрытие.
	 * @type {{ x: number, y: number, r: number } | undefined}
	 */
	let breath
	/** @type {Animation | undefined} */
	let pulse

	/** @param {{ x: number, y: number, r: number } | undefined} next */
	function aim(next) {
		if (breath && next && breath.x === next.x && breath.y === next.y && breath.r === next.r) return

		breath = next
		pulse?.cancel()
		pulse = undefined
	}

	function breathe() {
		if (!breath || pulse || typeof peek?.animate !== 'function') return

		const { x, y, r } = breath
		const at = `at ${x}px ${y}px`

		pulse = peek.animate([{ clipPath: `circle(${r}px ${at})` }, { clipPath: `circle(${r * PULSE}px ${at})` }], {
			duration: 1400,
			iterations: Infinity,
			direction: 'alternate',
			easing: 'ease-in-out',
		})
	}

	/** @param {TransitionEvent} event */
	function settle(event) {
		if (!peek || event.target !== peek || event.propertyName !== 'clip-path') return

		if (peek.style.getPropertyValue('--peek-r') !== '0px') {
			breathe()

			return
		}

		aim(undefined)
		peek.remove()
		peek = undefined
	}

	function onEnter() {
		entry.hovered = true
		dismissed = false
		schedule()
	}

	function onLeave() {
		entry.hovered = false
		schedule()
	}

	// Выбор сделан: круг своё отработал и гаснет.
	function onClick() {
		dismissed = true
		schedule()
	}

	if (!peeks.size) listen()

	peeks.set(anchor, entry)
	anchor.addEventListener('pointerenter', onEnter)
	anchor.addEventListener('pointerleave', onLeave)
	anchor.addEventListener('click', onClick)

	return () => {
		peeks.delete(anchor)

		if (!peeks.size) unlisten()

		anchor.removeEventListener('pointerenter', onEnter)
		anchor.removeEventListener('pointerleave', onLeave)
		anchor.removeEventListener('click', onClick)
		aim(undefined)
		peek?.remove()
	}
}
