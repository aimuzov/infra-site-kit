import assert from 'node:assert/strict'
import test from 'node:test'

import { cleanBreadcrumb, cleanText, cleanUrl, scrubEvent } from '../site/sentry-scrub.js'

// Подписанный запрос входа, как его кладёт во фрагмент страница MCP-коннектора.
const signed = 'eyJjbGllbnRfaWQiOiJtY3AiLCJzdGF0ZSI6IjQyIn0.Vf3kQ9xLm2Rp8ZtB7wYc1HsN4aJd6GuE0qOi5TnKyXw'

/** Текст чистится как ожидается, и второй проход его уже не меняет. */
function assertCleans(cases) {
	for (const [text, clean] of cases) {
		assert.equal(cleanText(text), clean, text)
		assert.equal(cleanText(clean), clean, `${text} once more`)
	}
}

test('an address loses the query, the fragment and the user info', () => {
	for (const [url, clean] of [
		[`https://site.example/connect?code=1#request=${signed}`, 'https://site.example/connect'],
		['https://bob:hunter2@api.example.com/v1/me?x=1', 'https://api.example.com/v1/me'],
		['https://bob:p@ss@api.example.com/v1', 'https://api.example.com/v1'],
		['//bob@cdn.example.com/a.js', '//cdn.example.com/a.js'],
		// Пароль с `/`, `?` или `#` обрывает хост раньше `@`: так адрес приходит в fetch.
		['https://deploy:AbC/dEf+GhI=@api.example.com/v1/items', 'https://api.example.com/v1/items'],
		['https://bob:pa#ss@api.example.com/v1', 'https://api.example.com/v1'],
		['https://bob:pa?ss@api.example.com/v1#top', 'https://api.example.com/v1'],
		['  https://bob:hunter2@api.example.com/v1', 'https://api.example.com/v1'],
		// `@` в пути после настоящего хоста -- не пароль.
		[
			'https://cdn.jsdelivr.net/npm/@sentry/browser@11.8.0/build/bundle.min.js',
			'https://cdn.jsdelivr.net/npm/@sentry/browser@11.8.0/build/bundle.min.js',
		],
		['https://bob:hunter2@unpkg.com/react@19.0.0/index.js', 'https://unpkg.com/react@19.0.0/index.js'],
		['http://[::1]:8080/@ann', 'http://[::1]:8080/@ann'],
		['https://пример.рф/@ann', 'https://пример.рф/@ann'],
		['/ui/missing?key=1#top', '/ui/missing'],
		['/about/#team', '/about/'],
		// Путь остаётся как есть: по нему Sentry ищет source maps.
		[
			'https://site.example/_astro/page.astro_astro_type_script_index_0_lang.BkS2x9aF.js',
			'https://site.example/_astro/page.astro_astro_type_script_index_0_lang.BkS2x9aF.js',
		],
		['<anonymous>', '<anonymous>'],
		['data:text/javascript;base64,cGFzc3dvcmQ9aHVudGVyMg==', 'data:text/javascript'],
		['data:application/json,{"password":"hunter2"}', 'data:application/json'],
		['data:,hunter2', 'data:'],
		['blob:https://bob:hunter2@site.example:8080/550e8400-e29b-41d4', 'blob:https://site.example:8080'],
		['blob:https://deploy:AbC/dEf@site.example/550e8400-e29b-41d4', 'blob:https://site.example'],
		['blob:null/550e8400-e29b-41d4', 'blob:'],
	]) {
		assert.equal(cleanUrl(url), clean, url)
	}

	assert.equal(cleanUrl(`https://site.example/${'a'.repeat(3000)}`).length, 2048)
	assert.equal(cleanUrl(42), undefined)
	assert.equal(cleanUrl(undefined), undefined)
})

