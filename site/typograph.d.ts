export type TypographOptions = {
	thousandsSeparator?: '\u00a0' | '\u202f'
	/**
	 * В чате единицы и тире не склеиваются через перенос строки;
	 * точка-разделитель остаётся как есть.
	 */
	preserveLineBreaks?: boolean
	language?: string
}
export function typographText(text: string, options?: TypographOptions): string
export function typographHtml(html: string, options?: TypographOptions): string
