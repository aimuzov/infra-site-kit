<script>
	/**
	 * @typedef {import('svelte/elements').HTMLInputAttributes & {
	 *   value?: string
	 *   code?: boolean
	 * }} Props
	 */

	/** @type {Props} */
	let { value = $bindable(''), code = false, ...rest } = $props()
</script>

<input class={['input', code && 'input--code']} bind:value {...rest} />

<style>
	.input {
		width: 100%;
		min-width: 0;
		height: var(--ui-input-height);
		padding-inline: 0.75rem;
		border: 1px solid var(--ui-input-border);
		border-radius: var(--ui-input-radius);
		font: inherit;
		font-size: 1rem;
		color: inherit;
		background: var(--ui-input-bg);
		outline: none;
		transition: box-shadow 150ms;

		@media (prefers-reduced-motion: reduce) {
			transition: none;
		}

		&::placeholder {
			color: var(--ui-muted);
		}

		&:focus-visible {
			border-color: var(--ui-focus);
			box-shadow: 0 0 0 3px var(--ui-ring);
		}

		/* Моноширинный крупный ввод: коды, номера, ключи. */
		&.input--code {
			font-family: var(--ui-font-mono);
			font-size: 1.25rem;
			text-align: center;
			text-transform: uppercase;
			letter-spacing: 0.3em;
		}
	}
</style>
