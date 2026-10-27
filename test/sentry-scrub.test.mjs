import assert from 'node:assert/strict'
import test from 'node:test'

import { cleanBreadcrumb, scrubEvent, scrubText, scrubUrl } from '../site/sentry-scrub.js'

// Подписанный запрос входа, как его кладёт во фрагмент страница MCP-коннектора.
const signed = 'eyJjbGllbnRfaWQiOiJtY3AiLCJzdGF0ZSI6IjQyIn0.Vf3kQ9xLm2Rp8ZtB7wYc1HsN4aJd6GuE0qOi5TnKyXw'

test('file addresses and the page address lose the query and the fragment', () => {
	const page = 'https://site.example/page?token=1#top'
	const event = {
		exception: {
			values: [{ stacktrace: { frames: [{ filename: page, abs_path: page }, { filename: '<anonymous>' }] } }],
		},
		debug_meta: { images: [{ code_file: page }] },
		request: { url: 'https://site.example/page#top' },
	}

	const [frame, anonymous] = scrubEvent(event).exception.values[0].stacktrace.frames

	assert.equal(frame.filename, 'https://site.example/page')
	assert.equal(frame.abs_path, 'https://site.example/page')
	assert.equal(anonymous.filename, '<anonymous>')
	assert.equal(event.debug_meta.images[0].code_file, 'https://site.example/page')
	assert.deepEqual(event.request, { url: 'https://site.example/page' })
	assert.deepEqual(scrubEvent({ message: 'plain' }), { message: 'plain' })
})

test('the signed request in the fragment of an MCP connector page stays out of the event', () => {
	// Страница прочла фрагмент, убрала его из адреса и упала на разборе.
	const breadcrumb = cleanBreadcrumb({
		category: 'navigation',
		data: { from: `/connect#request=${signed}`, to: '/connect' },
	})
	const event = scrubEvent({
		exception: { values: [{ type: 'Error', value: `Bad sign-in request: #request=${signed}` }] },
		request: { url: `https://site.example/connect#request=${signed}` },
		breadcrumbs: [breadcrumb],
	})

	assert.equal(JSON.stringify(event).includes(signed.slice(0, 20)), false)
	assert.equal(event.exception.values[0].value, 'Bad sign-in request: #request=[Filtered]')
	assert.equal(event.request.url, 'https://site.example/connect')
	assert.deepEqual(event.breadcrumbs[0].data, { from: '/connect', to: '/connect' })
})

test('text loses headers, named secrets, values of URL parameters and tokens', () => {
	for (const [text, scrubbed] of [
		[
			'Failed at https://site.example/connect?code=abc&state=42#request=xyz',
			'Failed at https://site.example/connect?code=[Filtered]&state=[Filtered]#request=[Filtered]',
		],
		['Authorization: Bearer abc.def', 'Authorization: [Filtered]'],
		['{"Authorization":"Basic dXNlcjpwYXNz","Accept":"*/*"}', '{"Authorization":"[Filtered]","Accept":"*/*"}'],
		['retry with Bearer abc.def', 'retry with Bearer [Filtered]'],
		["document.cookie = 'sid=1; theme=dark'", "document.cookie = '[Filtered]'"],
		['Cookie: sid=1; theme=dark\nnext', 'Cookie: [Filtered]\nnext'],
		['password=hunter2 for ann', 'password=[Filtered] for ann'],
		['{"access_token": "abc", "page": 2}', '{"access_token": "[Filtered]", "page": 2}'],
		['Invalid session: 42', 'Invalid session: [Filtered]'],
		// Значение в кавычках целиком, с пробелами и запятыми.
		['{"password": "my secret phrase"}', '{"password": "[Filtered]"}'],
		["secretAnswer='first pet, Rex' given", "secretAnswer='[Filtered]' given"],
		// Пара внутри значения другой пары не прячется.
		['{"error":"api_key=abc"}', '{"error":"api_key=[Filtered]"}'],
		[`token ${signed}`, 'token [Filtered]'],
		['jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln', 'jwt [Filtered]'],
		['reset /reset/8f14e45fceea167a5a36dedd4bea2543 expired', 'reset /reset/[Filtered] expired'],
		['invite 550e8400-e29b-41d4-a716-446655440000', 'invite [Filtered]'],
		['id a1B2c3D4e5F6g7H8i9J0kLmN', 'id [Filtered]'],
	]) {
		assert.equal(scrubText(text), scrubbed, text)
		assert.equal(scrubText(scrubbed), scrubbed, `${text} once more`)
	}
})

test('text keeps words, names and plain addresses', () => {
	for (const text of [
		"Cannot read properties of undefined (reading 'map')",
		"Failed to execute 'drawImage' on 'OffscreenCanvasRenderingContext2D'",
		'WebGL2RenderingContext is not defined',
		`Unexpected token '<', "<!doctype "... is not valid JSON`,
		"Failed to read the 'sessionStorage' property from 'Window'",
		'Author: Ann',
		'https://site.example/_astro/page.astro_astro_type_script_index_0_lang.BkS2x9aF.js',
		'/blog/2024-annual-report-and-financial-statements#section-2',
		'body > div.data-astro-cid-j7pv25f6',
		'Failed to fetch (api.example.com)',
	]) {
		assert.equal(scrubText(text), text)
	}
})

