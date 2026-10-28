// `beforeSend` и `beforeBreadcrumb` для Sentry. Без SDK они не нужны, поэтому едут
// в его чанке (sentry-sdk.js), а не в модуле, который страница грузит сразу.

// Секреты тут не ищут: каждый новый формат такой поиск обходит. Событие
// собирается заново из полей по списку, остальное остаётся на странице.

const FILTERED = '[Filtered]'
// Строка обрезается раньше любой регулярки, и каждая проходит её за линейное время.
const URL_LIMIT = 2048
const TEXT_LIMIT = 256
// Имя хоста не длиннее 253 символов, с портом и скобками IPv6 чуть больше.
const HOST_LIMIT = 260

// Консоль сайта перед ошибкой полезна предупреждениями и ошибками, а `log` и `debug`
// пишут что угодно, в том числе чужие скрипты вроде Метрики.
const CONSOLE_LEVELS = new Set(['warning', 'error'])

// Адрес читается так же, как его читает браузер: управляющие символы и пробелы
// в начале он отбрасывает, а табы и переводы строк выкидывает отовсюду.
const LEADING = /^[\0- ]+/
const BREAKS = /[\t\n\r]/g
const SCHEME = /^[a-z][\w+.-]*:/i
// У этих схем `\` -- тоже слэш, и слэшей после схемы сколько угодно, хоть ни одного:
// `https:\\bob:pw@host`, `https:bob:pw@host` и `https:///bob:pw@host` -- адреса с паролем.
const SPECIAL = /^(?:https?|wss?|ftp|file):$/i
const SLASHES = /^[/\\]*/
const HOST_END = /[/\\?#]/
// У остальных схем (`postgres:`, `redis:`, `mongodb+srv:`) `\` -- обычный символ
// логина или пароля, и хост он не обрывает.
const OPAQUE_HOST_END = /[/?#]/
// Хост, каким он бывает у сайта: имя с точкой, `localhost`, IPv4 или IPv6 в скобках,
// и порт до пяти цифр. Логин с паролем, оборванный `/`, `?` или `#` в пароле
// (`deploy:2024`, `ci`), так не выглядит.
const HOST = /^(?:localhost|[\p{L}\p{N}_-]+(?:\.[\p{L}\p{N}_-]+)+\.?|\[[\da-f:.]+\])(?::\d{1,5})?$/iu
const HOST_LIKE = /^[\p{L}\p{N}_.:[\]-]*/u
// Источник адреса внутри `blob:`.
const ORIGIN = /^[a-z][\w+.-]*:\/\/[^/]+/i
// У `data:` остаётся только тип, содержимое после него выбрасывается.
const DATA_TYPE = /^data:([\w.+-]+\/[\w.+-]+)(?=[,;])/i

// `\/` из JSON, как его пишет PHP: в тексте это просто `/`.
const ESCAPED_SLASH = /(?<!\\)\\+\//g
// Начало адреса в тексте: `//` или `\\`, со схемой или без, а у схем, где браузер
// прощает слэши, -- схема и сколько угодно слэшей.
const TEXT_ADDRESS = /(?:(?<![\w+.-])[a-z][\w+.-]*:)?[/\\]{2}[/\\]*|(?<![\w+.-])(?:https?|wss?|ftp|file):[/\\]*/gi
// Query и фрагмент. У адреса `?` или `#` уходит со всем значением: `'` браузер не
// кодирует, и она его не обрывает, а `"` и `` ` `` кодирует. Сам по себе, как
// `location.hash` в тексте, -- только с `=` или `/`: `issue #42` и `Done?` остаются.
const TEXT_QUERY = /(?<=\S)[?#](?=\S)[^\s"`]*|(?<!\S)[?#](?=[^\s"`=/]*[=/])[^\s"`]*/g
// Слово, после которого в тексте может идти секрет. `auth` -- и в `oauth`,
// `authorization` и `authorisation`, но не в `author`.
const TELLING_WORD =
	/(?:passw|passphrase|passcode|pwd|secret|token|auth(?!or(?!i[sz]))|bearer|cookie|session|sessid|csrf|xsrf|jwt|api[\s_-]?key|private[\s_-]?key|credential|signature|otp)[a-z]*/i
const JWT = /\beyJ[\w-]{7,}(?:\.[\w-]*)*/g
// Случайная строка в base64, base64url и hex, в том числе с `%2F` из адреса: длинный
// прогон с цифрой и буквой.
const TOKEN_RUN = /[\w+/=%-]{32,}/g

// Файл, который браузер пишет в стек: адрес http(s), расширения или `blob:` без
// пробелов и кавычек, а у встроенных функций `<anonymous>` или `native`. Строки текста
// ошибки V8 тоже кладёт в стек, и SDK разбирает их как фреймы, а такие не похожи.
// Firefox дописывает к файлу кода из `new Function` и вставленных скриптов
// ` line 3 > Function`, а Safari прячет адреса расширений за `webkit-masked-url://hidden/`.
const FRAME_ADDRESS =
	/^(?:(?:blob:)?https?:\/\/[^/\s"'`<>\\]+|[a-z-]+-extension:\/\/[^/\s"'`<>\\]*)(?:\/[\w.~!$&()*+,;=:@%[\]/-]*)?(?: line \d{1,9} > (?:Function|injectedScript|eval))*$|^blob:$/i
// Хоста у него нет, и `cleanUrl` оставил бы одну схему, а по этому адресу Sentry
// узнаёт ошибки расширений Safari.
const MASKED = 'webkit-masked-url://hidden/'
const BUILTIN_FILE = /^(?:<anonymous>|native|\[native code\])$/
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

const integer = (value) => (Number.isInteger(value) ? value : undefined)

const random = (run) => /\d/.test(run) && /[a-z]/i.test(run)

// JWT или длинная случайная строка, которые в тексте стали бы `[Filtered]`.
const hasToken = (text) => text.search(JWT) >= 0 || (text.match(TOKEN_RUN) ?? []).some(random)

// Всё до первого совпадения или вся строка, если его нет.
const before = (text, pattern) => {
	const end = text.search(pattern)

	return end < 0 ? text : text.slice(0, end)
}

/**
 * Хост адреса с логином, паролем и портом: всё до пути, query или фрагмента.
 *
 * @param rest - Адрес без схемы и слэшей.
 * @param special - У схемы `\` -- тоже слэш.
 */
const authority = (rest, special) => before(rest, special ? HOST_END : OPAQUE_HOST_END)

const isHost = (host) => host.length <= HOST_LIMIT && HOST.test(host)

/**
 * Где в адресе начинается хост. Сначала -- после последнего `@` до пути, как у
 * браузера. Если и тогда хост не похож на хост (`deploy:20241028`), его оборвал
 * `/`, `?` или `#` в пароле раньше `@`, и хост начинается после последнего `@` вообще.
 *
 * @param rest - Адрес без схемы и слэшей.
 * @param special - У схемы `\` -- тоже слэш.
 */
function hostStart(rest, special) {
	const start = authority(rest, special).lastIndexOf('@') + 1

	return isHost(authority(rest.slice(start), special)) ? start : rest.lastIndexOf('@') + 1
}

/**
 * Адрес без логина с паролем, query и фрагмента. Если хост так и не похож на хост,
 * например граница в 2048 символов отрезала его от `@`, остаётся одна схема.
 *
 * @param head - Адрес, обрезанный и выровненный, как у браузера.
 */
function address(head) {
	const scheme = SCHEME.exec(head)?.[0] ?? ''
	let rest = head.slice(scheme.length)
	let slashes = SLASHES.exec(rest)[0]
	const special = !scheme || SPECIAL.test(scheme)

	if (!special) {
		// У других схем хост бывает только после `//`: от `about:` и `mailto:` остаётся схема.
		if (!rest.startsWith('//')) return scheme.toLowerCase()

		slashes = '//'
	} else if (!scheme && slashes.length < 2) {
		return before(head, /[?#]/)
	}

	rest = rest.slice(slashes.length)
	if (special) rest = rest.replaceAll('\\', '/')
	rest = rest.slice(hostStart(rest, special))

	const prefix = `${scheme.toLowerCase()}//`

	return isHost(authority(rest, special)) ? prefix + before(rest, /[?#]/) : prefix
}

/**
 * Адрес без query и фрагмента, без логина и пароля. От `data:` остаётся тип, от
 * `blob:` -- источник. Путь остаётся как есть: по нему Sentry ищет source maps.
 *
 * @param url - Адрес страницы, запроса, перехода или файла в стеке.
 */
export function cleanUrl(url) {
	if (typeof url !== 'string') return undefined

	const head = url.slice(0, URL_LIMIT).replace(LEADING, '').replace(BREAKS, '')

	if (/^data:/i.test(head)) return `data:${DATA_TYPE.exec(head)?.[1] ?? ''}`

	if (/^blob:/i.test(head)) return `blob:${ORIGIN.exec(address(head.slice(5)))?.[0] ?? ''}`

	return address(head)
}

/**
 * Первые 256 символов текста без многоточия. Слово, которое рассекла граница, уходит
 * целиком: без конца у адреса нет `@`, по которому срезается пароль, а у длинного
 * токена -- длины, по которой его узнают.
 *
 * @param text - Текст любой длины.
 */
function cut(text) {
	if (text.length <= TEXT_LIMIT) return text

	let end = TEXT_LIMIT - 1

	if (/\S/.test(text[end])) while (end > 0 && /\S/.test(text[end - 1])) end--

	return text.slice(0, end)
}

/**
 * Текст, где у адресов нет логина с паролем: всё от слэшей до хоста, найденного
 * так же, как в `cleanUrl`, только в пределах слова. Логин или пароль с пробелом
 * (`https://deploy:correct horse@host`, `https://correct horse@host`) рвёт адрес
 * раньше `@`, и тогда они тянутся до первого `@` дальше в тексте. Если граница
 * отрезала этот `@`, уходит всё до конца текста.
 *
 * @param text - Обрезанный текст.
 * @param more - Граница отрезала конец текста.
 */
function withoutUserinfo(text, more) {
	let clean = ''
	let done = 0
	// Хост, слово с последним `@` в нём и ближайший `@` за словом каждый просмотрен
	// по разу: адрес за адресом в одном слове не должны стоить квадрат.
	let seen = 0
	let wordEnd = -1
	let wordAt = -1
	let nextAt = -1

	for (const match of text.matchAll(TEXT_ADDRESS)) {
		if (match.index < Math.max(done, seen)) continue

		const from = match.index + match[0].length
		// Адрес без схемы читается от адреса страницы, а у неё схема `http(s)`.
		const special = !SCHEME.test(match[0]) || SPECIAL.test(SCHEME.exec(match[0])[0])

		if (from > wordEnd) {
			const word = before(text.slice(from), /\s/)

			wordEnd = from + word.length
			wordAt = from + word.lastIndexOf('@')
		}

		const host = authority(text.slice(from, wordEnd), special)
		const at = host.lastIndexOf('@')
		let start = from + at + 1

		seen = from + host.length

		if (!isHost(host.slice(at + 1))) {
			if (wordAt >= from) {
				start = wordAt + 1
			} else if (host && !isHost(HOST_LIKE.exec(host)[0])) {
				// `HOST_LIKE`: запятая или скобка после `localhost:4411` хост не портят.
				if (nextAt < wordEnd) {
					const next = text.indexOf('@', wordEnd)

					nextAt = next < 0 ? text.length : next
				}

				// Без `:` это логин, а не пароль, и браузер считает его логином, только
				// если до `@` нет пути: `http://intranet/x, ask ann@host` остаётся.
				const userinfo =
					host.includes(':') || !(special ? HOST_END : OPAQUE_HOST_END).test(text.slice(from, nextAt))

				if (userinfo && nextAt < text.length) {
					start = nextAt + before(text.slice(nextAt), /\s/).lastIndexOf('@') + 1
				} else if (userinfo && more) {
					start = text.length
				}
			}
		}

		if (start > from) {
			clean += text.slice(done, from)
			done = start
		}
	}

	return clean + text.slice(done)
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

	const head = cut(text)
	const more = head.length < text.length
	let clean = withoutUserinfo(head.replace(ESCAPED_SLASH, '/'), more).replace(TEXT_QUERY, '')

	if (more) clean += '…'

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

// Адрес скрипта в стеке всегда со строкой, а встроенная функция бывает и без неё.
const isFrameFile = (file, lineno) =>
	BUILTIN_FILE.test(file) || (lineno !== undefined && (file === MASKED || FRAME_ADDRESS.test(file)))

const frameFile = (file) => (file === MASKED ? file : cleanUrl(file))

/**
 * Фрейм стека: файл, функция и место в коде. Строк исходника и переменных нет.
 * Фрейм, файл которого не похож на скрипт, -- это строка текста ошибки, и он
 * выбрасывается целиком: SDK ещё и подставляет его файл соседним фреймам без файла.
 *
 * @param frame - Фрейм из стектрейса SDK.
 */
function cleanFrame(frame) {
	const filename = frameFile(frame.filename)
	const abs_path = frameFile(frame.abs_path)
	const lineno = integer(frame.lineno)

	if ([filename, abs_path].some((file) => file && !isFrameFile(file, lineno))) return undefined

	return defined({
		filename,
		abs_path,
		function: cleanName(frame.function),
		module: cleanName(frame.module),
		lineno,
		colno: integer(frame.colno),
		in_app: frame.in_app,
		platform: frame.platform,
	})
}

/**
 * Фреймы без строк текста ошибки. V8 кладёт в стек весь текст, и строку, которая
 * кончается адресом со строкой (`Reset link https://host/<jwt>:1`), SDK разбирает
 * как фрейм с этим адресом, похожим на скрипт. Такой фрейм узнаётся по тому, что
 * его `файл:строка` стоит в тексте, и выбрасывается вместе со всеми фреймами
 * с тем же файлом: его SDK подставляет фреймам без файла.
 *
 * @param frames - Фреймы из стектрейса SDK.
 * @param texts - Тексты ошибки как есть, до чистки.
 */
function ownFrames(frames, texts) {
	const fromText = new Set(
		frames
			.filter(
				({ filename, lineno }) =>
					typeof filename === 'string' &&
					filename &&
					texts.some((text) => text.includes(`${filename}:${lineno}`)),
			)
			.map(({ filename }) => filename),
	)

	return frames.filter(({ filename, abs_path }) => !fromText.has(filename) && !fromText.has(abs_path))
}

/**
 * Исключение: тип, текст, как поймано, и стек. `data` механизма не отправляется.
 *
 * @param exception - Исключение из `event.exception.values`.
 * @param texts - Текст исходной ошибки из подсказки: в стеке он такой, как есть.
 */
const cleanException = ({ type, value, mechanism, stacktrace }, texts) =>
	defined({
		type: typeof type === 'string' && ERROR_TYPE.test(type) && !hasToken(type) ? type : 'Error',
		value: cleanText(value),
		mechanism: mechanism && pick(mechanism, MECHANISM_KEYS),
		stacktrace: stacktrace?.frames && {
			frames: ownFrames(
				stacktrace.frames,
				[value, ...texts].filter((text) => typeof text === 'string'),
			)
				.map(cleanFrame)
				.filter(Boolean),
		},
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

	const texts = [hint?.originalException?.message]

	return (
		defined({
			...pick(event, EVENT_KEYS),
			transaction: cleanUrl(event.transaction),
			message: cleanText(event.message),
			logentry: event.logentry && defined({ message: cleanText(event.logentry.message) }),
			exception: event.exception?.values && {
				values: event.exception.values.map((exception) => cleanException(exception, texts)),
			},
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
