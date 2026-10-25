<script>
	import CircleHelp from '@lucide/svelte/icons/circle-help'

	/** @type {{ text: string, label?: string }} */
	let { text, label = 'Пояснение' } = $props()

	const id = $props.id()

	// Сколько пикселей оставляем между подсказкой и краем экрана.
	const EDGE = 8

	/** @type {HTMLElement} */
	let bubble
	let shift = $state(0)

	/** У края экрана подсказка вылезла бы наружу, поэтому сдвигаем её внутрь на недостающее. */
	function place() {
		// К событию подсказка уже показана (:hover, :focus-within), прежний сдвиг вычитаем.
		const rect = bubble.getBoundingClientRect()
		const left = rect.left - shift
		const right = rect.right - shift
		const limit = document.documentElement.clientWidth - EDGE
		let next = right > limit ? limit - right : 0

		if (left + next < EDGE) next = EDGE - left

		shift = next
	}
</script>

<!--
	Пояснение, которое нужно не всем и не каждый раз. Открывается и наведением, и фокусом:
	на телефоне наведения нет, зато тап по кнопке ставит на неё фокус.
-->
<span class="tip">
	<button
		tabindex="-1"
		type="button"
		class="tip__button"
		aria-label={label}
		aria-describedby={id}
		onpointerenter={place}
		onfocus={place}
	>
		<CircleHelp size={14} />
	</button>
	<!-- Без сдвига undefined: на сборке атрибута style нет, CSP нечего резать. -->
	<span
		bind:this={bubble}
		{id}
		role="tooltip"
		class="tip__bubble"
		style:translate={shift ? `${shift}px 0` : undefined}>{text}</span
	>
</span>

<style>
	.tip {
		position: relative;
		display: inline-flex;
		vertical-align: middle;

		& .tip__button {
			cursor: help;
			display: flex;
			padding: 0.125rem;
			border: 0;
			border-radius: 50%;
			color: var(--ui-muted);
			background: none;

			&:hover,
			&:focus-visible {
				color: var(--ui-fg);
			}
		}

		/*
		 * Скрытую подсказку убираем из раскладки, а не гасим прозрачностью: невидимая,
		 * она всё равно торчала бы за край экрана и давала горизонтальную прокрутку.
		 */
		& .tip__bubble {
			pointer-events: none;
			position: absolute;
			z-index: 20;
			bottom: calc(100% + 0.375rem);
			left: -0.5rem;
			display: none;
			width: max-content;
			max-width: min(16rem, calc(100vw - var(--ui-gutter) * 2));
			padding: 0.5rem 0.75rem;
			border: 1px solid var(--ui-border);
			border-radius: var(--ui-radius-sm);
			font-size: 0.75rem;
			font-weight: 400;
			line-height: 1.45;
			color: var(--ui-fg);
			text-transform: none;
			text-wrap: pretty;
			letter-spacing: normal;
			background: var(--ui-bg);
			box-shadow: var(--ui-shadow-md);
			animation: tip-in 0.15s;

			@media (prefers-reduced-motion: reduce) {
				animation: none;
			}
		}

		&:hover .tip__bubble,
		&:focus-within .tip__bubble {
			display: block;
		}
	}

	@keyframes tip-in {
		from {
			opacity: 0;
		}
	}
</style>