test('text is cut to 256 characters before anything else', () => {
	const clean = cleanText(`Failed ${'a '.repeat(200)}`)

	assert.equal(clean.length, 256)
	assert.ok(clean.endsWith('…'))
	assert.equal(cleanText('short'), 'short')
	assert.equal(cleanText({ message: 'password=hunter2' }), undefined)
	assert.equal(cleanText(42), undefined)
	// Секрет за пределами первых 256 символов отрезан вместе с хвостом.
	assert.equal(cleanText(`${'x'.repeat(300)} hunter2`).includes('hunter2'), false)
})

test('a word the cut runs through goes whole', () => {
	const pad = (text, length) => text.padEnd(length, '.')
	const url = 'https://deploy:Hunter2Hunter2Pw@api.example.com/v1'
	const token = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b'

	// Без `@` за границей пароль не узнать, а без длины -- токен.
	for (const at of [10, 31, 40]) {
		const prefix = `${pad('Upstream failed at', 255 - at)} `

		assert.equal(cleanText(`${prefix}${url} then`), `${prefix}…`, `url cut after ${at}`)
		assert.equal(cleanText(`${prefix}${token} then`), `${prefix}…`, `token cut after ${at}`)
	}

	// Слово, которое кончилось до границы, остаётся.
	const whole = `${pad('Failed', 250)} word ${'x'.repeat(40)}`

	assert.equal(cleanText(whole), `${pad('Failed', 250)} word…`)
	assert.equal(cleanText('x'.repeat(300)), '…')
})

test('addresses in text lose the user info, the query and the fragment', () => {
	assertCleans([
		['Failed at https://bob:hunter2@api.example.com/v1 now', 'Failed at https://api.example.com/v1 now'],
		[
			'Failed at https://site.example/connect?code=abc&state=42#request=xyz now',
			'Failed at https://site.example/connect now',
		],
		['GET /api/search?q=hunter2&page=2 failed', 'GET /api/search failed'],
		['see page.html#request=abc then', 'see page.html then'],
		// Во фрагменте браузер оставляет `'`, `(` и `)` как есть, значение они не обрывают.
		["Failed (https://site.example/c#request=AAAA'hunter2(and)more) then", 'Failed (https://site.example/c then'],
		['{"url":"https://site.example/?q=hunter2","page":2}', '{"url":"https://site.example/","page":2}'],
		[
			'Failed to parse URL from https://deploy:AbC/dEf+GhI=@api.example.com/v1/items',
			'Failed to parse URL from https://api.example.com/v1/items',
		],
		['Failed (https://bob:pa#ss@api.example.com/v1) then', 'Failed (https://api.example.com/v1) then'],
		// `location.search` и `location.hash`, вставленные в текст сами по себе.
		['Bad sign-in request: #code=482173&state=Xk29fQ', 'Bad sign-in request: '],
		['?code=482173&state=Xk29fQ', ''],
		['Sign-in failed ?code=a1b2c3&state=xyz', 'Sign-in failed '],
		['Bad route #/invite/K7d9x2 here', 'Bad route  here'],
		['Done?', 'Done?'],
		['Done? Yes', 'Done? Yes'],
		['issue #42 is open', 'issue #42 is open'],
		['C# and F#', 'C# and F#'],
		[
			'Failed at https://cdn.jsdelivr.net/npm/@sentry/browser@11.8.0/x.js',
			'Failed at https://cdn.jsdelivr.net/npm/@sentry/browser@11.8.0/x.js',
		],
	])
})