test('a page address loses the query, the fragment and a token in the path', () => {
	assert.equal(
		scrubUrl(`https://site.example/invite/${signed.slice(-40)}?x=1#top`),
		'https://site.example/invite/[Filtered]',
	)
	assert.equal(scrubUrl('/about/#team'), '/about/')
})

test('the request keeps the address and headers without cookies, query, body and secrets', () => {
	const { request } = scrubEvent({
		request: {
			url: 'https://site.example/page?q=1',
			method: 'POST',
			cookies: { sid: '1' },
			query_string: 'q=1',
			data: { email: 'ann@example.com' },
			headers: {
				Authorization: 'Bearer abc',
				Cookie: 'sid=1',
				'X-CSRF-Token': 'abc',
				Referer: 'https://site.example/from?code=abc',
				'User-Agent': 'Mozilla/5.0',
			},
		},
	})

	assert.deepEqual(request, {
		url: 'https://site.example/page',
		headers: {
			Authorization: '[Filtered]',
			Cookie: '[Filtered]',
			'X-CSRF-Token': '[Filtered]',
			Referer: 'https://site.example/from?code=[Filtered]',
			'User-Agent': 'Mozilla/5.0',
		},
	})
})

test('serialized objects, log entries and console arguments lose secrets', () => {
	const event = scrubEvent({
		message: 'saved with token=abc',
		logentry: { message: 'saved %s', params: ['password=abc'] },
		// Так SDK присылает объект, брошенный вместо ошибки.
		extra: { __serialized__: { password: 'hunter2', user: { apiKey: 'abc', name: 'Ann' }, list: ['Bearer abc'] } },
		breadcrumbs: [
			{
				category: 'console',
				level: 'warning',
				message: 'retry Bearer abc',
				data: { logger: 'console', arguments: ['retry', { authToken: 'abc', step: 2 }] },
			},
			{ category: 'fetch', data: { method: 'GET', url: 'https://api.example/search?q=1#top', status_code: 200 } },
		],
	})

	assert.equal(event.message, 'saved with token=[Filtered]')
	assert.deepEqual(event.logentry, { message: 'saved %s', params: ['password=[Filtered]'] })
	assert.deepEqual(event.extra, {
		__serialized__: {
			password: '[Filtered]',
			user: { apiKey: '[Filtered]', name: 'Ann' },
			list: ['Bearer [Filtered]'],
		},
	})
	assert.equal(event.breadcrumbs[0].message, 'retry Bearer [Filtered]')
	assert.deepEqual(event.breadcrumbs[0].data.arguments, ['retry', { authToken: '[Filtered]', step: 2 }])
	assert.equal(event.breadcrumbs[1].data.url, 'https://api.example/search')
})

test('breadcrumbs keep requests and navigation without the query and the fragment', () => {
	const fetch = cleanBreadcrumb({
		category: 'fetch',
		data: { method: 'GET', url: 'https://api.example/search?q=secret#top', status_code: 200 },
	})

	assert.deepEqual(fetch.data, { method: 'GET', url: 'https://api.example/search', status_code: 200 })

	const xhr = cleanBreadcrumb({ category: 'xhr', data: { url: '/api?token=1' } })

	assert.equal(xhr.data.url, '/api')

	const navigation = cleanBreadcrumb({ category: 'navigation', data: { from: '/a?x=1', to: '/b#anchor' } })

	assert.deepEqual(navigation.data, { from: '/a', to: '/b' })

	const sentry = { category: 'sentry.event', message: 'Error: boom' }

	assert.equal(cleanBreadcrumb(sentry), sentry)

	const warning = cleanBreadcrumb({ category: 'console', level: 'warning', message: 'retry with token=abc' })

	assert.equal(warning.message, 'retry with token=[Filtered]')
})

test('breadcrumbs of clicks and input are dropped with their selectors', () => {
	for (const category of ['ui.click', 'ui.input', 'ui.keypress']) {
		assert.equal(cleanBreadcrumb({ category, message: 'body > form.login > input[name="email"]' }), null)
	}
})

test('console breadcrumbs keep only warnings and errors', () => {
	for (const level of ['log', 'info', 'debug']) {
		assert.equal(cleanBreadcrumb({ category: 'console', level, message: 'noise' }), null, level)
	}

	for (const level of ['warning', 'error']) {
		assert.equal(cleanBreadcrumb({ category: 'console', level, message: 'kept' }).message, 'kept', level)
	}
})

test('long text is scrubbed in linear time', () => {
	const size = 100_000
	const started = performance.now()

	for (const text of [
		'a'.repeat(size),
		'token'.repeat(size / 5),
		'eyJ'.repeat(size / 3),
		'?a'.repeat(size / 2),
		'a :'.repeat(size / 3),
		'Ab1'.repeat(size / 3),
		`cookie${' '.repeat(size)}`,
		'token:"'.repeat(size / 7),
	]) {
		scrubText(text)
	}

	// Линейно это миллисекунды, квадратично -- минуты.
	assert.ok(performance.now() - started < 1000)
})
