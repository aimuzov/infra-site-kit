<script>
	import Languages from '@lucide/svelte/icons/languages'

	import { LOCALE_COOKIE, LOCALES, localizePath, t } from '../i18n.js'

	/**
	 * @typedef {object} Props
	 * @property {string} locale Язык страницы.
	 * @property {string} path Путь страницы, от него строится адрес на другом языке.
	 */

	/** @type {Props} */
	let { locale, path } = $props()

	// Языков два, поэтому переключатель -- одна ссылка на другой.
	const target = $derived(LOCALES.find((l) => l !== locale) ?? 'ru')

	// Явный выбор запоминается cookie: сервер с ним больше не подбирает язык по `Accept-Language`.
	function remember() {
		document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`
	}
</script>

<a
	class="lang"
	href={localizePath(path, target)}
	hreflang={target}
	lang={target}
	aria-label={`${t(locale, 'lang.label')}: ${t(locale, 'lang.switch')}`}
	onclick={remember}
>
	<Languages size={14} aria-hidden="true" />
	<span>{target.toUpperCase()}</span>
</a>

<style>
	.lang {
		display: inline-flex;
		gap: 4px;
		align-items: center;
		height: 32px;
		padding: 0 10px;
		border: 1px solid var(--ui-border);
		border-radius: 16px;
		font: 500 12px/1 var(--ui-mono, ui-monospace, monospace);
		color: var(--ui-fg);
		text-decoration: none;
		transition: border-color 0.15s;

		&:hover {
			border-color: var(--ui-accent);
		}

		&:focus-visible {
			outline: 2px solid var(--ui-accent);
			outline-offset: 2px;
		}
	}
</style>
