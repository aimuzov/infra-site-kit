<script>
	import FolderOpen from '@lucide/svelte/icons/folder-open'
	import Upload from '@lucide/svelte/icons/upload'

	import { rejectFile } from './files.js'

	/**
	 * @typedef {object} Props
	 * @property {(file: File) => void} onfile Файл прошёл проверку типа и размера.
	 * @property {string} [accept] Как у `<input type="file">`: `.zip,.xml`, `application/json`.
	 * @property {number} [maxSize] Предел в байтах.
	 * @property {boolean} [disabled]
	 * @property {string} [title]
	 * @property {string} [note] Что за файл нужен: формат, откуда взять.
	 * @property {string} [button] Подпись кнопки.
	 * @property {string} [label] Озвучка зоны, когда заголовок не говорит, что загружаем.
	 * @property {string | null} [error] Ошибка снаружи, например, от сервера.
	 * @property {'md' | 'lg'} [size] `lg` -- зона главного действия страницы, во всю высоту экрана.
	 * @property {import('svelte').Snippet} [children] Что-то под кнопкой: подсказка, ссылка на пример.
	 */

	/** @type {Props} */
	let {
		onfile,
		accept = '',
		maxSize,
		disabled = false,
		title = 'Перетащите файл сюда',
		note,
		button = 'Выбрать файл',
		label,
		error = null,
		size = 'md',
		children,
	} = $props()

	let over = $state(false)

	/** Своя ошибка проверки: файл не того типа или больше предела. */
	let rejected = $state(/** @type {string | null} */ (null))

	/** @type {HTMLInputElement} */
	let picker

	const shown = $derived(error ?? rejected)
	const id = $props.id()

	/** Открывает диалог выбора: им пользуется и кнопка «Заменить» рядом с итогом. */
	export function pick() {
		if (!disabled) picker.click()
	}

	/** @param {File | null | undefined} file */
	function take(file) {
		if (!file || disabled) return

		rejected = rejectFile(file, { accept, maxSize })

		if (!rejected) onfile(file)
	}
</script>

<input
	bind:this={picker}
	type="file"
	{accept}
	hidden
	onchange={(event) => {
		take(event.currentTarget.files?.[0])
		event.currentTarget.value = ''
	}}
/>

<div
	class={['dropzone', `dropzone--${size}`, over && 'dropzone--over', disabled && 'dropzone--disabled', shown && 'dropzone--error']}
	role="button"
	tabindex={disabled ? -1 : 0}
	aria-label={label}
	aria-disabled={disabled}
	aria-describedby={shown ? `${id}-error` : undefined}
	onclick={pick}
	onkeydown={(event) => {
		if (event.key !== 'Enter' && event.key !== ' ') return

		event.preventDefault()
		pick()
	}}
	ondragover={(event) => {
		event.preventDefault()

		if (!disabled) over = true
	}}
	ondragleave={(event) => {
		// Переход на вложенный элемент тоже даёт dragleave, без проверки подсветка мигала бы.
		if (!event.currentTarget.contains(/** @type {Node | null} */ (event.relatedTarget))) over = false
	}}
	ondrop={(event) => {
		event.preventDefault()
		over = false
		take(event.dataTransfer?.files[0])
	}}
>
	<span class="dropzone__icon"><Upload size={22} /></span>
	<p class="dropzone__title">{title}</p>
	{#if note}<p class="dropzone__note">{note}</p>{/if}
	<!-- Не кнопка, а её вид: щелчок по всей зоне делает то же самое. -->
	<span class="dropzone__button"><FolderOpen size={18} />{button}</span>
	{#if shown}<p class="dropzone__error" id="{id}-error" role="alert">{shown}</p>{/if}
	{@render children?.()}
</div>

<style>
	.dropzone {
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		border: 1.5px dashed var(--ui-border-strong);
		border-radius: var(--ui-radius);
		text-align: center;
		background: var(--ui-bg);
		transition:
			background-color 0.15s,
			border-color 0.15s;

		@media (prefers-reduced-motion: reduce) {
			transition: none;
		}

		&.dropzone--lg {
			min-height: 20rem;
			padding: 3.5rem 1.5rem;
		}

		&:hover,
		&.dropzone--over {
			border-color: color-mix(in srgb, var(--ui-hover-fg) 45%, transparent);
			background: var(--ui-hover-bg);
		}

		&:focus-visible {
			border-color: var(--ui-focus);
			outline: none;
			box-shadow: 0 0 0 3px var(--ui-ring);
		}

		&.dropzone--error {
			border-color: color-mix(in oklch, var(--ui-danger) 55%, transparent);
		}

		&.dropzone--disabled {
			cursor: default;
			opacity: 0.5;

			&:hover {
				border-color: var(--ui-border-strong);
				background: var(--ui-bg);
			}
		}

		& .dropzone__icon {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 3.5rem;
			height: 3.5rem;
			margin-bottom: 0.75rem;
			border-radius: var(--ui-radius);
			color: var(--ui-accent);
			background: var(--ui-accent-soft);
		}

		& .dropzone__title {
			margin: 0;
			font-size: 1rem;
			font-weight: 500;
		}

		& .dropzone__note {
			margin: 0;
			color: var(--ui-muted);
		}

		& .dropzone__button {
			display: inline-flex;
			gap: 0.5rem;
			align-items: center;
			height: 2.75rem;
			margin-top: 1.25rem;
			padding: 0 1.5rem;
			border-radius: var(--ui-radius-sm);
			font-weight: 500;
			color: var(--ui-primary-fg);
			background: var(--ui-primary);
		}

		&:hover .dropzone__button {
			background: color-mix(in srgb, var(--ui-primary) 88%, black);
		}

		&.dropzone--disabled:hover .dropzone__button {
			background: var(--ui-primary);
		}

		& .dropzone__error {
			margin: 0;
			font-size: 0.875rem;
			color: var(--ui-danger);
		}
	}
</style>
