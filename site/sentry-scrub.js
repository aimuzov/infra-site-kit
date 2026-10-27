// `beforeSend` и `beforeBreadcrumb` для Sentry. Без SDK они не нужны, поэтому едут
// в его чанке (sentry-sdk.js), а не в модуле, который страница грузит сразу.

const FILTERED = '[Filtered]'

// Части имён полей, заголовков и параметров, которые выдают секрет в любом месте
// имени: `newPassword`, `x-csrf-token`, `privateKey`. Имя берётся в `snake_case`.
const SECRET_PART =
	/passw|passphrase|passcode|secret|token|session|sessid|csrf|xsrf|jwt|credential|signature|(?:api|private)_?key|cookie|authoriz/
// Короткие выдают его только отдельным словом: `auth`, но не `author`. А `pass`
// и `pin` -- последним: `user_pin`, но не `min_pin_length` и `render_pass_encoder`.
const SECRET_WORD = /(?<![a-z])(?:pwd|[th]?otp|o?auth|mfa|sid|sig|cvc|cvv)(?![a-z])|(?<![a-z])(?:pass|pin)$/
// `code` -- только сам по себе или с уточнением: у `status_code` и `error_code`
// в значении не секрет, а то, что нужно для разбора ошибки.
const SECRET_CODE =
	/^(?:(?:auth|otp|pin|sms|email|verification|verify|confirm|confirmation|reset|recovery|backup|invite|access|login|security|device|user|one_time)_)?code$/
// `TokenExpiredError: jwt expired` -- не поле с секретом, а тип ошибки и её текст.
const ERROR_NAME = /(?:error|exception)$/

const URL_KEYS = ['url', 'from', 'to']

// Консоль сайта перед ошибкой полезна предупреждениями и ошибками, а `log` и `debug`
// пишут что угодно, в том числе чужие скрипты вроде Метрики.
const CONSOLE_LEVELS = new Set(['warning', 'error'])

