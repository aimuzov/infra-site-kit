<script>
	import InfoTip from './info-tip.svelte'

	/**
	 * @typedef {object} Props
	 * @property {string} [title]
	 * @property {import('svelte').Component<{ size?: number, class?: string }>} [icon] Иконка
	 *   lucide перед заголовком: по ней блок узнаётся быстрее, чем по тексту.
	 * @property {string} [info] Пояснение за значком «?» у заголовка: справка, нужная не всем.
	 * @property {import('svelte').Snippet} [action] Действие справа от заголовка, обычно ChipButton.
	 * @property {'stack' | 'row'} [layout] Содержимое стопкой или строкой «подпись -- контрол».
	 * @property {'default' | 'danger'} [tone] `danger` -- блок с необратимыми действиями.
	 * @property {import('svelte').Snippet} children
	 */

	/** @type {Props} */
	let { title, icon: Icon, info, action, layout = 'stack', tone = 'default', children } = $props()
</script>

<section class={['card', `card--${layout}`, tone === 'danger' && 'card--danger']}>
	{#if title}
		<h2 class="card__title">
			{#if Icon}<Icon class="card__icon" size={16} />{/if}
			<span class="card__text">{title}</span>
			{#if info}<InfoTip text={info} />{/if}
			{#if action}<span class="card__action">{@render action()}</span>{/if}
		</h2>
	{/if}
	{@render children()}
</section>

<style>
	.card {
		display: flex;
		gap: var(--ui-card-gap);
		padding: var(--ui-card-padding);
		border: var(--ui-card-border);
		border-radius: var(--ui-card-radius);
		color: var(--ui-card-fg);
		background: var(--ui-card-bg);
		box-shadow: var(--ui-card-shadow);

		@media (width < 600px) {
			padding: var(--ui-card-padding-narrow);
		}

		&.card--stack {
			flex-direction: column;
		}

		&.card--row {
			align-items: center;
			justify-content: space-between;
		}

		&.card--danger {
			border-color: color-mix(in oklch, var(--ui-danger) 35%, transparent);
		}

		& .card__title {
			display: flex;
			flex-wrap: wrap;
			gap: 0.25rem;
			align-items: center;
			min-height: 1.5rem;
			margin: 0;
			font-size: 0.9375rem;
			font-weight: 600;
			letter-spacing: -0.01em;

			/* Слова не рвём: в тесноте правая часть шапки уходит строкой ниже. Рвём только
			   слово длиннее строки, вроде имени файла. */
			:global(.card__text) {
				min-width: 0;
				overflow-wrap: break-word;
			}

			:global(.card__icon) {
				flex-shrink: 0;
				margin-right: 0.25rem;
				color: var(--ui-accent);
			}
		}

		& .card__action {
			display: inline-flex;
			gap: 0.25rem;
			align-items: center;
			margin-left: auto;
			font-size: 0.75rem;
			font-weight: 500;
			letter-spacing: normal;
		}
	}
</style>
