// Браузерная часть sentry.astro. SDK (~30 КБ gzip) не должен спорить за канал со шрифтами
// и первой картинкой, поэтому он грузится отдельным чанком после load, когда браузер
// свободен. Ошибки до этого момента копятся и уходят сразу после инициализации.

const EARLY_LIMIT = 20

const withoutQuery = (url) => url.replace(/[?#].*/, '')

/**
 * Убирает query и фрагмент из адресов файлов в событии. `urlQueryParams` их
 * не трогает, а у ошибки из инлайн-скрипта файл -- это адрес самой страницы.
 * У адреса страницы `urlQueryParams` срезает только query, фрагмент остаётся.
 *
 * @param event - Событие Sentry перед отправкой.
 */
export function stripFileQueries(event) {
	for (const exception of event.exception?.values ?? []) {
		for (const frame of exception.stacktrace?.frames ?? []) {
			if (frame.filename) frame.filename = withoutQuery(frame.filename)
			if (frame.abs_path) frame.abs_path = withoutQuery(frame.abs_path)
		}
	}

	for (const image of event.debug_meta?.images ?? []) {
		if (image.code_file) image.code_file = withoutQuery(image.code_file)
	}

	if (event.request?.url) event.request.url = withoutQuery(event.request.url)

	return event
}

// Консоль сайта перед ошибкой полезна предупреждениями и ошибками, а `log` и `debug`
// пишут что угодно, в том числе чужие скрипты вроде Метрики.
const CONSOLE_LEVELS = new Set(['warning', 'error'])

/**
 * Чистит хлебные крошки перед тем, как они попадут в событие. Клики и ввод
 * (`ui.*`) выбрасывает: в них селектор элемента с классами и атрибутами,
 * а для разбора ошибки статичного сайта хватает переходов и запросов. У тех
 * убирает query и фрагмент: `urlQueryParams` срезает только query, а
 * фрагмент остаётся.
 *
 * @param breadcrumb - Крошка, которую SDK собирается сохранить.
 */
export function cleanBreadcrumb(breadcrumb) {
	const { category = '', data } = breadcrumb

	if (category.startsWith('ui.')) return null
	if (category === 'console' && !CONSOLE_LEVELS.has(breadcrumb.level)) return null

	for (const key of ['url', 'from', 'to']) {
		if (typeof data?.[key] === 'string') data[key] = withoutQuery(data[key])
	}

	return breadcrumb
}

/**
 * Опции `Sentry.init`: только ошибки, без трейсинга, реплеев и профилирования,
 * и без данных посетителя. Сессии тоже выключены: иначе SDK
 * шлёт запрос в Sentry на каждой загрузке страницы, а не только при ошибке.
 *
 * @param config - DSN, релиз и окружение из sentry.astro.
 */
export const sentryOptions = ({ dsn, release, environment }) => ({
	dsn,
	release,
	environment,
	// В SDK 11 `sendDefaultPii` нет, сбор данных задаётся только здесь, и по умолчанию
	// он включён весь. `userInfo: false` заодно не даёт SDK просить Sentry записать IP.
	dataCollection: {
		userInfo: false,
		cookies: false,
		httpHeaders: false,
		httpBodies: [],
		urlQueryParams: false,
		genAI: { inputs: false, outputs: false },
		stackFrameVariables: false,
	},
	beforeSend: stripFileQueries,
	beforeBreadcrumb: cleanBreadcrumb,
	integrations: (defaults) => defaults.filter((integration) => integration.name !== 'BrowserSession'),
})

/**
 * Подключает Sentry на странице.
 *
 * @param config - DSN, релиз и окружение из sentry.astro.
 * @param page - Окно и загрузчик SDK, подменяются в тестах.
 */
export function bootSentry(config, { win = window, load = () => import('./sentry-sdk.js') } = {}) {
	// Если чанк SDK завис, слушатели живут долго, поэтому ранних ошибок держим немного:
	// при сбое в цикле первых хватит, чтобы понять, что случилось.
	const early = []
	const keep = (event) => early.length < EARLY_LIMIT && early.push(event)
	const kinds = ['error', 'unhandledrejection']

	for (const kind of kinds) win.addEventListener(kind, keep)

	const start = async () => {
		// Чанк SDK может и не загрузиться, например после деплоя со старой вкладки.
		// Тогда копить ошибки дальше незачем, а сама ошибка загрузки видна в консоли.
		let sdk
		try {
			sdk = await load()
		} finally {
			for (const kind of kinds) win.removeEventListener(kind, keep)
		}

		const { init, captureException } = sdk
		init(sentryOptions(config))

		// Ранние ошибки помечаем так же, как пометил бы обработчик самого SDK.
		for (const event of early) {
			const error = event.type === 'error' ? (event.error ?? new Error(event.message)) : event.reason
			captureException(error, { mechanism: { type: `on${event.type}`, handled: false } })
		}
	}

	// Без requestIdleCallback (Safari) хватит и таймера: load уже прошёл.
	const later = () =>
		win.requestIdleCallback ? win.requestIdleCallback(start, { timeout: 4000 }) : win.setTimeout(start, 1000)

	if (win.document.readyState === 'complete') later()
	else win.addEventListener('load', later, { once: true })
}
