import { expect, test } from '@playwright/test'

// Sentry на стенде `test/ui/sentry.html` с настоящим SDK: что из адреса, запросов, консоли
// и текста ошибки доходит до приёма. Сам приём подменён, наружу ничего не уходит.

// Подписанный запрос входа во фрагменте, как у страницы MCP-коннектора, и токен, который
// страница шлёт в query, пишет в консоль и бросает в объекте.
const signed = 'eyJjbGllbnRfaWQiOiJtY3AiLCJzdGF0ZSI6IjQyIn0.Vf3kQ9xLm2Rp8ZtB7wYc1HsN4aJd6GuE0qOi5TnKyXw'
const token = 'Kx9_bT2mQpL0vW7zYc3NfA8sDe'
const code = 'one-time-code-42'
// Ключ, по которому страница называет обработчик: V8 берёт из него имя функции.
const key = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b'

// Поля, которые `beforeSend` пропускает. SDK после него добавляет только `sdk`.
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
	'transaction',
	'message',
	'logentry',
	'exception',
	'breadcrumbs',
	'request',
	'contexts',
	'tags',
	'debug_meta',
]

/** Конверты, которые SDK отправил в приём: заголовок и события. */
const envelopes = (bodies) =>
	bodies.map((body) => {
		const [header, ...items] = body.split('\n').map((line) => JSON.parse(line))

		return { header, events: items.filter((item) => item.exception) }
	})

const events = (bodies) => envelopes(bodies).flatMap(({ events }) => events)

/** Подменяет приём Sentry и открывает стенд, когда SDK уже обернул консоль. */
async function openStand(page, path) {
	const bodies = []

	await page.route('https://o42.ingest.us.sentry.io/**', async (route) => {
		bodies.push(route.request().postData())
		await route.fulfill({ status: 200, body: '{}' })
	})
	await page.route('https://api.example.com/**', (route) => route.fulfill({ status: 500, body: '' }))
	await page.goto(path)
	// SDK грузится после load, когда браузер свободен, и при инициализации оборачивает консоль.
	await page.waitForFunction(() => console.warn.__sentry_original__)

	return bodies
}

/** Ни в одном конверте нет секретов. */
function expectNoSecrets(bodies, secrets) {
	for (const body of bodies) {
		for (const secret of secrets) {
			expect(body).not.toContain(secret)
		}
	}
}

test('an error event keeps no secrets of the address, requests and console', async ({ page }) => {
	const bodies = await openStand(page, `/ui/sentry.html?code=${code}#request=${signed}`)

	await page.getByRole('button', { name: 'Send' }).click()
	await page.evaluate(
		async ({ signed, token, code }) => {
			// Коннектор прочёл запрос из фрагмента и убрал его из адреса, потом фрагмент вернулся.
			history.replaceState(null, '', location.pathname)
			location.hash = `request=${signed}&code=${code}`
			await new Promise((resolve) => addEventListener('hashchange', resolve, { once: true }))
			await fetch(`/ui/missing?key=${token}#top`)
			await new Promise((resolve) => {
				const xhr = new XMLHttpRequest()

				xhr.open('GET', `/ui/missing?token=${token}`)
				xhr.onloadend = resolve
				xhr.send()
			})
			console.log(`noise ${token}`)
			console.warn('retry with', { authToken: token }, `Bearer ${token}`)
			setTimeout(() => {
				throw new Error(`Bad sign-in request: ${location.hash}`)
			})
		},
		{ signed, token, code },
	)

	await expect.poll(() => events(bodies).length).toBe(1)
	expectNoSecrets(bodies, [signed.slice(0, 16), signed.slice(-16), token, code])

	const [error] = events(bodies)
	const crumbs = error.breadcrumbs.map(({ category, level, message, data }) => ({ category, level, message, data }))

	// Фрагмент без адреса впереди уходит целиком, а не только подписанный запрос в нём.
	expect(error.exception.values[0].value).toBe('Bad sign-in request: ')
	expect(error.request.url).toMatch(/^http:\/\/localhost:\d+\/ui\/sentry\.html$/)
	// Клики и `console.log` не сохраняются, у адресов нет query и фрагмента,
	// у консоли -- аргументов.
	expect(crumbs).toEqual([
		{ category: 'navigation', data: { from: '/ui/sentry.html', to: '/ui/sentry.html' } },
		{ category: 'navigation', data: { from: '/ui/sentry.html', to: '/ui/sentry.html' } },
		{ category: 'fetch', level: 'warning', data: { method: 'GET', url: '/ui/missing', status_code: 404 } },
		{ category: 'xhr', level: 'warning', data: { method: 'GET', url: '/ui/missing', status_code: 404 } },
		{ category: 'console', level: 'warning', message: 'retry with [object Object] Bearer [Filtered]' },
	])
})

