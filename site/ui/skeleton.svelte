<script>
	/**
	 * @typedef {object} Props
	 * @property {string} [width] Любая длина CSS: заготовка строки обычно короче настоящего текста.
	 * @property {string} [height]
	 * @property {boolean} [round] Кружок вместо полоски, под иконку или бейдж шага.
	 */

	/** @type {Props} */
	let { width, height, round = false } = $props()

	/** @type {HTMLSpanElement} */
	let node

	// Директива style: на сборке пишет атрибут, а его режет строгая CSP.
	// Поэтому размер ставим в браузере, до этого он из CSS.
	$effect(() => {
		node.style.width = width ?? ''
		node.style.height = height ?? ''
	})
</script>

<!-- Заготовка на месте данных, которые ещё едут с сервера. Для читалок молчит:
     ожидание объявляет роль status у контейнера. -->
<span bind:this={node} class={['skeleton', round && 'skeleton--round']} aria-hidden="true"></span>

<style>
	.skeleton {
		display: block;
		flex-shrink: 0;
		width: 100%;
		height: 0.875rem;
		border-radius: 0.375rem;
		background: color-mix(in srgb, var(--ui-fg) 8%, transparent);
		animation: pulse 1.4s ease-in-out infinite;

		@media (prefers-reduced-motion: reduce) {
			animation: none;
		}

		&.skeleton--round {
			border-radius: 50%;
		}
	}

	@keyframes pulse {
		50% {
			opacity: 0.45;
		}
	}
</style>
