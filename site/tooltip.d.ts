export interface TooltipState {
	anchor: HTMLElement
	text: string
	point: { x: number; y: number }
}
/**
 * show меняет DOM синхронно; ожидание выносится в prepare, чтобы отменённый
 * показ не открыл подсказку после ухода с элемента или уничтожения наблюдателя.
 * Семантику и ARIA задаёт приложение.
 */
export interface TooltipOptions {
	document?: Document
	selector: string
	content: (anchor: HTMLElement) => string | null | undefined
	show: (state: TooltipState) => void
	hide: (state: TooltipState) => void
	move?: (state: TooltipState) => void
	prepare?: (state: TooltipState, signal: AbortSignal) => void | Promise<void>
	attributes?: string[]
	delay?: number
	pointerTypes?: string[]
	followPointer?: boolean
	focusVisibleOnly?: boolean
	ignoreUnrelatedPointer?: boolean
	keydown?: 'all' | 'escape'
	scroll?: 'hide' | 'move'
	resize?: 'hide' | 'move'
}
export interface TooltipPositionOptions {
	point: { x: number; y: number }
	width: number
	height: number
	viewportWidth: number
	margin?: number
	gap?: number
	flip?: boolean
	bottom?: number
	topMargin?: number
}
export function positionTooltip(options: TooltipPositionOptions): { x: number; y: number; side: 'top' | 'bottom' }
export function watchTooltip(options: TooltipOptions): () => void
