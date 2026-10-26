import type { Component, Snippet } from 'svelte'
import type { HTMLButtonAttributes, HTMLInputAttributes } from 'svelte/elements'

// Компоненты написаны на чистом JS, поэтому svelte-check на TypeScript-сайте видит их
// импорт как `any`. Эти декларации дают им пропсы, по одной на компонент.

/** Иконка lucide: компонент `@lucide/svelte/icons/<имя>`. */
export type Icon = Component<{ size?: number; class?: string }>

export type ButtonProps = HTMLButtonAttributes & {
	variant?: 'primary' | 'outline' | 'ghost' | 'danger'
	size?: 'sm' | 'md' | 'lg' | 'xl'
	/** Во всю ширину строки, содержимое разносится по краям. */
	wide?: boolean
	children: Snippet
}

export type ChipButtonProps = HTMLButtonAttributes & { children: Snippet }

export type CardProps = {
	title?: string
	/** Иконка lucide перед заголовком. */
	icon?: Icon
	/** Пояснение за значком «?» у заголовка. */
	info?: string
	/** Действие справа от заголовка, обычно ChipButton. */
	action?: Snippet
	/** Содержимое стопкой или строкой «подпись -- контрол». */
	layout?: 'stack' | 'row'
	/** `danger` -- блок с необратимыми действиями. */
	tone?: 'default' | 'danger'
	children: Snippet
}

export type BadgeProps = {
	/** Моноширинная плашка под номер или код. */
	mono?: boolean
	children: Snippet
}

export type AlertProps = {
	variant?: 'warning' | 'danger'
	title?: string
	icon?: Snippet
	children: Snippet
}

export type FieldProps = {
	/** Язык подписей компонента, по умолчанию `ru`. */
	locale?: string
	label: string
	/** id поля ввода: по клику на подпись фокус уходит в него. */
	for?: string
	/** Пояснение за значком «?» у подписи. */
	hint?: string
	/** Сколько колонок сетки занимает поле от 600px и шире. */
	span?: 2 | 3
	/** Обязательное поле пустое, и у подписи появляется точка. */
	missing?: boolean
	children: Snippet
}

export type InputProps = HTMLInputAttributes & {
	value?: string
	/** Моноширинный крупный ввод: коды, номера, ключи. */
	code?: boolean
}

export type SkeletonProps = {
	width?: string
	height?: string
	/** Кружок вместо полоски. */
	round?: boolean
}

export type CopyValueProps = {
	/** Язык подписей компонента, по умолчанию `ru`. */
	locale?: string
	value: string
	/** Подпись слева, подсказка и озвучка кнопки. */
	label?: string
}

export type InfoTipProps = {
	/** Язык подписей компонента, по умолчанию `ru`. */
	locale?: string
	text: string
	/** Озвучка кнопки, по умолчанию «Пояснение». */
	label?: string
}

export type DropzoneProps = {
	/** Язык подписей компонента, по умолчанию `ru`. */
	locale?: string
	/** Файл прошёл проверку типа и размера. */
	onfile: (file: File) => void
	/** Как у `<input type="file">`: `.zip,.xml`, `application/json`. */
	accept?: string
	/** Предел в байтах. */
	maxSize?: number
	disabled?: boolean
	title?: string
	/** Что за файл нужен: формат, откуда взять. */
	note?: string
	/** Подпись кнопки. */
	button?: string
	/** Озвучка зоны, когда заголовок не говорит, что загружаем. */
	label?: string
	/** Ошибка снаружи, например, от сервера. */
	error?: string | null
	/** `lg` -- зона главного действия страницы. */
	size?: 'md' | 'lg'
	children?: Snippet
}

export type DropzoneExports = {
	/** Открывает диалог выбора файла. */
	pick: () => void
}

export type LangSwitchProps = {
	/** Язык страницы. */
	locale: string
	/** Путь страницы, от него строятся адреса на других языках. */
	path: string
	/** Языки сайта, если их набор не общий. */
	locales?: readonly string[]
	/** Язык без префикса в адресе, если это не русский. */
	defaultLocale?: string
}

/**
 * Вызов из Astro: он передаёт компоненту props вместе с `client:*` первым аргументом,
 * а сигнатура `Component` из Svelte ждёт первым служебный аргумент.
 */
export type AstroComponent<Props> = (props: Props & { [directive: `client:${string}`]: unknown }) => unknown

export type ThemeToggleProps = {
	/** Язык подписи для экранных читалок. */
	locale?: string
	/** Своя подпись вместо общей. */
	label?: string
	/** Ключ выбора в localStorage, тот же, что у `ThemeBoot`. */
	key?: string
	/** Круг с другой темой вокруг кнопки. В выпадающем меню он мешает. */
	peek?: boolean
}
