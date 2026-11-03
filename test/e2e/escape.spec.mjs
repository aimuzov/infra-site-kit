import { expect, test } from '@playwright/test'

async function install(page, options = {}) {
	await page.evaluate(async (options) => {
		const kit = await import('/site/escape.js')
		window.stopEscape = kit.watchEscape(() => kit.goBack('/'), options)
	}, options)
}

test('Escape returns to the previous page and direct entry uses the fallback', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('link', { name: 'About', exact: true }).click()
	await install(page)
	await page.keyboard.press('Escape')
	await expect(page).toHaveURL('/')
})

test('direct entry falls back locally and Escape on the root does nothing', async ({ page }) => {
	await page.goto('/about/')
	await install(page)
	await page.keyboard.press('Escape')
	await expect(page).toHaveURL('/')
	await install(page)
	await page.keyboard.press('Escape')
	await expect(page).toHaveURL('/')
})

test('editing, handled events, held keys, modifiers and cleanup do not navigate', async ({ page }) => {
	await page.goto('/about/')
	await install(page)
	await page.evaluate(() => {
		document.body.insertAdjacentHTML(
			'beforeend',
			'<input aria-label="Edit"><div contenteditable="true" aria-label="Rich edit">Text</div>',
		)
	})
	for (const label of ['Edit', 'Rich edit']) {
		await page.getByLabel(label, { exact: true }).focus()
		await page.keyboard.press('Escape')
		await expect(page).toHaveURL('/about/')
	}
	await page.getByRole('heading').click()
	await page.evaluate(() => {
		for (const options of [{ repeat: true }, { ctrlKey: true }, { isComposing: true }])
			window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ...options }))
		const handled = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
		handled.preventDefault()
		window.dispatchEvent(handled)
		window.stopEscape()
	})
	await page.keyboard.press('Escape')
	await expect(page).toHaveURL('/about/')
})

test('native dialog and popover close before page navigation', async ({ page }) => {
	await page.goto('/about/')
	await install(page)
	await page.evaluate(() => {
		document.body.insertAdjacentHTML('beforeend', '<dialog>Dialog</dialog><div popover>Popover</div>')
		document.querySelector('dialog').showModal()
	})
	await page.keyboard.press('Escape')
	await expect(page.locator('dialog')).not.toBeVisible()
	await expect(page).toHaveURL('/about/')
	await page.evaluate(() => document.querySelector('[popover]').showPopover())
	await page.keyboard.press('Escape')
	await expect(page.locator('[popover]')).not.toBeVisible()
	await expect(page).toHaveURL('/about/')
})

test('deepest connected layer closes first, even when its parent registers later', async ({ page }) => {
	await page.goto('/about/')
	await install(page, { ignoreEditable: false })
	await page.evaluate(async () => {
		const { escapeClose } = await import('/site/escape.js')
		document.body.insertAdjacentHTML(
			'beforeend',
			'<aside>Parent<section><input aria-label="Layer input"></section></aside>',
		)
		const parent = document.querySelector('aside')
		const child = parent.querySelector('section')
		const childAction = escapeClose(child, () => child.remove())
		const parentAction = escapeClose(parent, () => parent.remove())
		window.disposeLayers = () => {
			childAction.destroy()
			parentAction.destroy()
			childAction.destroy()
		}
	})
	await page.getByLabel('Layer input').focus()
	await page.keyboard.press('Escape')
	await expect(page.locator('section')).toHaveCount(0)
	await expect(page.locator('aside')).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.locator('aside')).toHaveCount(0)
	await expect(page).toHaveURL('/about/')
	await page.evaluate(() => window.disposeLayers())
	await page.keyboard.press('Escape')
	await expect(page).toHaveURL('/')
})

test('back links skip anchor history and preserve the fallback on direct entry', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('link', { name: 'About', exact: true }).click()
	await page.evaluate(async () => {
		document.body.insertAdjacentHTML('beforeend', '<a href="/" data-back>Back</a>')
		history.pushState({}, '', '#one')
		history.pushState({}, '', '#two')
		const { initBackLink } = await import('/site/back-link.js')
		initBackLink()
	})
	await page.keyboard.press('Escape')
	await expect(page).toHaveURL('/')
})

test('disabled application handler leaves Escape unhandled', async ({ page }) => {
	await page.goto('/about/')
	const prevented = await page.evaluate(async () => {
		const { watchEscape } = await import('/site/escape.js')
		const stop = watchEscape(() => location.assign('/'), { enabled: () => false })
		const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
		window.dispatchEvent(event)
		stop()
		return event.defaultPrevented
	})
	expect(prevented).toBe(false)
	await expect(page).toHaveURL('/about/')
})

test('anchor skipping stops at the same-origin boundary', async ({ page, baseURL }) => {
	const external = baseURL.replace('localhost', '127.0.0.1')
	await page.goto(external + '/')
	await page.goto('/about/')
	await page.evaluate(async () => {
		document.body.insertAdjacentHTML('beforeend', '<a href="/" data-close>Close</a>')
		history.pushState({}, '', '#anchor')
		const { initBackLink } = await import('/site/back-link.js')
		initBackLink()
	})
	await page.getByRole('link', { name: 'Close', exact: true }).click()
	await expect(page).toHaveURL(baseURL + '/')
})

test('query-only navigation is a previous page state, not an anchor', async ({ page }) => {
	await page.goto('/about/?view=one')
	await page.evaluate(async () => {
		history.pushState({}, '', '?view=two')
		document.body.insertAdjacentHTML('beforeend', '<a href="/" data-close>Close</a>')
		const { initBackLink } = await import('/site/back-link.js')
		initBackLink()
	})
	await page.getByRole('link', { name: 'Close', exact: true }).click()
	await expect(page).toHaveURL('/about/?view=one')
	await page.waitForTimeout(1700)
	await expect(page).toHaveURL('/about/?view=one')
})

test('back and close links leave modified and targeted clicks to the browser', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('link', { name: 'About', exact: true }).click()
	const intercepted = await page.evaluate(async () => {
		document.body.insertAdjacentHTML('beforeend', '<a href="/" data-back>Back</a><a href="/" data-close>Close</a>')
		const { initBackLink } = await import('/site/back-link.js')
		initBackLink()
		const results = []
		for (const link of document.querySelectorAll('[data-back], [data-close]')) {
			for (const options of [
				{ ctrlKey: true },
				{ metaKey: true },
				{ shiftKey: true },
				{ altKey: true },
				{ button: 1 },
				{ target: '_blank' },
			]) {
				link.target = options.target || ''
				document.addEventListener(
					'click',
					(event) => {
						results.push(event.defaultPrevented)
						event.preventDefault()
					},
					{ once: true },
				)
				link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...options }))
			}
		}
		return results
	})
	expect(intercepted).toEqual(Array(12).fill(false))
	await expect(page).toHaveURL('/about/')
})