test('after a telling word everything to the end of the text goes', () => {
	assertCleans([
		['password=hunter2 for ann', 'password [Filtered]'],
		['Login failed: passWord: correct horse battery staple', 'Login failed: passWord [Filtered]'],
		['{"user":"bob","passphrase":"correct horse"}', '{"user":"bob","passphrase [Filtered]'],
		['{"access_token": "abc", "page": 2}', '{"access_token [Filtered]'],
		['Authorization: Basic Ym9iOmh1bnRlcjI=', 'Authorization [Filtered]'],
		['Authorisation: Basic Ym9iOmh1bnRlcjI=', 'Authorisation [Filtered]'],
		['Not authorised: ann@example.com', 'Not authorised [Filtered]'],
		['PHPSESSID=8a1f2e', 'PHPSESSID [Filtered]'],
		['retry with Bearer abc.def', 'retry with Bearer [Filtered]'],
		["document.cookie = 'sid=1; theme=dark'", 'document.cookie [Filtered]'],
		['Invalid session: 42', 'Invalid session [Filtered]'],
		['pwd=hunter2', 'pwd [Filtered]'],
		['{"otp":"482173"}', '{"otp [Filtered]'],
		['OAuth state mismatch: af0ifjsldkj', 'OAuth [Filtered]'],
		['X-CSRF-Token: abc', 'X-CSRF [Filtered]'],
		['jwt expired at 12:00', 'jwt [Filtered]'],
		['{"private key": "MC4CAQAw"}', '{"private key [Filtered]'],
		['Invalid credentials for bob', 'Invalid credentials [Filtered]'],
		['bad signature 1f2e', 'bad signature [Filtered]'],
		// Экранированный `\n` в JSON и значение в несколько строк конец не обрывают.
		['Save failed {"secret":"a\\nb","page":2}', 'Save failed {"secret [Filtered]'],
		['token: first line\nsecond line', 'token [Filtered]'],
		// Слово в конце текста ничего за собой не прячет.
		['Invalid token', 'Invalid token'],
	])

	for (const spelling of ['api_key', 'apiKey', 'api-key', 'API key', 'APIKEY']) {
		assert.equal(cleanText(`${spelling}=abc`), `${spelling} [Filtered]`, spelling)
	}

	assert.equal(cleanText('Author: Ann'), 'Author: Ann')
	assert.equal(cleanText('Certificate authority is invalid'), 'Certificate authority is invalid')
})

test('JWTs and long random strings go', () => {
	assertCleans([
		[`token ${signed}`, 'token [Filtered]'],
		[`request ${signed} failed`, 'request [Filtered] failed'],
		['header eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln ok', 'header [Filtered] ok'],
		['reset /reset/8f14e45fceea167a5a36dedd4bea2543 expired', 'reset [Filtered] expired'],
		['key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY1 ok', 'key [Filtered] ok'],
		['id a1B2c3D4e5F6g7H8i9J0kLmNa1B2c3D4e5F6 here', 'id [Filtered] here'],
	])

	// Без цифры или без буквы прогон -- не случайная строка, и короче 32 он тоже остаётся.
	for (const text of [
		'internationalization_and_localization_tools',
		'12345678901234567890123456789012345',
		'id a1B2c3D4e5F6g7H8i9J0 here',
	]) {
		assert.equal(cleanText(text), text)
	}
})

test('plain error text still reads', () => {
	for (const text of [
		"Cannot read properties of undefined (reading 'map')",
		"Failed to execute 'drawImage' on 'CanvasRenderingContext2D'",
		'WebGL2RenderingContext is not defined',
		'Failed to fetch (api.example.com)',
		'net::ERR_CONNECTION_REFUSED',
		'Author: Ann',
	]) {
		assert.equal(cleanText(text), text)
	}
})

