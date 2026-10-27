<script>
	import ChevronDown from '@lucide/svelte/icons/chevron-down'
	import Globe from '@lucide/svelte/icons/globe'

	import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_NAMES, LOCALES, localizePath, t } from '../i18n.js'

	/**
	 * @typedef {object} Props
	 * @property {string} locale Язык страницы.
	 * @property {string} path Путь страницы, от него строятся адреса на других языках.
	 * @property {readonly string[]} [locales] Языки сайта, если их набор не общий.
	 * @property {string} [defaultLocale] Язык без префикса в адресе, если это не русский.
	 */

	/** @type {Props} */
	let { locale, path, locales = LOCALES, defaultLocale = DEFAULT_LOCALE } = $props()

	const routing = $derived({ locales, defaultLocale })

	/** @type {HTMLDetailsElement | undefined} */
	let menu = $state()

	// Меню на `<details>` со ссылками: без JS оно открывается и ведёт куда надо,
	// а скрипт только закрывает его по Esc и по клику мимо.
	function close(/** @type {Event} */ event) {
		if (!menu?.open) return

		if (event instanceof KeyboardEvent ? event.key === 'Escape' : !menu.contains(/** @type {Node} */ (event.target))) {
			menu.open = false
			menu.querySelector('summary')?.focus()
		}
	}

	// Явный выбор запоминается cookie: с ним ни Caddy, ни locale-boot не уводят на язык браузера.
	function remember(/** @type {string} */ target) {
		document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`
	}
</script>

<svelte:document onclick={close} onkeydown={close} />

<details class="lang" bind:this={menu}>
	<summary aria-label={`${t(locale, 'lang.label')}: ${LOCALE_NAMES[locale] ?? locale}`}>
		<Globe size={14} aria-hidden="true" />
		<span>{locale.toUpperCase()}</span>
		<ChevronDown class="lang__chevron" size={12} aria-hidden="true" />
	</summary>
	<ul class="lang__list">
		{#each locales as target (target)}
			<li>
				<a
					class="lang__option"
					href={localizePath(path, target, routing)}
					hreflang={target}
					lang={target}
					aria-current={target === locale ? 'true' : undefined}
					onclick={() => remember(target)}
				>
					{LOCALE_NAMES[target] ?? target}
					<code>{target.toUpperCase()}</code>
				</a>
			</li>
		{/each}
	</ul>
</details>

<style>
	.lang {
		position: relative;

		& summary {
			cursor: pointer;
			display: inline-flex;
			gap: 6px;
			align-items: center;
			height: var(--ui-control-height, 32px);
			padding: 0 9px 0 10px;
			border: 1px solid var(--ui-border);
			background: var(--ui-control-bg, transparent);
			border-radius: var(--ui-control-radius, 16px);
			font: 500 12px/1 var(--ui-font-mono, ui-monospace, monospace);
			color: var(--ui-fg);
			list-style: none;
			transition: border-color 0.15s;

			&::-webkit-details-marker {
				display: none;
			}

			&:hover {
				border-color: var(--ui-accent);
			}

			&:focus-visible {
				outline: 2px solid var(--ui-accent);
				outline-offset: 2px;
			}
		}

		& :global(.lang__chevron) {
			color: var(--ui-muted);
			transition: transform 0.15s;
		}

		&[open] summary {
			border-color: var(--ui-accent);
		}

		&[open] :global(.lang__chevron) {
			transform: rotate(180deg);
		}
	}

	.lang__list {
		position: absolute;
		z-index: 10;
		top: calc(100% + 8px);
		right: 0;
		min-width: 168px;
		margin: 0;
		padding: 6px;
		border: 1px solid var(--ui-border);
		border-radius: var(--ui-menu-radius, 10px);
		background: var(--ui-card-bg, var(--ui-bg));
		box-shadow: var(--ui-menu-shadow, 0 12px 32px rgb(0 0 0 / 18%));
		list-style: none;
	}

	.lang__option {
		display: flex;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
		padding: 8px 10px;
		border-radius: var(--ui-menu-item-radius, 8px);
		font-size: 14px;
		color: var(--ui-fg);
		text-decoration: none;

		&:hover,
		&:focus-visible {
			background: color-mix(in srgb, var(--ui-fg) 6%, transparent);
			outline: none;
		}

		&[aria-current] {
			color: var(--ui-accent);
		}

		& code {
			font: 500 11px/1 var(--ui-font-mono, ui-monospace, monospace);
			color: var(--ui-muted);
		}
	}
</style>