test('a thrown object, JSON in the error text and the user info of an address stay out', async ({ page }) => {
	// Во фрагменте браузер оставляет `'`, `(` и `)` как есть.
	const bodies = await openStand(page, "/ui/sentry.html#request=AAAA'quoteSECRET(and)more")

	await page.evaluate(async () => {
		console.warn('Unlock failed', { passphrase: 'correct horse', pin: '4821' })
		console.error(`Unlock failed: ${JSON.stringify({ user: 'bob', passphrase: 'correct horse', pin: '4821' })}`)
		await new Promise((resolve) => {
			const xhr = new XMLHttpRequest()

			xhr.open('GET', 'https://bob:hunter2@api.example.com/v1/me')
			xhr.onloadend = resolve
			xhr.send()
		})
		// Пароль с `/` обрывает хост раньше `@`: такой адрес fetch не разбирает и повторяет
		// в тексте ошибки, а SDK пишет его в крошку как есть.
		await fetch('https://deploy:AbC/dEf+GhI=@api.example.com/v1/items').catch((error) =>
			console.error(error.message),
		)

		// Вложения из scope SDK кладёт в конверт после `beforeSend`, мимо него.
		const carrier = window.__SENTRY__

		carrier[carrier.version].defaultIsolationScope.addAttachment({
			filename: 'state.json',
			data: JSON.stringify({ password: 'hunter2' }),
		})
		setTimeout(() => {
			throw new Error(
				`Save failed (${location.href}) ${JSON.stringify({ secret: { value: 'hunter2' }, page: 2 })}`,
			)
		})
		setTimeout(() => Promise.reject({ password: 'hunter2', profile: { apiKey: 'AbCdEfGhIjKlMn' } }), 50)
	})

	await expect.poll(() => events(bodies).length).toBe(2)
	expectNoSecrets(bodies, [
		'hunter2',
		'correct horse',
		'4821',
		'AbCdEfGhIjKlMn',
		'quoteSECRET',
		'__serialized__',
		'AbC/dEf',
		'deploy',
		'state.json',
	])

	const [error, rejection] = events(bodies)
	const crumbs = error.breadcrumbs.map(({ category, message, data }) => ({ category, message, data }))

	expect(error.exception.values[0].value).toMatch(
		/^Save failed \(http:\/\/localhost:\d+\/ui\/sentry\.html \{"secret \[Filtered\]$/,
	)
	expect(rejection.exception.values[0]).toMatchObject({
		type: 'UnhandledRejection',
		value: 'Object captured as promise rejection with keys: password [Filtered]',
	})
	expect(rejection.extra).toBeUndefined()
	expect(crumbs).toEqual([
		{ category: 'console', message: 'Unlock failed [object Object]' },
		{ category: 'console', message: 'Unlock failed: {"user":"bob","passphrase [Filtered]' },
		{ category: 'xhr', data: { method: 'GET', url: 'https://api.example.com/v1/me', status_code: 500 } },
		{ category: 'fetch', data: { method: 'GET', url: 'https://api.example.com/v1/items' } },
		{
			category: 'console',
			message: "Failed to execute 'fetch' on 'Window': Failed to parse URL from https://api.example.com/v1/items",
		},
	])
})

test('a plain error arrives with its type, short text and frames', async ({ page }) => {
	const bodies = await openStand(page, '/ui/sentry.html')

	await page.getByRole('button', { name: 'Break' }).click()
	await expect.poll(() => events(bodies).length).toBe(1)

	const [{ header, events: sent }] = envelopes(bodies)
	const [error] = sent
	const [exception] = error.exception.values

	expect(exception.type).toBe('TypeError')
	expect(exception.value).toBe("Cannot read properties of null (reading 'map')")
	expect(exception.mechanism.handled).toBe(false)
	expect(exception.mechanism.data).toBeUndefined()
	expect(exception.stacktrace.frames).toContainEqual(
		expect.objectContaining({
			filename: expect.stringMatching(/^http:\/\/localhost:\d+\/ui\/assets\/sentry-[\w-]+\.js$/),
			lineno: expect.any(Number),
			colno: expect.any(Number),
		}),
	)
	expect(error.release).toBe('stand@1.0.0')
	expect(error.environment).toBe('e2e')
	expect(Object.keys(error).filter((key) => !EVENT_KEYS.includes(key))).toEqual([])
	expect(Object.keys(error.contexts)).toEqual(['trace'])
	// Метаданные обработки SDK удалил из события, а трассу из них
	// положил в заголовок конверта.
	expect(header.trace.trace_id).toBe(error.contexts.trace.trace_id)
	expect(bodies[0]).not.toContain('sdkProcessingMetadata')
	// `userInfo: false`: Sentry не записывает IP посетителя.
	expect(error.sdk.settings.infer_ip).toBe('never')
})

test('a chain of causes keeps its links, and frames keep the names of their functions', async ({ page }) => {
	const bodies = await openStand(page, '/ui/sentry.html')

	await page.evaluate((key) => {
		class Vault {
			get state() {
				return this.#open()
			}

			#open() {
				const handlers = { [key]: () => new TypeError('expired', { cause: new RangeError('Корзина пуста') }) }

				throw new Error('locked', { cause: handlers[key]() })
			}
		}

		setTimeout(() => new Vault().state)
	}, key)

	await expect.poll(() => events(bodies).length).toBe(1)
	expectNoSecrets(bodies, [key])

	const [error] = events(bodies)
	const { values } = error.exception

	// По этим полям Sentry собирает цепочку `cause` обратно.
	expect(values).toMatchObject([
		{ type: 'RangeError', value: 'Корзина пуста', mechanism: { exception_id: 2, parent_id: 1, source: 'cause' } },
		{ type: 'TypeError', value: 'expired', mechanism: { exception_id: 1, parent_id: 0, source: 'cause' } },
		{ type: 'Error', value: 'locked', mechanism: { exception_id: 0 } },
	])
	expect(values[2].stacktrace.frames.map((frame) => frame.function)).toEqual(
		expect.arrayContaining(['get state', '#open']),
	)

	// Обработчик назван ключом из данных: его фрейм остался, а имя нет.
	const handler = values[1].stacktrace.frames.at(-1)

	expect(handler.lineno).toEqual(expect.any(Number))
	expect(handler).not.toHaveProperty('function')
})
