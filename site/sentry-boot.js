// Браузерная часть sentry.astro. SDK (~30 КБ gzip) не должен спорить за канал со шрифтами
// и первой картинкой, поэтому он грузится отдельным чанком после load, когда браузер
// свободен. Ошибки до этого момента копятся и уходят сразу после инициализации.

/**
 * Опции `Sentry.init`: только ошибки, без трейсинга, реплеев и профилирования,
 * и без IP, cookies и заголовков посетителя. Сессии тоже выключены: иначе SDK
 * шлёт запрос в Sentry на каждой загрузке страницы, а не только при ошибке.
 *
 * @param config - DSN, релиз и окружение из sentry.astro.
 */
export const sentryOptions = ({ dsn, release, environment }) => ({
	dsn,
	release,
	environment,
	sendDefaultPii: false,
	// В SDK 11 сбор данных настраивается ещё и здесь, и по умолчанию он включён.
	// User-Agent оставлен: по нему Sentry показывает браузер и систему.
	dataCollection: { userInfo: false, cookies: false, httpHeaders: { allow: ['User-Agent'] }, urlQueryParams: false },
	integrations: (defaults) => defaults.filter((integration) => integration.name !== 'BrowserSession'),
})

/**
 * Подключает Sentry на странице.
 *
 * @param config - DSN, релиз и окружение из sentry.astro.
 * @param page - Окно и загрузчик SDK, подменяются в тестах.
 */
export function bootSentry(config, { win = window, load = () => import('./sentry-sdk.js') } = {}) {
	const early = []
	const keep = (event) => early.push(event)
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
