<script>
	import Moon from '@lucide/svelte/icons/moon'
	import Sun from '@lucide/svelte/icons/sun'

	import { t } from '../i18n.js'
	import { themePeek } from '../theme-peek.js'
	import { toggleTheme } from '../theme.js'

	/**
	 * @typedef {object} Props
	 * @property {string} [locale] Язык подписи для экранных читалок.
	 * @property {string} [label] Своя подпись вместо общей.
	 * @property {string} [key] Ключ выбора в localStorage, тот же, что у `ThemeBoot`.
	 * @property {boolean} [peek] Круг с другой темой вокруг кнопки, стили круга -- `theme-peek.css`
	 *   в layout сайта. В выпадающем меню он мешает.
	 */

	/** @type {Props} */
	let { locale = 'ru', label, key, peek = true } = $props()

	const attach = (/** @type {HTMLElement} */ node) => (peek ? themePeek(node) : undefined)
</script>

<!-- Иконка показывает текущую тему. Какую из двух рисовать, решает CSS по атрибуту
     `data-theme` и системной схеме: так на первой отрисовке нет мигания до гидрации. -->
<button
	class="theme-toggle"
	type="button"
	aria-label={label ?? t(locale, 'theme.toggle')}
	onclick={() => toggleTheme(key ? { key } : undefined)}
	{@attach attach}
>
	<Sun class="theme-toggle__sun" size={14} aria-hidden="true" />
	<Moon class="theme-toggle__moon" size={14} aria-hidden="true" />
</button>

<style>
	.theme-toggle {
		cursor: pointer;
		display: inline-grid;
		flex-shrink: 0;
		place-items: center;
		width: var(--ui-control-height, 32px);
		height: var(--ui-control-height, 32px);
		padding: 0;
		border: 1px solid var(--ui-border);
		border-radius: var(--ui-control-radius, 16px);
		color: var(--ui-fg);
		background: var(--ui-control-bg, transparent);
		transition: border-color 0.15s;

		&:hover {
			border-color: var(--ui-accent);
		}

		&:focus-visible {
			outline: 2px solid var(--ui-accent);
			outline-offset: 2px;
		}

		& :global(.theme-toggle__moon) {
			display: none;
		}
	}

	:global(:root[data-theme='dark']) .theme-toggle {
		& :global(.theme-toggle__sun) {
			display: none;
		}

		& :global(.theme-toggle__moon) {
			display: block;
		}
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) .theme-toggle {
			& :global(.theme-toggle__sun) {
				display: none;
			}

			& :global(.theme-toggle__moon) {
				display: block;
			}
		}
	}
</style>
