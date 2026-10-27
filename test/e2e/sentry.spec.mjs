import { expect, test } from '@playwright/test'

// Sentry на стенде `test/ui/sentry.html` с настоящим SDK: что из адреса, запросов, консоли
// и текста ошибки доходит до приёма. Сам приём подменён, наружу ничего не уходит.

// Подписанный запрос входа во фрагменте, как у страницы MCP-коннектора, и токен, который
// страница шлёт в query, пишет в консоль и бросает в объекте.
const signed = 'eyJjbGllbnRfaWQiOiJtY3AiLCJzdGF0ZSI6IjQyIn0.Vf3kQ9xLm2Rp8ZtB7wYc1HsN4aJd6GuE0qOi5TnKyXw'
const token = 'Kx9_bT2mQpL0vW7zYc3NfA8sDe'
const code = 'one-time-code-42'

/** События из конвертов, которые SDK отправил в приём. */
const events = (envelopes) =>
	envelopes.flatMap((body) =>
		body
			.split('\n')
			.map((line) => JSON.parse(line))
			.filter((item) => item.exception),
	)

test('an error event keeps no secrets of the address, requests, console and the error', async ({ page }) => {
	const envelopes = []

	await page.route('https://o42.ingest.us.sentry.io/**', async (route) => {
		envelopes.push(route.request().postData())
		await route.fulfill({ status: 200, body: '{}' })
	})
	await page.goto(`/ui/sentry.html?code=${code}#request=${signed}`)
	// SDK грузится после load, когда браузер свободен, и при инициализации оборачивает консоль.
	await page.waitForFunction(() => console.warn.__sentry_original__)
	await page.getByRole('button', { name: 'Send' }).click()

	await page.evaluate(
		async ({ signed, token }) => {
			// Коннектор прочёл запрос из фрагмента и убрал его из адреса, потом фрагмент вернулся.
			history.replaceState(null, '', location.pathname)
			location.hash = `request=${signed}`
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
			setTimeout(() => Promise.reject({ token }))
		},
		{ signed, token },
	)

	await expect.poll(() => events(envelopes).length).toBe(2)

	for (const body of envelopes) {
		for (const secret of [signed.slice(0, 16), signed.slice(-16), token, code]) {
			expect(body).not.toContain(secret)
		}
	}

	const [error] = events(envelopes).filter(({ exception }) => exception.values[0].type === 'Error')
	const [rejection] = events(envelopes).filter(({ extra }) => extra?.__serialized__)
	const crumbs = error.breadcrumbs.map(({ category, level, data }) => ({ category, level, data }))

	expect(error.exception.values[0].value).toBe('Bad sign-in request: #request=[Filtered]')
	expect(error.request.url).toMatch(/\/ui\/sentry\.html$/)
	expect(rejection.extra.__serialized__).toEqual({ token: '[Filtered]' })
	// Клики и `console.log` не сохраняются, у адресов нет query и фрагмента.
	expect(crumbs).toEqual([
		{ category: 'navigation', data: { from: '/ui/sentry.html', to: '/ui/sentry.html' } },
		{ category: 'navigation', data: { from: '/ui/sentry.html', to: '/ui/sentry.html' } },
		{ category: 'fetch', level: 'warning', data: { method: 'GET', url: '/ui/missing', status_code: 404 } },
		{ category: 'xhr', level: 'warning', data: { method: 'GET', url: '/ui/missing', status_code: 404 } },
		{
			category: 'console',
			level: 'warning',
			data: { logger: 'console', arguments: ['retry with', { authToken: '[Filtered]' }, 'Bearer [Filtered]'] },
		},
	])
})