// `urlQueryParams` срезает у адресов только query, а во фрагменте бывает самое ценное:
// у MCP-коннекторов подписанный запрос входа `#request=...`, у OAuth `#access_token=...`.
const withoutQuery = (url) => url.replace(/[?#].*/, '')

/**
 * Выдаёт ли имя, что в значении секрет.
 *
 * @param name - Имя поля, заголовка или параметра: `newPassword`, `user[pin]`.
 */
function isSecretName(name) {
	const snake = name
		.replace(/([a-z\d])([A-Z])/g, '$1_$2')
		.toLowerCase()
		.replace(/[^a-z\d]+/g, '_')

	if (ERROR_NAME.test(snake)) return false

	return SECRET_PART.test(snake) || SECRET_WORD.test(snake) || SECRET_CODE.test(snake)
}

const BEARER = /\b(Bearer\s+)[\w~+/.=-]+/gi
// Логин и пароль в адресе: `https://user:pass@host`.
const USERINFO = /(?<=:\/\/)[^\s/?#"'`<>]+@/g
// Имя пары берётся только с начала слова, иначе на длинной строке без пар поиск
// квадратичен. В имени бывают скобки формы (`user[password]=`), перед кавычками --
// слеши экранирования, а разделитель бывает и `=>`.
const PAIR_NAME = /(?<![\w.[\]-])([\w.[\]-]+)(?:\\*["'])?\s*(?:=>|[:=])\s*(?:\\*["'`])?/g
// Значение без кавычек после `=` -- одно слово: так пишут в адресе, форме и cookie.
// `,` и `;` бывают в пароле и обрывают его, только если за ними пробел или конец,
// а `&` и `#` -- ещё и перед следующим параметром адреса.
const WORD_VALUE = /(?:[^\s"'`,;&#]|[,;](?=[^\s"'`])|[&#](?![\w.%[\]-]+=)(?=[^\s"'`]))*/y
// После `:` или с пробелом -- фраза до конца строки или до следующей пары
// (`, page: 2`): пароль бывает из нескольких слов. `\n` в JSON -- тоже конец строки.
const PHRASE_VALUE = /(?:[^\r\n,;\\]|\\(?![rn])|[,;](?!\s*(?:\\*["'])?[\w.[\]-]+(?:\\*["'])?\s*(?:=>|[:=])))*/y
// У `Cookie` и `Authorization` значение до конца строки целиком: в нём пары
// через `;`, кавычки и поля Digest.
const LINE_VALUE = /(?:[^\r\n\\]|\\(?![rn]))*/y
const HEADER_NAME = /(?:cookies?|authorization)$/i
// Значение параметра адреса обрывают `&`, `#` и то, что браузер в адресе кодирует.
// `'`, `(` и `)` во фрагменте остаются как есть и обрывают значение, только если
// стоят в самом конце, как скобка или кавычка вокруг адреса.
const PARAM_VALUE = String.raw`(?:[^\s&#<>"'\`()]|['()]+(?=[^\s&#<>"'\`()]))+`
// Параметры адреса в query и во фрагменте: `?q=...`, `#request=...`.
const URL_PARAM = new RegExp(String.raw`([?&#][^\s?&#=<>"\`]+=)${PARAM_VALUE}`, 'g')
// Первый параметр без `?` и `#`: в теле формы и в `location.hash.slice(1)`.
const QUERY_START = new RegExp(String.raw`(?<![\w.%[\]=-])([\w.%[\]-]+=)${PARAM_VALUE}(?=&[\w.%[\]-]+=)`, 'g')
const JWT = /\beyJ[\w-]+\.[\w-]+(?:\.[\w-]+)?/g

/**
 * Где кончается значение в кавычках: на кавычке того же уровня экранирования, что
 * и открывающая. В JSON внутри строки (`{\"password\":\"...\"}`) перед своими
 * кавычками один слеш, перед кавычкой в значении три, и на каждом уровне слешей
 * вдвое больше и ещё один.
 *
 * @param text - Текст с парой.
 * @param start - Начало значения, сразу за открывающей кавычкой.
 * @param quote - Кавычка.
 * @param level - Сколько слешей перед открывающей кавычкой.
 */
function quotedEnd(text, start, quote, level) {
	let slashes = 0

	for (let i = start; i < text.length; i++) {
		if (text[i] === quote && slashes % (2 * level + 2) === level) return i - level

		slashes = text[i] === '\\' ? slashes + 1 : 0
	}

	return text.length
}

/**
 * Где кончается объект или массив: на скобке, которая его закрывает. Скобки внутри
 * строк не в счёт. Без закрывающей скобки значение идёт до конца текста.
 *
 * @param text - Текст с парой.
 * @param start - Открывающая скобка.
 * @param level - Сколько слешей перед кавычками этого JSON.
 */
function nestedEnd(text, start, level) {
	let depth = 0
	let quote = ''
	let slashes = 0

	for (let i = start; i < text.length; i++) {
		const char = text[i]
		const own = slashes % (2 * level + 2) === level

		if (quote) {
			if (char === quote && own) quote = ''
		} else if ((char === '"' || char === "'") && own) {
			quote = char
		} else if (char === '{' || char === '[') {
			depth++
		} else if ((char === '}' || char === ']') && --depth === 0) {
			return i + 1
		}

		slashes = char === '\\' ? slashes + 1 : 0
	}

	return text.length
}

/**
 * Где кончается значение пары. В кавычках оно идёт до закрывающей, со скобками -- до
 * парной скобки, а без них зависит от разделителя и имени.
 *
 * @param text - Текст с парой.
 * @param start - Начало значения.
 * @param head - Имя пары с разделителем и открывающей кавычкой, если она есть.
 * @param name - Имя пары.
 */
function valueEnd(text, start, head, name) {
	const quoted = head.match(/(\\*)(["'`])$/)

	if (quoted) return quotedEnd(text, start, quoted[2], quoted[1].length)

	if (text[start] === '{' || text[start] === '[') {
		return nestedEnd(text, start, head.match(/(\\*)["']\s*(?:=>|[:=])/)?.[1].length ?? 0)
	}

	const value = HEADER_NAME.test(name) ? LINE_VALUE : /:|\s$/.test(head) ? PHRASE_VALUE : WORD_VALUE

	value.lastIndex = start

	return value.test(text) ? value.lastIndex : start
}

/**
 * Пары с говорящим именем: `password=...`, `"access_token": "..."`. Значение ищется
 * только после такого имени, иначе `error: token=...` спрятал бы пару внутри
 * значения `error`.
 *
 * @param text - Текст, где уже вычищены `Bearer` и логины в адресах.
 */
function scrubPairs(text) {
	let result = ''
	let done = 0

	for (const { 0: head, 1: name, index } of text.matchAll(PAIR_NAME)) {
		if (index < done || !isSecretName(name)) continue

		const start = index + head.length
		const end = valueEnd(text, start, head, name)

		if (end > start) {
			result += text.slice(done, start) + FILTERED
			done = end
		}
	}

	return result + text.slice(done)
}

// Случайную строку ищем среди букв и цифр, склеенных знаками base64 и base64url.
const TOKEN_RUN = /[\w+/=-]{20,}/g
const PIECE = /[a-z\d]+|[^a-z\d]+/gi

// Какие буквы за какой идут в 98% пар букв в английских словах и именах DOM API.
// В случайной строке остальные пары, вроде `qz` или `vb`, бывают почти через раз.
const COMMON_PAIRS = [
	'bcdefghiklmnprstuvwxyz',
	'abeilorsu',
	'acehiklorstuy',
	'adeilnorsuy',
	'abcdefghilmnopqrstuvwxy',
	'aefilortu',
	'aeghilnopruy',
	'aeilmortuy',
	'abcdefgklmnoprstuvxz',
	'aeu',
	'aeil',
	'abcdeilmopstuvy',
	'abeilmnopuy',
	'abcdefghiklmnoprstuvy',
	'abcdefgiklmnoprstuvwx',
	'aehiloprstuy',
	'u',
	'abcdefghiklmnoprstuvy',
	'acefhiklmnopstuvwy',
	'acehilmorstuy',
	'abcdefgilmnprst',
	'aegio',
	'aehinor',
	'ipt',
	'acdeilmnoprst',
	'aeo',
]

const isDigit = (char) => char >= '0' && char <= '9'
const isUpper = (char) => char >= 'A' && char <= 'Z'

/**
 * Доля мест, где кусок ведёт себя не как слово: цифра рядом с буквой, заглавная
 * после строчной или пара букв, редкая в словах. У имён вроде `getElementById` это
 * стыки слов, их мало, а у случайной строки больше трети мест.
 *
 * @param piece - Буквы и цифры.
 */
function oddness(piece) {
	let odd = 0

	for (let i = 1; i < piece.length; i++) {
		const before = piece[i - 1]
		const char = piece[i]

		if (isDigit(before) !== isDigit(char)) odd++
		else if (isDigit(char)) continue
		else if (!isUpper(before) && isUpper(char)) odd++
		else if (!COMMON_PAIRS[before.toLowerCase().charCodeAt(0) - 97].includes(char.toLowerCase())) odd++
	}

	return odd / (piece.length - 1)
}

/**
 * На что похож кусок из букв и цифр. Короткий кусок не разобрать, поэтому он
 * `short`, если пишется как слово (`reset`, `Data`, `API`), и `bit`, если нет. Из
 * букв одного регистра -- слово или константа. Остальное -- `random`, если это hex
 * или в нём много мест, где слово так себя не ведёт.
 *
 * @param piece - Буквы и цифры.
 */
function pieceKind(piece) {
	if (/^\d+$/.test(piece)) return 'bit'
	if (piece.length < 6) return /^(?:[A-Z]?[a-z]+|[A-Z]+)$/.test(piece) ? 'short' : 'bit'
	if (/^[\da-f]+$/i.test(piece) && /\d/.test(piece) && /[a-f]/i.test(piece)) return 'random'
	if (/^(?:[a-z]+|[A-Z]+)$/.test(piece)) return 'word'

	return oddness(piece) >= 0.35 ? 'random' : 'word'
}

/**
 * Прячет случайную строку из подряд идущих кусков, если среди них нет слов, а хотя
 * бы один кусок случайный. Короткие слова и разделители по краям остаются (`/reset/`
 * перед токеном), но в длину идут соседний разделитель и короткий кусок за `-`, `_`
 * или `+`: у base64url они бывают и в начале, и в конце.
 *
 * @param pieces - Куски без слов и разделители между ними.
 * @param kinds - Что это за куски.
 */
function scrubTokenPieces(pieces, kinds) {
	const edge = (index) => kinds[index] === 'sep' || kinds[index] === 'short'
	let from = 0
	let to = pieces.length

	while (from < to && edge(from)) from++
	while (to > from && edge(to - 1)) to--

	if (!kinds.slice(from, to).includes('random')) return pieces.join('')

	let first = from
	let last = to

	if (first > 0) first--
	if (first > 0 && /^[-_+]$/.test(pieces[first])) first--
	if (last < pieces.length) last++
	if (last < pieces.length && /^[-_+]$/.test(pieces[last - 1])) last++

	if (pieces.slice(first, last).join('').length < 20) return pieces.join('')

	return pieces.slice(0, from).join('') + FILTERED + pieces.slice(to).join('')
}

/**
 * Случайные строки внутри куска: hex, UUID, base64, base64url, base32 и base36 от
 * 20 символов. Имена, слова и пути с хешем сборки (`index-BkS2x9aF.js`) остаются.
 *
 * @param run - Буквы и цифры, склеенные `-`, `_`, `+`, `/` и `=`.
 */
function scrubTokens(run) {
	const pieces = run.match(PIECE)
	const kinds = pieces.map((piece) => (/^[a-z\d]/i.test(piece) ? pieceKind(piece) : 'sep'))
	let result = ''

	for (let start = 0; start < pieces.length;) {
		let end = start

		while (end < pieces.length && kinds[end] !== 'word') end++

		if (end === start) {
			result += pieces[start++]
		} else {
			result += scrubTokenPieces(pieces.slice(start, end), kinds.slice(start, end))
			start = end
		}
	}

	return result
}

/**
 * Заменяет секреты в свободном тексте: логины в адресах, заголовки Authorization
 * и Cookie, пары с говорящим именем, значения параметров адресов, JWT и длинные
 * случайные строки. Порядок важен: сначала значения по имени, потом то, что похоже
 * на токен само.
 *
 * @param text - Текст ошибки, сообщения консоли или поля данных.
 */
export function scrubText(text) {
	const named = scrubPairs(text.replace(BEARER, `$1${FILTERED}`).replace(USERINFO, `${FILTERED}@`))

	return named
		.replace(QUERY_START, `$1${FILTERED}`)
		.replace(URL_PARAM, `$1${FILTERED}`)
		.replace(JWT, FILTERED)
		.replace(TOKEN_RUN, scrubTokens)
}

/**
 * Адрес без query и фрагмента, без логина и пароля и без токенов в пути.
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
		Object.entries(value).map(([key, item]) => [key, isSecretName(key) ? FILTERED : scrubData(item)]),
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
