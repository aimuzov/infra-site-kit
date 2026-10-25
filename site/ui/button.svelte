<script>
	/**
	 * @typedef {import('svelte/elements').HTMLButtonAttributes & {
	 *   variant?: 'primary' | 'outline' | 'ghost' | 'danger'
	 *   size?: 'sm' | 'md' | 'lg' | 'xl'
	 *   wide?: boolean
	 *   children: import('svelte').Snippet
	 * }} Props
	 */

	/** @type {Props} */
	let { variant = 'primary', size = 'md', wide = false, type = 'button', children, ...rest } = $props()
</script>

<button {type} class={['button', `button--${variant}`, `button--${size}`, wide && 'button--wide']} {...rest}>
	{@render children()}
</button>

<style>
	.button {
		cursor: pointer;
		display: inline-flex;
		flex-shrink: 0;
		gap: 0.5rem;
		align-items: center;
		justify-content: center;
		height: 2.25rem;
		padding: 0 0.875rem;
		border: 1px solid transparent;
		border-radius: var(--ui-radius-sm);
		font: inherit;
		font-weight: 500;
		color: inherit;
		white-space: nowrap;
		transition:
			background-color 0.15s,
			border-color 0.15s,
			box-shadow 0.15s,
			opacity 0.15s;

		@media (prefers-reduced-motion: reduce) {
			transition: none;
		}

		&:active:not(:disabled) {
			translate: 0 0.5px;
		}

		&:focus-visible {
			outline: none;
			box-shadow: 0 0 0 3px var(--ui-ring);
		}

		&:disabled {
			cursor: default;
			opacity: 0.5;
		}

		&.button--primary {
			color: var(--ui-primary-fg);
			background: var(--ui-primary);

			&:hover:not(:disabled) {
				background: color-mix(in srgb, var(--ui-primary) 88%, black);
			}
		}

		&.button--outline {
			border-color: var(--ui-border);
			background: var(--ui-bg);
			box-shadow: var(--ui-shadow-sm);

			&:hover:not(:disabled) {
				background: var(--ui-surface);
			}
		}

		&.button--ghost {
			background: transparent;

			&:hover:not(:disabled) {
				background: var(--ui-surface);
			}
		}

		/* Необратимое действие: красная рамка, а не заливка, главную кнопку не перебивает. */
		&.button--danger {
			border-color: color-mix(in oklch, var(--ui-danger) 45%, transparent);
			color: var(--ui-danger);
			background: var(--ui-bg);

			&:hover:not(:disabled) {
				background: var(--ui-danger-bg);
			}
		}

		&.button--sm {
			height: 2rem;
			padding: 0 0.75rem;
			font-size: 0.875rem;
		}

		&.button--lg {
			height: 2.5rem;
			padding: 0 1rem;
		}

		&.button--xl {
			height: 2.75rem;
			padding: 0 1.5rem;
		}

		/* Во всю ширину строки, содержимое разносится по краям. */
		&.button--wide {
			justify-content: space-between;
			width: 100%;
		}
	}
</style>
