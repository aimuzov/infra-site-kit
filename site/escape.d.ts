export type EscapeOptions = {
	enabled?: () => boolean
	ignoreEditable?: boolean
	overlaySelector?: string
}

export function escapeClose(
	node: HTMLElement,
	close: () => void,
): {
	update(close: () => void): void
	destroy(): void
}
export function closeEscapeLayer(): boolean
export function watchEscape(back: () => void, options?: EscapeOptions): () => void
export function goBack(fallback?: string): void
