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

// Схема и `//` в начале адреса.
const URL_START = /^(?:[a-z][\w+.-]*:)?\/\//i
// Хост с портом, каким его пропускает браузер: имя, IPv4 или IPv6 в скобках.
const HOST = /^(?:[\p{L}\p{N}_.%-]*|\[[\w.:%]*\])(?::\d*)?$/u
// Источник адреса внутри `blob:`.
const ORIGIN = /^[a-z][\w+.-]*:\/\/[^/\\?#]*/i
// У `data:` остаётся только тип, содержимое после него уходит.
const DATA_TYPE = /^data:([\w.+-]+\/[\w.+-]+)(?=[,;])/i

// Адрес внутри текста: от `//` до пробела.
const TEXT_ADDRESS = /\/\/\S*/g
// Query и фрагмент. У адреса `?` или `#` уходит со всем значением: `'` браузер не
// кодирует, и она его не обрывает, а `"` и `` ` `` кодирует. Сам по себе, как
// `location.hash` в тексте, -- только с `=` или `/`: `issue #42` и `Done?` остаются.
const TEXT_QUERY = /(?<=\S)[?#](?=\S)[^\s"`]*|(?<!\S)[?#](?=[^\s"`=/]*[=/])[^\s"`]*/g
// Слово, после которого в тексте может идти секрет. `auth` -- и в `oauth`,
// `authorization` и `authorisation`, но не в `author`.
const TELLING_WORD =
	/(?:passw|passphrase|passcode|pwd|secret|token|auth(?!or(?!i[sz]))|bearer|cookie|session|sessid|csrf|xsrf|jwt|api[\s_-]?key|private[\s_-]?key|credential|signature|otp)[a-z]*/i
const JWT = /\beyJ[\w-]{7,}(?:\.[\w-]*)*/g
// Случайная строка в base64, base64url и hex: длинный прогон с цифрой и буквой.
const TOKEN_RUN = /[\w+/=-]{32,}/g

// Тип ошибки -- имя класса: `TypeError`, `DOMException`, `TokenExpiredError`.
const ERROR_TYPE = /^[A-Za-z_$][\w$.]{0,59}$/
// Имя функции во фрейме, как его пишут V8, Firefox и Safari: `new Foo`, `async*load`,
// `HTMLButtonElement.<anonymous>`, `A.get x [as x]`, `Foo.#bar`, `global code`.
// Точка и пробел стоят только между частями, поэтому разбор однозначный.
const NAME =
	/^(?:(?:async|new) )?(?:[\p{ID_Continue}$#*<>/[\]]+\.)*(?:(?:get|set) )?[\p{ID_Continue}$#*<>/[\]]+(?: \[as [\p{ID_Continue}$#.]+\])?$|^(?:global|eval|module) code$/u
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

const random = (run) => /\d/.test(run) && /[a-z]/i.test(run)

// JWT или длинная случайная строка, которые в тексте стали бы `[Filtered]`.
const hasToken = (text) => text.search(JWT) >= 0 || (text.match(TOKEN_RUN) ?? []).some(random)

/**
 * Хост адреса с логином, паролем и портом: всё после `//` до пути, query или фрагмента.
 *
 * @param rest - Адрес без схемы и `//`.
 */
function authority(rest) {
	const end = rest.search(/[/\\?#]/)

	return end < 0 ? rest : rest.slice(0, end)
}

/**
 * Адрес без логина и пароля. Сначала уходит всё до последнего `@` хоста, как у
 * браузера. Если и после этого хост не похож на хост (`deploy:AbC`), его оборвал
 * `/`, `?` или `#` в пароле раньше `@`, и уходит всё до последнего `@` вообще.
 *
 * @param address - Адрес или кусок текста от `//` до пробела.
 */
function withoutUserinfo(address) {
	const start = URL_START.exec(address)?.[0]

	if (!start) return address

	let rest = address.slice(start.length)

	rest = rest.slice(authority(rest).lastIndexOf('@') + 1)

	if (!HOST.test(authority(rest))) rest = rest.slice(rest.lastIndexOf('@') + 1)

	return start + rest
}

/**
 * Адрес без query и фрагмента, без логина и пароля. От `data:` остаётся тип, от
 * `blob:` -- источник. Путь остаётся как есть: по нему Sentry ищет source maps.
 *
 * @param url - Адрес страницы, запроса, перехода или файла в стеке.
 */
export function cleanUrl(url) {
	if (typeof url !== 'string') return undefined

	// Пробелы в начале браузер отбрасывает, и адрес с ними уходит в запрос как обычный.
	const head = url.slice(0, URL_LIMIT).trimStart()

	if (/^data:/i.test(head)) return `data:${DATA_TYPE.exec(head)?.[1] ?? ''}`

	if (/^blob:/i.test(head)) return `blob:${ORIGIN.exec(withoutUserinfo(head.slice(5)))?.[0] ?? ''}`

	const address = withoutUserinfo(head)
	const end = address.search(/[?#]/)

	return end < 0 ? address : address.slice(0, end)
}

/**
 * Первые 256 символов текста. Слово, которое рассекла граница, уходит целиком: без
 * конца у адреса нет `@`, по которому срезается пароль, а у длинного токена -- длины,
 * по которой его узнают.
 *
 * @param text - Текст любой длины.
 */
function cut(text) {
	if (text.length <= TEXT_LIMIT) return text

	let end = TEXT_LIMIT - 1

	if (/\S/.test(text[end])) while (end > 0 && /\S/.test(text[end - 1])) end--

	return `${text.slice(0, end)}…`
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

	let clean = cut(text).replace(TEXT_ADDRESS, withoutUserinfo).replace(TEXT_QUERY, '')

	const word = TELLING_WORD.exec(clean)

	if (word) {
		const end = word.index + word[0].length

		if (end < clean.length) clean = `${clean.slice(0, end)} ${FILTERED}`
	}

	return clean.replace(JWT, FILTERED).replace(TOKEN_RUN, (run) => (random(run) ? FILTERED : run))
}

// Имя функции бывает и из данных: V8 берёт его из вычисляемого ключа объекта.
const cleanName = (name) =>
	typeof name === 'string' && name.length <= NAME_LIMIT && NAME.test(name) && !hasToken(name) ? name : undefined

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
		type: typeof type === 'string' && ERROR_TYPE.test(type) && !hasToken(type) ? type : 'Error',
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
 * пользователь, отпечаток, вложения и всё, чего нет в списке, остаются на странице.
 *
 * @param event - Событие Sentry перед отправкой.
 * @param hint - Подсказка к событию. Вложения из scope SDK берёт из неё уже после
 *   `beforeSend`, в обход события, поэтому их приходится убирать здесь.
 */
export function scrubEvent(event, hint) {
	if (hint) delete hint.attachments

	return (
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
			debug_meta: event.debug_meta?.images && {
				images: event.debug_meta.images.map(cleanImage).filter(Boolean),
			},
		}) ?? null
	)
}
