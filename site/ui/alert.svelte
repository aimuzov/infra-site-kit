<script>
	/**
	 * @typedef {object} Props
	 * @property {'warning' | 'danger'} [variant]
	 * @property {string} [title]
	 * @property {import('svelte').Snippet} [icon]
	 * @property {import('svelte').Snippet} children
	 */

	/** @type {Props} */
	let { variant = 'warning', title, icon, children } = $props()
</script>

<div class={['alert', `alert--${variant}`]} role={variant === 'danger' ? 'alert' : undefined}>
	{#if icon}
		<span class="alert__icon">{@render icon()}</span>
	{/if}
	<div class="alert__body">
		{#if title}
			<p class="alert__title">{title}</p>
		{/if}
		{@render children()}
	</div>
</div>

<style>
	.alert {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border: 1px solid color-mix(in oklch, var(--ui-warning) 25%, transparent);
		border-left: 3px solid var(--ui-warning);
		border-radius: var(--ui-radius-sm);
		background: var(--ui-warning-bg);

		&.alert--danger {
			border-color: color-mix(in oklch, var(--ui-danger) 25%, transparent);
			border-left-color: var(--ui-danger);
			color: var(--ui-danger);
			background: var(--ui-danger-bg);
		}

		& .alert__icon {
			display: flex;
			padding-top: 0.15rem;
			color: var(--ui-warning);
		}

		& .alert__body {
			display: flex;
			flex: 1;
			flex-direction: column;
			gap: 0.25rem;
			min-width: 0;
		}

		& .alert__title {
			margin: 0;
			font-weight: 600;
		}
	}
</style>
