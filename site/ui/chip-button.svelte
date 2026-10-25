<script>
	/**
	 * @typedef {import('svelte/elements').HTMLButtonAttributes & { children: import('svelte').Snippet }} Props
	 */

	/** @type {Props} */
	let { type = 'button', children, ...rest } = $props()
</script>

<!--
	Маленькая кнопка рядом с итогом: «Изменить», «Заменить». Подложка -- полупрозрачный цвет
	текста, поэтому ложится и на карточку, и на цветную плашку.
-->
<button {type} class="chip" {...rest}>
	{@render children()}
</button>

<style>
	.chip {
		cursor: pointer;
		display: inline-flex;
		flex-shrink: 0;
		gap: 0.3125rem;
		align-items: center;
		height: 1.5rem;
		padding: 0 0.5rem;
		border: 1px solid color-mix(in oklch, var(--ui-fg) 10%, transparent);
		border-radius: 0.375rem;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--ui-fg);
		background: color-mix(in oklch, var(--ui-fg) 6%, transparent);
		transition:
			background-color 0.15s,
			border-color 0.15s,
			color 0.15s;

		@media (prefers-reduced-motion: reduce) {
			transition: none;
		}

		&:hover:not(:disabled) {
			border-color: var(--ui-hover-border);
			color: var(--ui-hover-fg);
			background: var(--ui-hover-bg);
		}

		&:focus-visible {
			outline: none;
			box-shadow: 0 0 0 3px var(--ui-ring);
		}

		&:disabled {
			cursor: default;
			opacity: 0.5;
		}
	}
</style>
