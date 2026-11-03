/** @param {import('./tooltip.d.ts').TooltipPositionOptions} options */
export function positionTooltip({
	point,
	width,
	height,
	viewportWidth,
	margin = 8,
	gap = 8,
	flip = false,
	bottom = point.y,
	topMargin = margin,
}) {
	const above = point.y - height - gap
	const side = flip && above < topMargin ? 'bottom' : 'top'
	return {
		x: Math.max(margin, Math.min(viewportWidth - width - margin, point.x - width / 2)),
		y: side === 'bottom' ? bottom + gap : Math.max(topMargin, above),
		side,
	}
}

/** @param {import('./tooltip.d.ts').TooltipOptions} options */
export function watchTooltip(options) {
	const doc = options.document ?? document
	const view = doc.defaultView
	if (!view) return () => {}
	/** @type {import('./tooltip.d.ts').TooltipState | null} */
	let current = null
	/** @type {number | undefined} */
	let timer
	/** @type {AbortController | undefined} */
	let pending
	let pressed = false
	let disposed = false
	/** @type {Array<() => void>} */
	const listeners = []
	const observer = new view.MutationObserver(() => {
		if (!current) return
		const text = options.content(current.anchor)
		if (!current.anchor.isConnected || !text) hide()
		else if (current.text !== text) {
			current = { ...current, text }
			if (!pending) options.show(current)
		}
	})
	/** @param {EventTarget | null} node */
	const find = (node) =>
		node instanceof view.Element ? /** @type {HTMLElement | null} */ (node.closest(options.selector)) : null
	const hide = () => {
		view.clearTimeout(timer)
		timer = undefined
		pending?.abort()
		pending = undefined
		observer.disconnect()
		if (current) options.hide(current)
		current = null
	}
	/** @param {AbortController} controller */
	const render = (controller) => {
		if (disposed || controller.signal.aborted || !current) return
		const text = options.content(current.anchor)
		if (!current.anchor.isConnected || !text) return hide()
		current = { ...current, text }
		pending = undefined
		options.show(current)
	}
	/**
	 * @param {HTMLElement | null} anchor
	 * @param {{ x: number, y: number }} point
	 * @param {boolean} delayed
	 */
	const open = (anchor, point, delayed) => {
		const text = anchor && options.content(anchor)
		if (disposed || pressed || !anchor?.isConnected || !text) return hide()
		if (current?.anchor === anchor && timer && !delayed) hide()
		if (current?.anchor === anchor) {
			current = { ...current, text, point }
			if (!pending && !timer) options.show(current)
			return
		}
		hide()
		current = { anchor, text, point }
		observer.observe(anchor, { attributes: true, attributeFilter: options.attributes })
		observer.observe(doc.documentElement, { childList: true, subtree: true })
		const controller = new view.AbortController()
		pending = controller
		const start = () => {
			timer = undefined
			if (controller.signal.aborted) return
			const prepare = options.prepare
			if (!prepare) return render(controller)
			Promise.resolve()
				.then(() => {
					if (!controller.signal.aborted && current) return prepare(current, controller.signal)
				})
				.then(
					() => render(controller),
					() => {
						if (pending === controller) hide()
					},
				)
		}
		if (delayed && options.delay) timer = view.setTimeout(start, options.delay)
		else start()
	}
	/** @param {PointerEvent} event */
	const pointer = (event) => {
		if (
			event.pointerType === 'touch' ||
			event.buttons ||
			pressed ||
			(options.pointerTypes && !options.pointerTypes.includes(event.pointerType))
		)
			return hide()
		const anchor = find(event.target)
		if (!anchor) {
			if (!options.ignoreUnrelatedPointer) hide()
			return
		}
		const rect = anchor.getBoundingClientRect()
		open(
			anchor,
			options.followPointer
				? { x: event.clientX, y: event.clientY }
				: { x: rect.left + rect.width / 2, y: rect.top },
			true,
		)
	}
	const release = () => {
		pressed = false
		hide()
	}
	const reposition = () => {
		if (!current || pending || timer) return
		if (!current.anchor.isConnected) return hide()
		options.move?.(current)
	}
	/**
	 * @template {keyof DocumentEventMap} K
	 * @param {Document | Window} target
	 * @param {K} type
	 * @param {(event: DocumentEventMap[K]) => void} callback
	 * @param {boolean} [capture]
	 */
	const listen = (target, type, callback, capture = false) => {
		const handler = /** @type {EventListener} */ (callback)
		target.addEventListener(type, handler, capture)
		listeners.push(() => target.removeEventListener(type, handler, capture))
	}
	listen(doc, 'pointerover', pointer)
	if (options.followPointer) listen(doc, 'pointermove', pointer)
	listen(doc, 'pointerout', (event) => {
		if (options.ignoreUnrelatedPointer && !find(event.target)) return
		if (current && !(event.relatedTarget instanceof view.Node && current.anchor.contains(event.relatedTarget)))
			hide()
	})
	listen(
		doc,
		'pointerdown',
		() => {
			pressed = true
			hide()
		},
		true,
	)
	for (const type of /** @type {const} */ (['pointerup', 'pointercancel', 'dragend']))
		listen(doc, type, release, true)
	for (const type of /** @type {const} */ (['dragstart', 'input'])) listen(doc, type, hide, true)
	listen(doc, 'focusin', (event) => {
		if (pressed) return
		const anchor = find(event.target)
		if (!anchor || (options.focusVisibleOnly && !anchor.matches(':focus-visible'))) return hide()
		const rect = anchor.getBoundingClientRect()
		open(anchor, { x: rect.left + rect.width / 2, y: rect.top }, false)
	})
	listen(doc, 'focusout', () =>
		queueMicrotask(() => {
			if (current && !current.anchor.contains(doc.activeElement)) hide()
		}),
	)
	listen(doc, 'keydown', (event) => {
		if (options.keydown !== 'escape' || event.key === 'Escape') hide()
	})
	listen(doc, 'scroll', options.scroll === 'move' ? reposition : hide, true)
	listen(view, 'resize', options.resize === 'move' ? reposition : hide)
	listen(view, 'blur', release)
	return () => {
		disposed = true
		hide()
		for (const remove of listeners) remove()
	}
}
