<script>
	import SearchIcon from '@lucide/svelte/icons/search'
	import X from '@lucide/svelte/icons/x'
	import { tick } from 'svelte'

	import { t } from '../i18n.js'

	/**
	 * @typedef {object} Props
	 * @property {string} [locale] Язык подписей.
	 * @property {string} [bundle] Где лежит индекс Pagefind, по умолчанию `/pagefind/` в корне сайта.
	 * @property {number} [limit] Сколько страниц показывать, у каждой до трёх разделов.
	 * @property {boolean} [shortcut] Открывать поиск по Cmd/Ctrl-K и `/`.
	 * @property {boolean} [trimHtml] Срезать `.html` в адресах: для хостинга, который отдаёт `/page` по `page.html`.
	 * @property {boolean} [button] Своя кнопка с лупой. Сайт с кнопкой в шапке выключает её и зовёт `open()`.
	 * @property {boolean} [closeButton] Крестик в строке. Без него остаётся крестик браузера, он чистит поле.
	 * @property {boolean} [vimKeys] Ctrl-j/k и Ctrl-n/p ходят по результатам, в любой раскладке.
	 * @property {import('../i18n.js').Strings} [strings] Свои подписи поверх общих, по языкам.
	 * @property {import('svelte').Snippet} [prompt] Что в начале строки вместо лупы, например `/` у сайта с vim-клавишами.
	 * @property {import('svelte').Snippet<[string]>} [empty] Своё "ничего не нашлось": сниппет получает запрос.
	 * @property {() => void} [onclose] Окно закрылось: Esc, клик мимо, крестик или переход на результат.
	 */

	/** @type {Props} */
	let {
		locale = 'ru',
		bundle = '/pagefind/',
		limit = 8,
		shortcut = true,
		trimHtml = false,
		button = true,
		closeButton = true,
		vimKeys = false,
		strings,
		prompt,
		empty,
		onclose,
	} = $props()

	/** @typedef {{ url: string, page: string, section?: string, excerpt: string }} Hit */
	/**
	 * @typedef {object} PagefindPage
	 * @property {string} url
	 * @property {{ title?: string }} meta
	 * @property {string} excerpt
	 * @property {{ title: string, url: string, excerpt: string }[]} [sub_results]
	 */

	/** @type {HTMLDialogElement} */
	let dialog
	/** @type {HTMLInputElement | undefined} */
	let input = $state()
	let query = $state('')
	/** @type {Hit[]} */
	let hits = $state([])
	let active = $state(0)
	let unavailable = $state(false)
	// Пока ответа нет, «ничего не нашлось» не показываем: иначе оно мигает между нажатиями.
	let pending = $state(false)
	/** @type {Promise<any> | undefined} */
	let pagefind

	// Страница каталога в индексе -- `/docs/index.html`, а открывают её как `/docs/`.
	// Остальные `.html` срезаются только по просьбе сайта: на обычном хостинге без них 404.
	const clean = (/** @type {string} */ url) => {
		const page = url.replace(/\/index\.html(?=#|$)/, '/')

		return trimHtml ? page.replace(/\.html(?=#|$)/, '') : page
	}
	// Совпадения Pagefind размечает голым <mark>, а стилям нужен класс.
	const marked = (/** @type {string} */ excerpt) => excerpt.replaceAll('<mark>', '<mark class="search__mark">')

	/**
	 * @param {string} key
	 * @param {Record<string, string>} [vars]
	 */
	const text = (key, vars) => t(locale, `search.${key}`, vars, strings)

	function load() {
		// Адрес собирается в рантайме: при сборке сайта индекса ещё нет, и Vite не должен его искать.
		const url = `${bundle}pagefind.js`

		pagefind ??= import(/* @vite-ignore */ url)
			.then(async (module) => {
				// Адреса страниц Pagefind считает от каталога, где лежит его папка.
				await module.options({ excerptLength: 16, baseUrl: bundle.replace(/[^/]+\/?$/, '') || '/' })

				return module
			})
			.catch((error) => {
				// Упавшую загрузку не запоминаем: после сбоя сети следующий запрос попробует снова.
				pagefind = undefined

				throw error
			})

		return pagefind
	}

	/** @param {string} text */
	async function run(text) {
		// Старые результаты не должны открываться по Enter, пока ищется новый запрос.
		// Флаг только пишем, не читаем: иначе $effect подписался бы на него и перезапускал поиск.
		const searching = Boolean(text.trim())

		hits = []
		pending = searching

		if (!searching) return

		try {
			const search = await (await load()).debouncedSearch(text)

			// Пока шёл поиск, запрос успели дописать: этот ответ уже никому не нужен.
			if (!search || text !== query) return

			/** @type {PagefindPage[]} */
			const pages = await Promise.all(search.results.slice(0, limit).map((/** @type {any} */ r) => r.data()))

			if (text !== query) return

			hits = pages.flatMap((page) => {
				const title = page.meta.title ?? ''
				const sections = (page.sub_results ?? []).slice(0, 3)

				if (!sections.length) return [{ url: clean(page.url), page: title, excerpt: marked(page.excerpt) }]

				return sections.map((section) => ({
					url: clean(section.url),
					page: title,
					section: section.title === title ? undefined : section.title,
					excerpt: marked(section.excerpt),
				}))
			})
			active = 0
			unavailable = false
			pending = false
		} catch {
			// В `astro dev` индекса нет: Pagefind строит его только по готовой сборке.
			if (text === query) {
				unavailable = true
				pending = false
			}
		}
	}

	$effect(() => {
		run(query)
	})

	export function open() {
		if (dialog.open) return

		dialog.showModal()
		// Прошлый запрос остаётся выделенным: набор поверх заменит его целиком.
		input?.focus()
		input?.select()
	}

	function close() {
		if (!dialog.open) return

		// Фокус из закрытого окна браузер убирает только к следующему кадру,
		// а до тех пор клавиши страницы попадали бы в скрытое поле.
		/** @type {HTMLElement | null} */ (dialog.querySelector(':focus'))?.blur()
		dialog.close()
		// Сайт узнаёт о закрытии сразу: событие close пришло бы задачей позже,
		// и клавиши его бы опередили.
		onclose?.()
	}

	/** @param {Hit | undefined} hit */
	function go(hit) {
		if (!hit) return

		close()
		location.assign(hit.url)
	}

	/** @param {number} delta */
	function move(delta) {
		if (!hits.length) return

		active = (active + delta + hits.length) % hits.length
		tick().then(() => dialog.querySelector('.search__hit--active')?.scrollIntoView({ block: 'nearest' }))
	}

	/**
	 * На сколько сдвинуть выбор: 1 вниз, -1 вверх, 0 не по клавише выбора.
	 *
	 * @param {KeyboardEvent} event
	 */
	function step(event) {
		if (event.key === 'ArrowDown') return 1

		if (event.key === 'ArrowUp') return -1

		// AltGr в Windows приходит как Ctrl+Alt: это буква раскладки, например "ń".
		if (!vimKeys || !event.ctrlKey || event.altKey || event.shiftKey) return 0

		// Код клавиши держит её место: в кириллице Ctrl-j приходит как "о", но с кодом `KeyJ`.
		const is = (/** @type {string} */ letter) => event.key === letter || event.code === `Key${letter.toUpperCase()}`

		if (is('j') || is('n')) return 1

		return is('k') || is('p') ? -1 : 0
	}

	/** @param {KeyboardEvent} event */
	function onKeydown(event) {
		const delta = step(event)

		if (delta) {
			event.preventDefault()
			move(delta)
		} else if (event.key === 'Enter') {
			event.preventDefault()
			go(hits[active])
		} else if (event.key === 'Escape') {
			// Поле поиска съедает Esc, чтобы очистить себя, и окно не закрылось бы с первого раза.
			event.preventDefault()
			close()
		}
	}

	/** @param {KeyboardEvent} event */
	function onShortcut(event) {
		if (!shortcut || dialog.open) return

		const target = /** @type {HTMLElement} */ (event.target)
		// «/» в поле ввода -- это просто символ, а Cmd/Ctrl-K работает откуда угодно.
		const typing = target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName)
		const k = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'

		if (k || (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey)) {
			event.preventDefault()
			open()
		}
	}

	// Esc вне поля, например на результате, закрывает окно тем же путём, что и в поле.
	function onCancel(/** @type {Event} */ event) {
		event.preventDefault()
		close()
	}

	// Клик мимо окна попадает в сам <dialog>, его подложку.
	function onClick(/** @type {MouseEvent} */ event) {
		if (event.target === dialog) close()
	}
</script>

<svelte:document onkeydown={onShortcut} />

{#if button}
	<button class="search-button" type="button" aria-label={text('open')} aria-haspopup="dialog" onclick={open}>
		<SearchIcon size={14} aria-hidden="true" />
	</button>
{/if}

<dialog bind:this={dialog} class="search" aria-label={text('open')} onclick={onClick} oncancel={onCancel}>
	<div class="search__box">
		<div class="search__bar">
			{#if prompt}
				{@render prompt()}
			{:else}
				<SearchIcon class="search__icon" size={16} aria-hidden="true" />
			{/if}
			<input
				bind:this={input}
				bind:value={query}
				class="search__input"
				type="search"
				placeholder={text('placeholder')}
				aria-label={text('placeholder')}
				autocomplete="off"
				spellcheck="false"
				onkeydown={onKeydown}
			/>
			{#if closeButton}
				<button class="search__close" type="button" aria-label={text('closeLabel')} onclick={close}>
					<X size={16} aria-hidden="true" />
				</button>
			{/if}
		</div>

		{#if unavailable}
			<p class="search__note" role="status">{text('unavailable')}</p>
		{:else if query.trim() && !hits.length && !pending}
			<p class="search__note" role="status">
				{#if empty}{@render empty(query)}{:else}{text('empty', { query })}{/if}
			</p>
		{:else if hits.length}
			<ul class="search__hits">
				{#each hits as hit, index (hit.url)}
					<li>
						<a
							class="search__hit"
							class:search__hit--active={index === active}
							href={hit.url}
							onmouseenter={() => (active = index)}
							onclick={close}
						>
							<span class="search__title">
								{hit.page}{#if hit.section}<span class="search__sep" aria-hidden="true">›</span>{hit.section}{/if}
							</span>
							<!-- Отрывок с <mark> Pagefind собирает из текста самого сайта. -->
							<span class="search__excerpt">{@html hit.excerpt}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		<div class="search__footer">
			<span><kbd class="search__key">↵</kbd> {text('select')}</span>
			<span><kbd class="search__key">↑</kbd><kbd class="search__key">↓</kbd> {text('navigate')}</span>
			<span><kbd class="search__key">esc</kbd> {text('close')}</span>
		</div>
	</div>
</dialog>

<style>
	.search-button {
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
	}

	.search {
		width: min(560px, calc(100vw - 2 * var(--ui-gutter, 16px)));
		max-width: none;
		max-height: none;
		margin: var(--ui-search-top, 10vh) auto auto;
		padding: 0;
		border: 1px solid var(--ui-border);
		border-radius: var(--ui-menu-radius, 12px);
		color: var(--ui-fg);
		background: var(--ui-card-bg, var(--ui-bg));
		box-shadow: var(--ui-menu-shadow, 0 12px 32px rgb(0 0 0 / 18%));

		&::backdrop {
			background: var(--ui-backdrop, rgb(0 0 0 / 45%));
		}
	}

	.search__box {
		display: flex;
		flex-direction: column;
		max-height: min(70dvh, 600px);
	}

	.search__bar {
		display: flex;
		gap: 8px;
		align-items: center;
		padding: 0 16px;
		border-bottom: 1px solid var(--ui-border);
		color: var(--ui-muted);
	}

	.search__close {
		cursor: pointer;
		display: inline-grid;
		place-items: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 0;
		border-radius: var(--ui-menu-item-radius, 8px);
		color: var(--ui-muted);
		background: none;

		&:hover {
			color: var(--ui-fg);
			background: var(--ui-surface);
		}

		&:focus-visible {
			outline: 2px solid var(--ui-accent);
			outline-offset: 2px;
		}
	}

	.search__input {
		flex: 1;
		min-width: 0;
		padding: 14px 0;
		border: 0;
		font: inherit;
		color: var(--ui-fg);
		background: transparent;
		outline: 0;

		@media (pointer: coarse) {
			font-size: max(1rem, 1em);
		}
	}

	/* Свой крестик браузера встал бы рядом с кнопкой закрытия и путал бы с ней. */
	.search__bar:has(.search__close) .search__input::-webkit-search-cancel-button {
		appearance: none;
	}

	.search__note {
		margin: 0;
		padding: 24px 16px;
		font-size: 14px;
		color: var(--ui-search-text, var(--ui-muted));
		text-align: center;
	}

	.search__hits {
		overflow-y: auto;
		margin: 0;
		padding: 8px;
		list-style: none;
	}

	.search__hit {
		display: block;
		padding: 8px 12px;
		/* Рамки нет, пока сайт не задаст ей ширину. Цвет у выбранного -- `--ui-hover-border`. */
		border: var(--ui-search-hit-border, 0) solid transparent;
		border-radius: var(--ui-menu-item-radius, 8px);
		color: var(--ui-fg);
		text-decoration: none;

		&.search__hit--active {
			border-color: var(--ui-hover-border);
			background: var(--ui-hover-bg, var(--ui-surface));
		}
	}

	.search__title {
		overflow: hidden;
		display: block;
		font-size: 14px;
		font-weight: 600;
		color: var(--ui-search-title, var(--ui-fg));
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.search__sep {
		margin: 0 6px;
		color: var(--ui-muted);
	}

	.search__excerpt {
		display: block;
		font-size: 13px;
		line-height: 20px;
		color: var(--ui-search-text, var(--ui-muted));

		& :global(.search__mark) {
			color: var(--ui-fg);
			background: var(--ui-accent-soft);
		}
	}

	.search__footer {
		display: flex;
		gap: 16px;
		padding: 10px 16px;
		border-top: 1px solid var(--ui-border);
		font-size: 12px;
		color: var(--ui-muted);

		@media (hover: none) {
			display: none;
		}
	}

	.search__key {
		margin-right: 4px;
		padding: 0 4px;
		border: 1px solid var(--ui-border);
		/* Не круглее пункта меню: у угловатого сайта и клавиши угловатые. */
		border-radius: min(4px, var(--ui-menu-item-radius, 8px));
		font-family: inherit;
	}
</style>
