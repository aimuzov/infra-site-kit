const layers = []

export function escapeClose(node, close) {
	const layer = { node, close }
	layers.push(layer)
	return {
		update(next) {
			layer.close = next
		},
		destroy() {
			const index = layers.indexOf(layer)
			if (index !== -1) layers.splice(index, 1)
		},
	}
}

export function closeEscapeLayer() {
	const layer = layers.findLast(
		(item) =>
			item.node.isConnected &&
			!layers.some((other) => other !== item && other.node.isConnected && item.node.contains(other.node)),
	)
	if (!layer) return false
	layer.close()
	return true
}

export function watchEscape(
	back,
	{
		enabled = () => true,
		ignoreEditable = true,
		overlaySelector = 'dialog[open], [popover="auto"]:popover-open, [popover=""]:popover-open',
	} = {},
) {
	const onKey = (event) => {
		if (
			event.key !== 'Escape' ||
			event.repeat ||
			event.defaultPrevented ||
			event.isComposing ||
			event.ctrlKey ||
			event.altKey ||
			event.metaKey ||
			event.shiftKey ||
			!enabled()
		)
			return
		if (document.querySelector(overlaySelector)) return
		const target = event.composedPath()[0]
		if (
			ignoreEditable &&
			target instanceof Element &&
			(target.closest('input, textarea, select') || target.isContentEditable)
		)
			return
		event.preventDefault()
		if (!closeEscapeLayer()) back()
	}
	window.addEventListener('keydown', onKey)
	return () => window.removeEventListener('keydown', onKey)
}

export function goBack(fallback = '/') {
	const previous = window.navigation?.currentEntry
	const hasPrevious = previous
		? previous.index > 0
		: Boolean(document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1)
	if (hasPrevious) history.back()
	else if (new URL(fallback, location.href).href !== location.href) location.replace(fallback)
}
