<script>
	import InfoTip from './info-tip.svelte'

	import { t } from '../i18n.js'

	/**
	 * @typedef {object} Props
	 * @property {string} label
	 * @property {string} [for] id поля ввода: по клику на подпись фокус уходит в него.
	 * @property {string} [hint] Пояснение за значком «?» у подписи.
	 * @property {2 | 3} [span] Сколько колонок сетки занимает поле от 600px и шире.
	 * @property {boolean} [missing] Обязательное поле пустое, и у подписи появляется точка.
	 * @property {import('svelte').Snippet} children
	 */

	/** @type {Props} */
	let { label, for: id, hint, span, missing = false, locale = 'ru', children } = $props()
</script>

<div class={['field', span && `field--span-${span}`]}>
	<!-- Значок вне label: иначе щелчок по нему уводил бы фокус в поле. -->
	<div class="field__head">
		<label class="field__label" for={id}>
			{label}{#if missing}<span class="field__missing" title={t(locale, 'field.missing')}></span>{/if}
		</label>
		{#if hint}<InfoTip text={hint} {locale} />{/if}
	</div>
	{@render children()}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;

		/* На узком экране сетка в одну колонку, растягивать поле некуда. */
		&.field--span-2 {
			@media (width >= 600px) {
				grid-column: span 2;
			}
		}

		&.field--span-3 {
			@media (width >= 600px) {
				grid-column: span 3;
			}
		}

		& .field__head {
			display: flex;
			gap: 0.25rem;
			align-items: center;
		}

		& .field__label {
			font-size: 0.8125rem;
			font-weight: 500;
		}

		& .field__missing {
			display: inline-block;
			width: 0.375rem;
			height: 0.375rem;
			margin-left: 0.375rem;
			border-radius: 50%;
			vertical-align: 0.125em;
			background: var(--ui-warning);
		}
	}
</style>
