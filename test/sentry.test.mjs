import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { bootSentry, sentryOptions, stripFileQueries } from '../site/sentry-boot.js'
import { parseDsn, sentryCsp, siteRelease } from '../site/sentry.js'

const dsn = 'https://abc123@o42.ingest.us.sentry.io/7'
const config = { dsn, release: 'site@1.2.3', environment: 'production' }

// Заглушка страницы: слушатели окна, отложенный запуск руками и SDK,
// который записывает, что ему передали.
const page = (readyState = 'loading') => {
	const listeners = {}
	const idle = []
	const sdk = { options: null, captured: [] }
	const win = {
		document: { readyState },
		addEventListener: (name, fn) => (listeners[name] = fn),
		removeEventListener: (name, fn) => listeners[name] === fn && delete listeners[name],
		requestIdleCallback: (fn) => idle.push(fn),
	}
	const load = async () => ({
		init: (options) => (sdk.options = options),
		captureException: (error, hint) => sdk.captured.push({ error, hint }),
	})
	const run = () => Promise.all(idle.splice(0).map((fn) => fn()))

	return { win, load, listeners, idle, sdk, run }
}

test('the SDK loads only after load, when the browser is idle', async () => {
	const { win, load, listeners, idle, sdk, run } = page()

	bootSentry(config, { win, load })
	assert.equal(idle.length, 0)

	listeners.load()
	assert.equal(idle.length, 1)
	assert.equal(sdk.options, null)

	await run()
	assert.equal(sdk.options.dsn, dsn)
	assert.equal(sdk.options.release, 'site@1.2.3')
	assert.equal(sdk.options.environment, 'production')
})

test('a page that has already loaded schedules the SDK at once', () => {
	const { win, load, idle } = page('complete')

	bootSentry(config, { win, load })
	assert.equal(idle.length, 1)
})

test('errors before the SDK are sent after init as unhandled', async () => {
	const { win, load, listeners, sdk, run } = page('complete')
	const boom = new Error('boom')
	const reason = new Error('rejected')

	bootSentry(config, { win, load })
	listeners.error({ type: 'error', error: boom })
	listeners.error({ type: 'error', message: 'Script error.' })
	listeners.unhandledrejection({ type: 'unhandledrejection', reason })
	await run()

	assert.equal(sdk.captured[0].error, boom)
	assert.deepEqual(sdk.captured[0].hint, { mechanism: { type: 'onerror', handled: false } })
	assert.equal(sdk.captured[1].error.message, 'Script error.')
	assert.equal(sdk.captured[2].error, reason)
	assert.equal(sdk.captured[2].hint.mechanism.type, 'onunhandledrejection')
	// Дальше ошибки ловит сам SDK.
	assert.equal(listeners.error, undefined)
	assert.equal(listeners.unhandledrejection, undefined)
})

test('a failed SDK load stops collecting errors', async () => {
	const { win, listeners, idle } = page('complete')
	const failed = new Error('chunk is gone')

	bootSentry(config, { win, load: async () => Promise.reject(failed) })
	listeners.error({ type: 'error', error: new Error('boom') })

	await assert.rejects(idle[0](), failed)
	assert.equal(listeners.error, undefined)
	assert.equal(listeners.unhandledrejection, undefined)
})

test('the options turn on nothing but errors', () => {
	const options = sentryOptions(config)

	// В SDK 11 этой опции нет, всё решает dataCollection.
	assert.equal('sendDefaultPii' in options, false)
	assert.deepEqual(options.dataCollection, {
		userInfo: false,
		cookies: false,
		httpHeaders: false,
		httpBodies: [],
		urlQueryParams: false,
		genAI: { inputs: false, outputs: false },
		stackFrameVariables: false,
	})
	for (const key of ['tracesSampleRate', 'replaysSessionSampleRate', 'profilesSampleRate']) {
		assert.equal(key in options, false, key)
	}
})

test('file addresses in an event lose the query and the fragment', () => {
	const page = 'https://site.example/page?token=1#top'
	const event = {
		exception: {
			values: [{ stacktrace: { frames: [{ filename: page, abs_path: page }, { filename: '<anonymous>' }] } }],
		},
		debug_meta: { images: [{ code_file: page }] },
	}

	assert.equal(sentryOptions(config).beforeSend, stripFileQueries)
	const [frame, anonymous] = stripFileQueries(event).exception.values[0].stacktrace.frames
	assert.equal(frame.filename, 'https://site.example/page')
	assert.equal(frame.abs_path, 'https://site.example/page')
	assert.equal(anonymous.filename, '<anonymous>')
	assert.equal(event.debug_meta.images[0].code_file, 'https://site.example/page')
	assert.deepEqual(stripFileQueries({ message: 'plain' }), { message: 'plain' })
})

test('the options drop session tracking, so a page load alone sends nothing', () => {
	const defaults = ['InboundFilters', 'BrowserSession', 'GlobalHandlers'].map((name) => ({ name }))
	const kept = sentryOptions(config).integrations(defaults)

	assert.deepEqual(
		kept.map(({ name }) => name),
		['InboundFilters', 'GlobalHandlers'],
	)
})

test('the CSP lets the page reach the ingest host of the DSN', () => {
	assert.deepEqual(sentryCsp(dsn), { directives: ['connect-src https://o42.ingest.us.sentry.io'] })
})

test('a broken DSN fails the build', () => {
	for (const bad of [
		'',
		'nope',
		'http://abc@o1.ingest.sentry.io/1',
		'https://o1.ingest.sentry.io/1',
		'https://abc@o1.ingest.sentry.io/',
	]) {
		assert.throws(() => parseDsn(bad), TypeError, bad)
	}
})

test('the release is name@version from package.json of the site', () => {
	const root = mkdtempSync(join(tmpdir(), 'sentry-'))

	writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'sorebody', version: '2.4.0' }))
	assert.equal(siteRelease(root), 'sorebody@2.4.0')

	writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'sorebody' }))
	assert.throws(() => siteRelease(root), TypeError)
})

test('the component stays off without a DSN and on the dev server', () => {
	const source = readFileSync(join(import.meta.dirname, '..', 'site', 'sentry.astro'), 'utf8')

	assert.match(source, /import\.meta\.env\.PUBLIC_SENTRY_DSN/)
	assert.match(source, /const enabled = import\.meta\.env\.PROD && Boolean\(dsn\)/)
})

test('the package exports the Sentry component and depends on the SDK', () => {
	const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'))

	assert.equal(pkg.exports['./sentry.astro'], './site/sentry.astro')
	assert.ok(pkg.dependencies['@sentry/browser'])
})
