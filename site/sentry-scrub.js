// `beforeSend` и `beforeBreadcrumb` для Sentry. Без SDK они не нужны, поэтому едут
// в его чанке (sentry-sdk.js), а не в модуле, который страница грузит сразу.

// Секреты тут не ищут: каждый новый формат такой поиск обходит. Событие
// собирается заново из полей по списку, остальное остаётся на странице.

const FILTERED = '[Filtered]'
// Строка обрезается раньше любой регулярки, и каждая проходит её за линейное время.
const URL_LIMIT = 2048
const TEXT_LIMIT = 256

// Консоль сайта перед ошибкой полезна предупреждениями и ошибками, а `log` и `debug`
// пишут что угодно, в том числе чужие скрипты вроде Метрики.
const CONSOLE_LEVELS = new Set(['warning', 'error'])

// Начало адреса до хоста: логин и пароль в нём срезаются.
const URL_START = /^([a-z][\w+.-]*:)?\/\/(?:[^/\\?#]*@)?/i
// Источник адреса внутри `blob:`.
const ORIGIN = /^([a-z][\w+.-]*:\/\/)(?:[^/\\?#]*@)?([^/\\?#]*)/i
// У `data:` остаётся только тип, содержимое после него уходит.
const DATA_TYPE = /^data:([\w.+-]+\/[\w.+-]+)(?=[,;])/i

// Логин и пароль в адресах внутри текста: `https://bob:hunter2@host`.
const TEXT_USERINFO = /\/\/[^\s/?#]*@/g
// Query и фрагмент: `?` или `#`, приклеенный к адресу. `'` значение не обрывает:
// во фрагменте браузер оставляет её как есть, а `"` и `` ` `` кодирует.
const TEXT_QUERY = /(?<=\S)[?#](?=\S)[^\s"`]*/g
// Слово, после которого в тексте может идти секрет. `auth` -- и в `oauth`
// и `authorization`, но не в `author`.
const TELLING_WORD =
	/(?:passw|passphrase|passcode|pwd|secret|token|auth(?!or(?!iz))|bearer|cookie|session|sessid|csrf|xsrf|jwt|api[\s_-]?key|private[\s_-]?key|credential|signature|otp)[a-z]*/i
const JWT = /\beyJ[\w-]{7,}(?:\.[\w-]*)*/g
// Случайная строка в base64, base64url и hex: длинный прогон с цифрой и буквой.
const TOKEN_RUN = /[\w+/=-]{32,}/g

// Тип ошибки -- имя класса: `TypeError`, `DOMException`, `TokenExpiredError`.
const ERROR_TYPE = /^[A-Za-z_$][\w$.]{0,59}$/
// Имя функции во фрейме: `new Foo`, `HTMLButtonElement.<anonymous>`, `Object.foo [as bar]`.
const NAME = /^(?:(?:async|new) )?[\w$.<>/[\]]+(?: \[as [\w$.]+\])?$/
const NAME_LIMIT = 200
const METHOD = /^[a-z]{1,16}$/i
const TAG_KEY = /^[\w.-]{1,32}$/

// Поля, которые ставят SDK и настройки, а не страница. Из `sdkProcessingMetadata`
// SDK берёт трассу для конверта и сам удаляет его перед отправкой.
const EVENT_KEYS = [
	'event_id',
	'timestamp',
	'level',
	'platform',
	'logger',
	'release',
	'dist',
	'environment',
	'sdk',
	'sdkProcessingMetadata',
]
const MECHANISM_KEYS = ['type', 'handled', 'synthetic', 'exception_id', 'parent_id', 'source', 'is_exception_group']
const TRACE_KEYS = ['trace_id', 'span_id', 'parent_span_id']

/**
 * Объект без пустых полей или `undefined`, если не осталось ни одного.
 *
 * @param object - Собранные поля, часть которых не прошла проверку.
 */
function defined(object) {
	const entries = Object.entries(object).filter(([, value]) => value != null)

	return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

const pick = (object, keys) => defined(Object.fromEntries(keys.map((key) => [key, object[key]])))

/**
 * Адрес без query и фрагмента, без логина и пароля. От `data:` остаётся тип, от
 * `blob:` -- источник. Путь остаётся как есть: по нему Sentry ищет source maps.
 *
 * @param url - Адрес страницы, запроса, перехода или файла в стеке.
 */
export function cleanUrl(url) {
	if (typeof url !== 'string') return undefined

	const head = url.slice(0, URL_LIMIT)

	if (/^data:/i.test(head)) return `data:${DATA_TYPE.exec(head)?.[1] ?? ''}`

	if (/^blob:/i.test(head)) {
		const origin = ORIGIN.exec(head.slice(5))

		return origin ? `blob:${origin[1]}${origin[2]}` : 'blob:'
	}

	const end = head.search(/[?#]/)

	return (end < 0 ? head : head.slice(0, end)).replace(URL_START, '$1//')
}

/**
 * Текст, обрезанный до 256 символов. В нём у адресов нет логина с паролем, query
 * и фрагмента, после первого говорящего слова всё до конца текста заменено, а JWT
 * и длинные случайные строки спрятаны. До конца текста, а не строки: иначе прошли
 * бы `\n` в JSON и значение в несколько строк.
 *
 * @param text - Текст ошибки, сообщения или значение тега.
 */
export function cleanText(text) {
	if (typeof text !== 'string') return undefined

	let clean = text.length > TEXT_LIMIT ? `${text.slice(0, TEXT_LIMIT - 1)}…` : text

	clean = clean.replace(TEXT_USERINFO, '//').replace(TEXT_QUERY, '')

	const word = TELLING_WORD.exec(clean)

	if (word) {
		const end = word.index + word[0].length

		if (end < clean.length) clean = `${clean.slice(0, end)} ${FILTERED}`
	}

	return clean
		.replace(JWT, FILTERED)
		.replace(TOKEN_RUN, (run) => (/\d/.test(run) && /[a-z]/i.test(run) ? FILTERED : run))
}

const cleanName = (name) =>
	typeof name === 'string' && name.length <= NAME_LIMIT && NAME.test(name) ? name : undefined

/**
 * Фрейм стека: файл, функция и место в коде. Строк исходника и переменных нет.
 *
 * @param frame - Фрейм из стектрейса SDK.
 */
const cleanFrame = (frame) =>
	defined({
		filename: cleanUrl(frame.filename),
		abs_path: cleanUrl(frame.abs_path),
		function: cleanName(frame.function),
		module: cleanName(frame.module),
		lineno: frame.lineno,
		colno: frame.colno,
		in_app: frame.in_app,
		platform: frame.platform,
	})

/**
 * Исключение: тип, текст, как поймано, и стек. `data` механизма не уходит.
 *
 * @param exception - Исключение из `event.exception.values`.
 */
const cleanException = ({ type, value, mechanism, stacktrace }) =>
	defined({
		type: typeof type === 'string' && ERROR_TYPE.test(type) ? type : 'Error',
		value: cleanText(value),
		mechanism: mechanism && pick(mechanism, MECHANISM_KEYS),
		stacktrace: stacktrace?.frames && { frames: stacktrace.frames.map(cleanFrame).filter(Boolean) },
	})

/**
 * Запрос страницы: адрес, браузер для группировки и откуда пришли.
 *
 * @param request - `event.request` от `HttpContext`.
 */
const cleanRequest = ({ url, headers }) =>
	defined({
		url: cleanUrl(url),
		headers: defined({
			'User-Agent': typeof headers?.['User-Agent'] === 'string' ? headers['User-Agent'] : undefined,
			Referer: cleanUrl(headers?.Referer),
		}),
	})

// Файл сборки и его debug ID: по ним Sentry находит source map.
const cleanImage = ({ type, debug_id, code_file }) => defined({ type, debug_id, code_file: cleanUrl(code_file) })

const cleanTags = (tags) =>
	defined(
		Object.fromEntries(
			Object.entries(tags)
				.filter(([key]) => TAG_KEY.test(key))
				.map(([key, value]) => [key, cleanText(value)]),
		),
	)

/**
 * `beforeBreadcrumb`: какие крошки сохранить и что в них оставить. Клики и ввод
 * (`ui.*`) выбрасывает: в них селектор элемента с классами и атрибутами, а для
 * разбора ошибки статичного сайта хватает переходов и запросов. Из консоли
 * оставляет предупреждения и ошибки, но без аргументов, только текст. От данных
 * остаются метод, адрес и статус запроса или адреса перехода.
 *
 * @param breadcrumb - Крошка, которую SDK собирается сохранить.
 */
export function cleanBreadcrumb(breadcrumb) {
	const { category = '', level, data } = breadcrumb

	if (category.startsWith('ui.')) return null
	if (category === 'console' && !CONSOLE_LEVELS.has(level)) return null

	return (
		defined({
			timestamp: breadcrumb.timestamp,
			category: breadcrumb.category,
			level,
			type: breadcrumb.type,
			message: cleanText(breadcrumb.message),
			data:
				data &&
				defined({
					method: typeof data.method === 'string' && METHOD.test(data.method) ? data.method : undefined,
					url: cleanUrl(data.url),
					status_code: typeof data.status_code === 'number' ? data.status_code : undefined,
					from: cleanUrl(data.from),
					to: cleanUrl(data.to),
				}),
		}) ?? null
	)
}

/**
 * `beforeSend`: собирает событие заново из разрешённых полей. Уходят тип, текст
 * и стек ошибки, сообщение, крошки, адрес страницы с `User-Agent` и `Referer`,
 * трасса, теги и debug ID файлов для source maps. `extra` с брошенным объектом,
 * пользователь, отпечаток и всё, чего нет в списке, остаются на странице.
 *
 * @param event - Событие Sentry перед отправкой.
 */
export const scrubEvent = (event) =>
	defined({
		...pick(event, EVENT_KEYS),
		transaction: cleanUrl(event.transaction),
		message: cleanText(event.message),
		logentry: event.logentry && defined({ message: cleanText(event.logentry.message) }),
		exception: event.exception?.values && { values: event.exception.values.map(cleanException) },
		breadcrumbs: event.breadcrumbs?.map(cleanBreadcrumb).filter(Boolean),
		request: event.request && cleanRequest(event.request),
		contexts: event.contexts?.trace && { trace: pick(event.contexts.trace, TRACE_KEYS) },
		tags: event.tags && cleanTags(event.tags),
		debug_meta: event.debug_meta?.images && { images: event.debug_meta.images.map(cleanImage).filter(Boolean) },
	}) ?? null
