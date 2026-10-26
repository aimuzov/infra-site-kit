<script>
	import PanelLeftClose from '@lucide/svelte/icons/panel-left-close'
	import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open'
	import PanelRightClose from '@lucide/svelte/icons/panel-right-close'
	import PanelRightOpen from '@lucide/svelte/icons/panel-right-open'

	import { t } from '../i18n.js'
	import { togglePanel, watchPanel } from '../panels.js'

	/**
	 * @typedef {object} Props
	 * @property {string} panel Имя панели, то же, что у `PanelsBoot`.
	 * @property {string} controls `id` элемента, который кнопка прячет.
	 * @property {'left' | 'right'} [side] С какой стороны панель, от этого иконка.
	 * @property {string} [name] Что прячем, в винительном падеже: «оглавление». По умолчанию «панель».
	 * @property {string} [locale] Язык подписи.
	 * @property {string} [prefix] Префикс ключей в localStorage, тот же, что у `PanelsBoot`.
	 */

	/** @type {Props} */
	let { panel, controls, side = 'left', name, locale = 'ru', prefix } = $props()

	// Раскладку до отрисовки сворачивает CSS сайта по атрибуту на корне, кнопка же узнаёт
	// своё состояние после гидрации.
	let hidden = $state(false)

	$effect(() => watchPanel(panel, (next) => (hidden = next)))

	const what = $derived(name ?? t(locale, 'panel.name'))
	const label = $derived(t(locale, hidden ? 'panel.show' : 'panel.hide', { name: what }))
	const Close = $derived(side === 'left' ? PanelLeftClose : PanelRightClose)
	const Open = $derived(side === 'left' ? PanelLeftOpen : PanelRightOpen)
</script>

<button
	class="panel-toggle"
	type="button"
	data-panel={panel}
	aria-controls={controls}
	aria-expanded={!hidden}
	aria-label={label}
	title={label}
	onclick={() => togglePanel(panel, { prefix })}
>
	{#if hidden}
		<Open size={16} aria-hidden="true" />
	{:else}
		<Close size={16} aria-hidden="true" />
	{/if}
</button>

<style>
	.panel-toggle {
		cursor: pointer;
		display: inline-grid;
		flex-shrink: 0;
		place-items: center;
		width: var(--ui-control-height, 32px);
		height: var(--ui-control-height, 32px);
		padding: 0;
		border: 1px solid var(--ui-border);
		border-radius: var(--ui-menu-item-radius, 8px);
		color: var(--ui-muted);
		background: var(--ui-control-bg, transparent);
		transition:
			border-color 0.15s,
			color 0.15s;

		&:hover {
			border-color: var(--ui-accent);
			color: var(--ui-fg);
		}

		&:focus-visible {
			outline: 2px solid var(--ui-accent);
			outline-offset: 2px;
		}
	}
</style>
