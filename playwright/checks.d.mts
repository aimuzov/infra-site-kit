import type { APIRequestContext, Locator, Page } from '@playwright/test'

/** Цветовая схема, в которой нарисована страница. */
export type Scheme = 'light' | 'dark'

/** Настройки проверки axe. */
export type A11yOptions = {
	/** Id правил axe, которые пропускаем, например `['color-contrast']`. */
	disableRules?: string[]
	/** Селекторы частей страницы, которые axe не проверяет. */
	exclude?: string[]
}

/** Настройки проверки переключателя темы. */
export type ThemeOptions = {
	/** Страница, на которой проверяем, по умолчанию `/`. */
	path?: string
	/** Проверять, что выбор схемы переживает перезагрузку, по умолчанию `true`. */
	persist?: boolean
}

/**
 * Пути страниц, перечисленных в sitemap, отсортированные.
 *
 * Продовый домен из адресов отбрасывается, страницы запрашиваются у тестируемого сервера.
 *
 * @param index - Индекс sitemap, по умолчанию `/sitemap-index.xml`.
 */
export function sitemapPaths(request: APIRequestContext, index?: string): Promise<string[]>

/**
 * Открывает страницу и проверяет, что она отвечает 200 и не пишет ошибок в консоль.
 *
 * @param options.ignore - Ошибки консоли, которые пропускаем.
 */
export function expectHealthyPage(page: Page, path: string, options?: { ignore?: RegExp[] }): Promise<void>

/** Прогоняет axe по уже открытой странице на соответствие WCAG 2.1 AA. */
export function expectAccessible(page: Page, options?: A11yOptions): Promise<void>

/** Схема, в которой страница нарисована сейчас. Читается так же, как в `theme-peek.js`. */
export function pageScheme(page: Page): Promise<Scheme>

/**
 * Проверяет, что клик по кнопке темы меняет схему, а выбор переживает перезагрузку.
 *
 * Кликает до трёх раз, так как переключатель может сначала пройти через "как в системе".
 */
export function expectThemeToggle(page: Page, button: Locator, options?: ThemeOptions): Promise<void>

/** Наведение на кнопку темы раскрывает круг `theme-peek.js`, клик его гасит. */
export function expectThemePeek(page: Page, button: Locator, options?: { path?: string }): Promise<void>

/**
 * Кнопка `ui/panel-toggle.svelte` прячет панель, выбор переживает перезагрузку
 * через `PanelsBoot`, второй клик возвращает панель.
 */
export function expectPanelToggle(page: Page, button: Locator, options?: { path?: string }): Promise<void>

/**
 * Проверяет, что Яндекс Метрика есть на странице,
 * но `tag.js` грузится только после первого взаимодействия.
 */
export function expectMetrikaDeferred(page: Page, options?: { path?: string }): Promise<void>

/**
 * Открывает несуществующий адрес и проверяет общую 404 из not-found.astro: ответ 404,
 * `noindex`, ссылку на главную, кнопку "Назад" и чистую консоль.
 *
 * @param options.path - Несуществующий адрес, по умолчанию `/kit-404-probe`.
 * @param options.home - Адрес главной, по умолчанию `/`.
 * @param options.ignore - Ошибки консоли, которые пропускаем.
 */
export function expectNotFound(page: Page, options?: { path?: string; home?: string; ignore?: RegExp[] }): Promise<void>

/**
 * Портит адрес страницы из sitemap одной буквой и ждёт её в подсказках 404.
 *
 * @param options.exclude - Префиксы, которые эта 404 не подсказывает, как `exclude` у not-found.astro.
 */
export function expectNotFoundSuggests(
	page: Page,
	request: APIRequestContext,
	options?: { index?: string; exclude?: string[] },
): Promise<void>

/**
 * Корень держит место под полосу прокрутки окна, и ширина у всех путей одна.
 *
 * Ширина сравнивается только при обычных полосах: `page` нужна из браузера без `--hide-scrollbars`.
 */
export function expectStableWidth(page: Page, paths: string[]): Promise<void>

/** У `body` прозрачный `-webkit-tap-highlight-color`: касание не подсвечивается. */
export function expectNoTapHighlight(page: Page, paths: string[]): Promise<void>

/** Регистрирует общие проверки как тесты текущего файла. */
export function siteChecks(options?: {
	/** Каждая страница из sitemap отвечает 200 без ошибок в консоли, по умолчанию `true`. */
	pages?: boolean
	/** Ошибки консоли, которые страницам можно писать. */
	ignoreConsole?: RegExp[]
	/** axe по каждой странице из sitemap в обеих схемах, `false` выключает проверку. */
	a11y?: false | A11yOptions
	/** Кнопка темы, без неё тема не проверяется. */
	theme?: ThemeOptions & {
		/** Находит кнопку темы на странице. */
		button: (page: Page) => Locator
		/** Подключён ли к кнопке `theme-peek.js`, по умолчанию `true`. */
		peek?: boolean
	}
	/** Проверка Метрики, с `true` проверяется страница `/`. */
	metrika?: boolean | { path?: string }
	/** Общая 404 из not-found.astro, `suggest: false` -- для сайта без подсказок, `exclude` -- как у компонента. */
	notFound?: boolean | { path?: string; home?: string; suggest?: boolean; exclude?: string[] }
	/**
	 * Полоса прокрутки не меняет ширину страниц из sitemap (`base.css`), по умолчанию `true`.
	 * `paths` -- для сайта без sitemap: проверяются они, а sitemap не читается.
	 */
	gutter?: boolean | { paths?: string[] }
	/**
	 * Касание на страницах из sitemap не подсвечивается (`base.css`), по умолчанию `true`.
	 * `paths` -- как у `gutter`.
	 */
	tapHighlight?: boolean | { paths?: string[] }
}): void
