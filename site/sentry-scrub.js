// `beforeSend` и `beforeBreadcrumb` для Sentry. Без SDK они не нужны, поэтому едут
// в его чанке (sentry-sdk.js), а не в модуле, который страница грузит сразу.

const FILTERED = '[Filtered]'

// Имена полей, заголовков и параметров, чьё значение при разборе ошибки не нужно.
const SECRET_KEY = /passw|secret|token|session|csrf|xsrf|jwt|credential|signature|api[-_]?key|cookie|authoriz/i

const URL_KEYS = ['url', 'from', 'to']

// Консоль сайта перед ошибкой полезна предупреждениями и ошибками, а `log` и `debug`
// пишут что угодно, в том числе чужие скрипты вроде Метрики.
const CONSOLE_LEVELS = new Set(['warning', 'error'])

// `urlQueryParams` срезает у адресов только query, а во фрагменте бывает самое ценное:
// у MCP-коннекторов подписанный запрос входа `#request=...`, у OAuth `#access_token=...`.
const withoutQuery = (url) => url.replace(/[?#].*/, '')

const kind = (char) =>
	/\d/.test(char) ? 'digit' : /[a-z]/.test(char) ? 'lower' : /[A-Z]/.test(char) ? 'upper' : 'other'

/**
 * Похоже ли слово из букв, цифр, `-` и `_` на токен. Hex и UUID видно по алфавиту, а
 * base64url по тому, что вид символа в случайной строке меняется почти на каждом шаге,
 * а в словах и именах вроде `OffscreenCanvasRenderingContext2D` редко.
 *
 * @param word - Слово от 20 символов.
 */
function isTokenLike(word) {
	if (!/\d/.test(word) || !/[a-z]/i.test(word)) return false
	if (/^[\da-f-]+$/i.test(word)) return true
	if (!/[a-z]/.test(word) || !/[A-Z]/.test(word)) return false

	let changes = 0

	for (let i = 1; i < word.length; i++) {
		if (kind(word[i]) !== kind(word[i - 1])) changes++
	}

	return changes >= (word.length - 1) * 0.4
}

// Заголовки в тексте: значение с пробелами и `;` до конца строки или кавычки.
const HEADER = /\b((?:set-)?cookie|(?:proxy-)?authorization)(["']?\s*[:=]\s*["'`]?)[^\r\n"'`]+/gi
const BEARER = /\b(Bearer\s+)[\w~+/.=-]+/gi
// Имя пары берётся только с начала слова, иначе на длинной строке
// без пар поиск квадратичен.
const PAIR_NAME = /(?<![\w.-])([\w.-]+)(?:\\?["'])?\s*[:=]\s*(?:\\?["'`])?/g
const PAIR_VALUE = /[^\s"'`,;&=]+/y
// Значение в кавычках идёт до закрывающей, экранированные `\"` его не обрывают.
const QUOTED = {
	'"': /(?:\\[\s\S]|[^\\"])*/y,
	"'": /(?:\\[\s\S]|[^\\'])*/y,
	'`': /(?:\\[\s\S]|[^\\`])*/y,
}
// В строке, где экранированы сами кавычки (`{\"password\":\"...\"}`), значение идёт
// до `\"`, а кавычка внутри него записана как `\\\"`.
const ESCAPED_QUOTED = {
	'"': /(?:\\\\(?:\\[\s\S]|[^\\])|[^\\]|\\[^\\"])*/y,
	"'": /(?:\\\\(?:\\[\s\S]|[^\\])|[^\\]|\\[^\\'])*/y,
	'`': /(?:\\\\(?:\\[\s\S]|[^\\])|[^\\]|\\[^\\`])*/y,
}
// Значения всех параметров адреса, в query и во фрагменте: `?q=...`, `#request=...`.
const URL_PARAM = /([?&#][^\s?&#=<>"'`()]+=)[^\s&#<>"'`()]+/g
const JWT = /\beyJ[\w-]+\.[\w-]+(?:\.[\w-]+)?/g
const WORD = /[\w-]{20,}/g

/**
 * Где кончается значение пары. В кавычках оно идёт до закрывающей, с пробелами и
 * запятыми: пароль или ответ на секретный вопрос бывает из нескольких слов.
 *
 * @param text - Текст с парой.
 * @param start - Начало значения.
 * @param head - Имя пары с разделителем и открывающей кавычкой, если она есть.
 */
function valueEnd(text, start, head) {
	const value = (head.at(-2) === '\\' ? ESCAPED_QUOTED : QUOTED)[head.at(-1)] ?? PAIR_VALUE

	value.lastIndex = start

	return value.test(text) ? value.lastIndex : start
}

/**
 * Пары с говорящим именем: `password=...`, `"access_token": "..."`. Значение ищется
 * только после такого имени, иначе `error: token=...` спрятал бы пару внутри
 * значения `error`.
 *
 * @param text - Текст, где уже вычищены заголовки.
 */
function scrubPairs(text) {
	let result = ''
	let done = 0

	for (const { 0: head, 1: name, index } of text.matchAll(PAIR_NAME)) {
		if (index < done || !SECRET_KEY.test(name)) continue

		const start = index + head.length
		const end = valueEnd(text, start, head)

		if (end > start) {
			result += text.slice(done, start) + FILTERED
			done = end
		}
	}

	return result + text.slice(done)
}

/**
 * Заменяет секреты в свободном тексте: заголовки Authorization и Cookie, пары с
 * говорящим именем, значения параметров адресов, JWT и длинные случайные строки.
 * Порядок важен: сначала значения по имени, потом то, что похоже на токен само.
 *
 * @param text - Текст ошибки, сообщения консоли или поля данных.
 */
export function scrubText(text) {
	const headers = text.replace(HEADER, `$1$2${FILTERED}`).replace(BEARER, `$1${FILTERED}`)

	return scrubPairs(headers)
		.replace(URL_PARAM, `$1${FILTERED}`)
		.replace(JWT, FILTERED)
		.replace(WORD, (word) => (isTokenLike(word) ? FILTERED : word))
}

/**
 * Адрес без query и фрагмента и без токенов в пути.
 *
 * @param url - Адрес страницы, запроса или файла.
 */
export const scrubUrl = (url) => scrubText(withoutQuery(url))

/**
 * Чистит поля события, к `beforeSend` уже нормализованные в JSON: строки как текст,
 * а поля с говорящим именем целиком.
 *
 * @param value - `extra`, поле `data` крошки или заголовки.
 */
function scrubData(value) {
	if (typeof value === 'string') return scrubText(value)
	if (Array.isArray(value)) return value.map(scrubData)
	if (value === null || typeof value !== 'object') return value

	return Object.fromEntries(
		Object.entries(value).map(([key, item]) => [key, SECRET_KEY.test(key) ? FILTERED : scrubData(item)]),
	)
}

function scrubBreadcrumb(breadcrumb) {
	if (typeof breadcrumb.message === 'string') breadcrumb.message = scrubText(breadcrumb.message)

	for (const key of URL_KEYS) {
		if (typeof breadcrumb.data?.[key] === 'string') breadcrumb.data[key] = scrubUrl(breadcrumb.data[key])
	}

	return breadcrumb
}

/**
 * `beforeBreadcrumb`: какие крошки сохранить и как. Клики и ввод (`ui.*`) выбрасывает:
 * в них селектор элемента с классами и атрибутами, а для разбора ошибки статичного
 * сайта хватает переходов и запросов. Из консоли оставляет предупреждения и ошибки.
 * У адресов убирает query и фрагмент, из сообщения секреты. Аргументы консоли здесь
 * ещё живые объекты сайта, их `scrubEvent` чистит уже нормализованными.
 *
 * @param breadcrumb - Крошка, которую SDK собирается сохранить.
 */
export function cleanBreadcrumb(breadcrumb) {
	const { category = '' } = breadcrumb

	if (category.startsWith('ui.')) return null
	if (category === 'console' && !CONSOLE_LEVELS.has(breadcrumb.level)) return null

	return scrubBreadcrumb(breadcrumb)
}

/**
 * `beforeSend`: убирает из события секреты. Адреса страницы и файлов в стеке теряют
 * query и фрагмент (у ошибки из инлайн-скрипта файл -- адрес самой страницы), текст
 * ошибок и сообщений чистится по `scrubText`, а `extra`, `data` крошек и заголовки --
 * ещё и по именам полей. Cookie, query и тело запроса из события уходят совсем.
 *
 * @param event - Событие Sentry перед отправкой.
 */
export function scrubEvent(event) {
	for (const exception of event.exception?.values ?? []) {
		if (typeof exception.value === 'string') exception.value = scrubText(exception.value)

		for (const frame of exception.stacktrace?.frames ?? []) {
			if (frame.filename) frame.filename = scrubUrl(frame.filename)
			if (frame.abs_path) frame.abs_path = scrubUrl(frame.abs_path)
		}
	}

	for (const image of event.debug_meta?.images ?? []) {
		if (image.code_file) image.code_file = scrubUrl(image.code_file)
	}

	if (typeof event.message === 'string') event.message = scrubText(event.message)
	if (event.logentry) event.logentry = scrubData(event.logentry)

	if (event.request) {
		const { url, headers } = event.request

		event.request = { ...(url && { url: scrubUrl(url) }), ...(headers && { headers: scrubData(headers) }) }
	}

	if (event.extra) event.extra = scrubData(event.extra)

	if (event.breadcrumbs) {
		event.breadcrumbs = event.breadcrumbs.map((breadcrumb) =>
			scrubBreadcrumb({ ...breadcrumb, ...(breadcrumb.data && { data: scrubData(breadcrumb.data) }) }),
		)
	}

	return event
}
