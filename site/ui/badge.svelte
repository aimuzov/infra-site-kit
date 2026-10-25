<script>
	/**
	 * @typedef {object} Props
	 * @property {boolean} [mono] Моноширинная плашка под номер или код.
	 * @property {import('svelte').Snippet} children
	 */

	/** @type {Props} */
	let { mono = false, children } = $props()
</script>

<span class={['badge', mono && 'badge--mono']}>{@render children()}</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		padding: 0 0.5rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.25rem;
		color: var(--ui-hover-fg);
		background: var(--ui-selected-soft);

		&.badge--mono {
			border-radius: 0.375rem;
			font-family: var(--ui-font-mono);
			font-size: 0.7rem;
			color: var(--ui-muted);
			background: var(--ui-surface);
		}
	}
</style>