test('an event is built only of the fields on the list', () => {
	const page = `https://bob:hunter2@site.example/connect?code=1#request=${signed}`
	const token = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b'
	const hint = { attachments: [{ filename: 'state.json', data: '{"password":"hunter2"}' }] }
	const event = scrubEvent(
		{
			event_id: 'a1b2',
			timestamp: 1_700_000_000,
			level: 'error',
			platform: 'javascript',
			release: 'site@1.2.3',
			environment: 'production',
			sdk: { name: 'sentry.javascript.browser', version: '11.8.0', integrations: ['Breadcrumbs'] },
			sdkProcessingMetadata: { dynamicSamplingContext: { trace_id: 'f00d' } },
			transaction: '/connect?code=1',
			message: 'saved with token=abc',
			logentry: { message: 'saved %s', params: ['password=abc'] },
			exception: {
				values: [
					{
						type: 'TokenExpiredError',
						value: 'jwt expired',
						module: 'auth',
						mechanism: {
							type: 'onerror',
							handled: false,
							exception_id: 1,
							parent_id: 0,
							source: 'cause',
							data: { password: 'hunter2' },
						},
						stacktrace: {
							frames: [
								{
									filename: page,
									abs_path: page,
									function: 'HTMLButtonElement.<anonymous>',
									module: 'login',
									lineno: 1,
									colno: 2,
									in_app: true,
									platform: 'javascript',
									pre_context: ['const password = "hunter2"'],
									context_line: 'login(password)',
									post_context: ['}'],
									vars: { password: 'hunter2' },
								},
								{ filename: '<anonymous>', function: 'new Foo' },
								{ function: 'Object.foo [as bar]' },
								{ function: 'password hunter2' },
								{ function: 'render\n\thunter2' },
								{ function: 'a'.repeat(201) },
								// Имя из вычисляемого ключа: `{ [token]: () => {} }`.
								{ function: `Object.${token}`, lineno: 3 },
							],
						},
					},
					{
						type: 'Error: password=hunter2',
						value: 'boom',
						mechanism: {
							type: 'chained',
							handled: true,
							synthetic: true,
							exception_id: 0,
							is_exception_group: true,
						},
					},
					{ value: 'boom' },
					{ type: `T${token}`, value: 'boom' },
					{ type: 'eyJhbGciOiJIUzI1NiJ9', value: 'boom' },
				],
			},
			breadcrumbs: [
				{ category: 'ui.click', message: 'body > form.login > input[name="password"]' },
				{
					timestamp: 1,
					category: 'console',
					level: 'warning',
					message: 'retry Bearer abc',
					data: { logger: 'console', arguments: ['retry', { authToken: 'abc' }] },
				},
			],
			request: {
				url: page,
				method: 'POST',
				cookies: { sid: '1' },
				query_string: 'code=1',
				data: { email: 'ann@example.com' },
				headers: {
					Authorization: 'Bearer abc',
					Cookie: 'sid=1',
					Referer: 'https://site.example/from?code=abc',
					'User-Agent': 'Mozilla/5.0',
				},
			},
			contexts: {
				trace: { trace_id: 'f00d', span_id: 'beef', parent_span_id: 'cafe', data: { password: 'hunter2' } },
				culture: { locale: 'ru-RU', timezone: 'Europe/Moscow' },
			},
			tags: { section: 'blog', 'note.text': 'token=abc', 'bad key': 'x', count: 2 },
			debug_meta: { images: [{ type: 'sourcemap', debug_id: 'd1', code_file: page, extra: 'x' }] },
			// Так SDK присылает объект, брошенный вместо ошибки.
			extra: { __serialized__: { password: 'hunter2' } },
			user: { email: 'ann@example.com', ip_address: '1.2.3.4' },
			fingerprint: ['hunter2'],
			modules: { react: '19' },
			unknown: 'hunter2',
		},
		hint,
	)

	const clean = 'https://site.example/connect'

	assert.deepEqual(event, {
		event_id: 'a1b2',
		timestamp: 1_700_000_000,
		level: 'error',
		platform: 'javascript',
		release: 'site@1.2.3',
		environment: 'production',
		sdk: { name: 'sentry.javascript.browser', version: '11.8.0', integrations: ['Breadcrumbs'] },
		sdkProcessingMetadata: { dynamicSamplingContext: { trace_id: 'f00d' } },
		transaction: '/connect',
		message: 'saved with token [Filtered]',
		logentry: { message: 'saved %s' },
		exception: {
			values: [
				{
					type: 'TokenExpiredError',
					value: 'jwt [Filtered]',
					mechanism: { type: 'onerror', handled: false, exception_id: 1, parent_id: 0, source: 'cause' },
					stacktrace: {
						frames: [
							{
								filename: clean,
								abs_path: clean,
								function: 'HTMLButtonElement.<anonymous>',
								module: 'login',
								lineno: 1,
								colno: 2,
								in_app: true,
								platform: 'javascript',
							},
							{ filename: '<anonymous>', function: 'new Foo' },
							{ function: 'Object.foo [as bar]' },
							{ lineno: 3 },
						],
					},
				},
				{
					type: 'Error',
					value: 'boom',
					mechanism: {
						type: 'chained',
						handled: true,
						synthetic: true,
						exception_id: 0,
						is_exception_group: true,
					},
				},
				{ type: 'Error', value: 'boom' },
				{ type: 'Error', value: 'boom' },
				{ type: 'Error', value: 'boom' },
			],
		},
		breadcrumbs: [{ timestamp: 1, category: 'console', level: 'warning', message: 'retry Bearer [Filtered]' }],
		request: { url: clean, headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://site.example/from' } },
		contexts: { trace: { trace_id: 'f00d', span_id: 'beef', parent_span_id: 'cafe' } },
		tags: { section: 'blog', 'note.text': 'token [Filtered]' },
		debug_meta: { images: [{ type: 'sourcemap', debug_id: 'd1', code_file: clean }] },
	})
	assert.equal(JSON.stringify(event).includes('hunter2'), false)
	assert.equal(JSON.stringify(event).includes(token), false)
	// Вложения из scope SDK кладёт в конверт из подсказки уже после `beforeSend`.
	assert.equal(hint.attachments, undefined)
})

test('frames keep the function names V8, Firefox and Safari write', () => {
	const kept = [
		'A.get x [as x]',
		'get x',
		'Object.set value [as value]',
		'Foo.#open',
		'#e',
		'Function.<static_initializer>',
		'Корзина.добавить',
		'ж',
		'async*loadThing',
		'async Promise.all',
		'global code',
		'Array.prototype.map',
		'Object.[Symbol.iterator]',
	]
	const dropped = [
		'?',
		'get  x',
		'global code hunter2',
		'Object.foo [as bar] hunter2',
		'Object.eyJhbGciOiJIUzI1NiJ9',
		'handlers.Kx9bT2mQpL0vW7zYc3NfA8sDe4G5h6J7',
	]
	const functions = (names) =>
		scrubEvent({
			exception: { values: [{ stacktrace: { frames: names.map((name) => ({ function: name, lineno: 1 })) } }] },
		}).exception.values[0].stacktrace.frames.map((frame) => frame.function)

	assert.deepEqual(functions(kept), kept)
	assert.deepEqual(
		functions(dropped),
		dropped.map(() => undefined),
	)
})

test('an event without optional fields stays small', () => {
	assert.deepEqual(scrubEvent({ event_id: 'a1b2', message: 'plain' }), { event_id: 'a1b2', message: 'plain' })
	assert.deepEqual(
		scrubEvent({ event_id: 'a1b2', request: { headers: { Cookie: 'sid=1' } }, tags: { 'a b': 'x' } }),
		{
			event_id: 'a1b2',
		},
	)
})

test('breadcrumbs keep requests and navigation without the query and the fragment', () => {
	assert.deepEqual(
		cleanBreadcrumb({
			timestamp: 1,
			category: 'fetch',
			type: 'http',
			level: 'warning',
			data: {
				method: 'GET',
				url: 'https://api.example/search?q=secret#top',
				status_code: 404,
				request_body_size: 10,
				__span: 'abc',
			},
		}),
		{
			timestamp: 1,
			category: 'fetch',
			type: 'http',
			level: 'warning',
			data: { method: 'GET', url: 'https://api.example/search', status_code: 404 },
		},
	)
	assert.deepEqual(
		cleanBreadcrumb({ category: 'xhr', data: { url: 'https://bob:hunter2@api.example/me?token=1' } }),
		{
			category: 'xhr',
			data: { url: 'https://api.example/me' },
		},
	)
	// fetch получает адрес строкой как есть, и SDK пишет его в крошку до разбора.
	assert.deepEqual(
		cleanBreadcrumb({
			category: 'fetch',
			level: 'error',
			data: { method: 'GET', url: 'https://deploy:AbC/dEf+GhI=@api.example.com/v1/items' },
		}),
		{ category: 'fetch', level: 'error', data: { method: 'GET', url: 'https://api.example.com/v1/items' } },
	)
	assert.deepEqual(
		cleanBreadcrumb({ category: 'navigation', data: { from: `/connect#request=${signed}`, to: '/b?x=1' } }),
		{ category: 'navigation', data: { from: '/connect', to: '/b' } },
	)
	// Метод и статус только в своём виде.
	assert.deepEqual(cleanBreadcrumb({ category: 'fetch', data: { method: 'GET password', status_code: '200' } }), {
		category: 'fetch',
	})
	assert.deepEqual(cleanBreadcrumb({ category: 'sentry.event', message: 'Error: boom', event_id: 'a1b2' }), {
		category: 'sentry.event',
		message: 'Error: boom',
	})
})

test('breadcrumbs of clicks and input are dropped with their selectors', () => {
	for (const category of ['ui.click', 'ui.input', 'ui.keypress']) {
		assert.equal(cleanBreadcrumb({ category, message: 'body > form.login > input[name="email"]' }), null)
	}
})

test('console breadcrumbs keep only warnings and errors, and only their text', () => {
	for (const level of ['log', 'info', 'debug']) {
		assert.equal(cleanBreadcrumb({ category: 'console', level, message: 'noise' }), null, level)
	}

	for (const level of ['warning', 'error']) {
		assert.deepEqual(
			cleanBreadcrumb({
				category: 'console',
				level,
				message: 'retry with [object Object] token=abc',
				data: { logger: 'console', arguments: ['retry with', { authToken: 'abc' }, 'token=abc'] },
			}),
			{ category: 'console', level, message: 'retry with [object Object] token [Filtered]' },
			level,
		)
	}
})

test('long and adversarial input is cleaned in linear time', () => {
	const size = 1_000_000
	const inputs = [
		'a'.repeat(size),
		'token'.repeat(size / 5),
		'eyJ'.repeat(size / 3),
		'?a'.repeat(size / 2),
		'#'.repeat(size),
		'//'.repeat(size / 2),
		'//a:'.repeat(size / 4),
		'@/'.repeat(size / 2),
		'a1'.repeat(size / 2),
		'Ab1+'.repeat(size / 4),
		'data:'.repeat(size / 5),
		`blob:https://${'a'.repeat(size)}`,
		`https://${'a:'.repeat(size / 2)}`,
		`https://a:b/${'@/'.repeat(size / 2)}`,
		'//a:b/'.repeat(size / 6),
		' #a/'.repeat(size / 4),
		`api${' '.repeat(size)}key`,
		// Имена функций: точки, `get` и `[as` между частями.
		'a.'.repeat(size / 2),
		'a.get '.repeat(size / 6),
		`a [as ${'b.'.repeat(size / 2)}`,
	]
	const started = performance.now()

	for (const input of inputs) {
		cleanText(input)
		cleanUrl(input)
		scrubEvent({
			exception: {
				values: [{ type: input, value: input, stacktrace: { frames: [{ filename: input, function: input }] } }],
			},
			breadcrumbs: [{ category: 'fetch', message: input, data: { method: input, url: input } }],
			tags: { tag: input },
		})
	}

	// Те же формы в пределах обрезки, много раз: квадратичная регулярка тут заметна.
	for (const input of inputs) {
		const head = input.slice(0, 256)
		const name = input.slice(0, 200)

		for (let i = 0; i < 2000; i++) {
			cleanText(head)
			cleanUrl(head)
			scrubEvent({ exception: { values: [{ type: name, stacktrace: { frames: [{ function: name }] } }] } })
		}
	}

	// Линейно это десятки миллисекунд, квадратично -- минуты.
	assert.ok(performance.now() - started < 2000)
})
