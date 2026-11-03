import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function setup(page, options = {}) {
	const source = await readFile(new URL('../../site/tooltip.js', import.meta.url), 'utf8')
	await page.route('http://tooltip.test/**', (route) =>
		route.fulfill({
			contentType: 'text/html',
			body: '<button data-tip="First"><span>First</span></button><button style="position:absolute;left:200px" data-tip="Second">Second</button><output hidden></output>',
		}),
	)
	await page.goto('http://tooltip.test')
	await page.addScriptTag({ type: 'module', content: source + '\nwindow.watchTooltip = watchTooltip' })
	await page.waitForFunction(() => typeof window.watchTooltip === 'function')
	await page.evaluate((options) => {
		const tip = document.querySelector('output')
		window.shows = 0
		window.moves = 0
		window.stop = window.watchTooltip({
			selector: '[data-tip]',
			content: (anchor) => (anchor.dataset.suppressed ? '' : anchor.dataset.tip),
			attributes: ['data-tip', 'data-suppressed'],
			delay: options.delay ?? 0,
			followPointer: true,
			focusVisibleOnly: options.focusVisibleOnly,
			ignoreUnrelatedPointer: options.ignoreUnrelatedPointer,
			scroll: options.scroll,
			keydown: options.keydown,
			move: () => window.moves++,
			prepare: options.async
				? (_state, signal) =>
						new Promise((resolve) => {
							window.pendingSignal = signal
							window.finish = resolve
						})
				: undefined,
			show: ({ text, point }) => {
				tip.hidden = false
				tip.textContent = text
				tip.dataset.x = point.x
				window.shows++
			},
			hide: () => {
				tip.hidden = true
			},
		})
	}, options)
}

test('delegates hover, updates content, and cancels on input, drag, scroll and removal', async ({ page }) => {
	await setup(page)
	const button = page.locator('button').first()
	const tip = page.locator('output')
	await button.hover()
	await expect(tip).toBeVisible()
	await button.evaluate((node) => {
		node.dataset.tip = 'Changed'
	})
	await expect(tip).toHaveText('Changed')
	for (const event of ['input', 'dragstart', 'scroll']) {
		await page.mouse.move(500, 300)
		await button.hover()
		await expect(tip).toBeVisible()
		await button.dispatchEvent(event)
		await expect(tip).toBeHidden()
	}
	await page.mouse.move(500, 300)
	await button.hover()
	await button.evaluate((node) => node.remove())
	await expect(tip).toBeHidden()
})

test('cancels delayed hover and suppresses touch and pressed pointers', async ({ page }) => {
	await setup(page, { delay: 150 })
	const button = page.locator('button').first()
	const tip = page.locator('output')
	await button.hover()
	await page.mouse.move(500, 300)
	await page.waitForTimeout(200)
	await expect(tip).toBeHidden()
	await button.dispatchEvent('pointerover', { pointerType: 'touch' })
	await page.waitForTimeout(200)
	await expect(tip).toBeHidden()
	await button.hover()
	await page.mouse.down()
	await page.mouse.move(30, 15)
	await page.waitForTimeout(200)
	await expect(tip).toBeHidden()
	await page.mouse.up()
})

test('suppression, focus, and cleanup release the active tooltip', async ({ page }) => {
	await setup(page)
	const button = page.locator('button').first()
	const tip = page.locator('output')
	await button.focus()
	await expect(tip).toBeVisible()
	await button.evaluate((node) => {
		node.dataset.suppressed = 'true'
	})
	await expect(tip).toBeHidden()
	await button.evaluate((node) => {
		delete node.dataset.suppressed
	})
	await page.locator('button').nth(1).focus()
	await expect(tip).toHaveText('Second')
	await page.evaluate(() => window.stop())
	await expect(tip).toBeHidden()
	await button.hover()
	await expect(tip).toBeHidden()
})

test('a stale asynchronous preparation never shows after leaving or destroying', async ({ page }) => {
	await setup(page, { async: true })
	await page.locator('button').first().hover()
	await expect.poll(() => page.evaluate(() => Boolean(window.finish))).toBe(true)
	await page.mouse.move(500, 300)
	await page.evaluate(() => window.finish())
	await expect(page.locator('output')).toBeHidden()
	expect(await page.evaluate(() => window.pendingSignal.aborted)).toBe(true)
	await page.locator('button').nth(1).hover()
	await page.evaluate(() => {
		window.stop()
		window.finish()
	})
	await expect(page.locator('output')).toBeHidden()
	expect(await page.evaluate(() => window.shows)).toBe(0)
})

test('keyboard focus bypasses a pending mouse delay', async ({ page }) => {
	await setup(page, { delay: 1000 })
	const button = page.locator('button').first()
	await button.hover()
	await button.focus()
	await expect(page.locator('output')).toBeVisible({ timeout: 200 })
})

test('destroy cancels a pending timer', async ({ page }) => {
	await setup(page, { delay: 150 })
	await page.locator('button').first().hover()
	await page.evaluate(() => window.stop())
	await page.waitForTimeout(200)
	await expect(page.locator('output')).toBeHidden()
	expect(await page.evaluate(() => window.shows)).toBe(0)
})

test('supports focus-visible, Escape-only dismissal and scroll repositioning', async ({ page }) => {
	await setup(page, { focusVisibleOnly: true, keydown: 'escape', scroll: 'move', delay: 1000 })
	await page.locator('button').first().click()
	await expect(page.locator('output')).toBeHidden()
	await page.keyboard.press('Tab')
	await expect(page.locator('output')).toHaveText('Second')
	await expect(page.locator('output')).toBeVisible()
	await page.keyboard.press('a')
	await expect(page.locator('output')).toBeVisible()
	await page.locator('button').nth(1).dispatchEvent('scroll')
	expect(await page.evaluate(() => window.moves)).toBe(1)
	await expect(page.locator('output')).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.locator('output')).toBeHidden()
})

test('unrelated pointer transitions preserve a keyboard hint when configured', async ({ page }) => {
	await setup(page, { focusVisibleOnly: true, ignoreUnrelatedPointer: true })
	await page.evaluate(() => {
		for (const left of [400, 600]) {
			const block = document.createElement('div')
			block.textContent = 'Plain block'
			block.style.cssText = 'position:absolute;top:100px;width:100px;height:100px;left:' + left + 'px'
			document.body.append(block)
		}
	})
	await page.keyboard.press('Tab')
	const button = page.locator('button').first()
	await expect(button).toBeFocused()
	await expect(page.locator('output')).toBeVisible()
	await page.mouse.move(450, 150)
	await page.mouse.move(650, 150)
	await expect(button).toBeFocused()
	await expect(page.locator('output')).toBeVisible()
})

test('iframe documents use their own element realm and cancel their own delay', async ({ page }) => {
	await setup(page)
	await page.evaluate(async () => {
		window.stop()
		const iframe = document.createElement('iframe')
		const loaded = new Promise((resolve) => iframe.addEventListener('load', resolve, { once: true }))
		document.body.append(iframe)
		await loaded
		const doc = iframe.contentDocument
		doc.body.innerHTML = '<button data-tip="Frame"><span>Inside</span></button><output hidden></output>'
		const view = iframe.contentWindow
		const tip = doc.querySelector('output')
		const button = doc.querySelector('button')
		window.stopFrame = window.watchTooltip({
			document: doc,
			selector: '[data-tip]',
			content: (element) => element.dataset.tip,
			scroll: 'move',
			resize: 'move',
			delay: 120,
			show: (state) => {
				tip.hidden = false
				tip.textContent = state.text
			},
			hide: () => {
				tip.hidden = true
			},
		})
		button.focus()
		button.querySelector('span').dispatchEvent(
			new view.PointerEvent('pointerout', {
				bubbles: true,
				relatedTarget: button,
				pointerType: 'mouse',
			}),
		)
	})
	const tip = page.frameLocator('iframe').locator('output')
	await expect(tip).toBeVisible()
	await page.evaluate(() => {
		const view = document.querySelector('iframe').contentWindow
		const button = view.document.querySelector('button')
		button.blur()
		button.dispatchEvent(new view.PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }))
	})
	await expect(tip).toBeHidden()
	await page.evaluate(() => {
		const view = document.querySelector('iframe').contentWindow
		const button = view.document.querySelector('button')
		for (let i = 0; i < 50; i++) window.setTimeout(() => {}, 0)
		window.parentTimerFired = false
		const parentTimer = window.setTimeout(() => {
			window.parentTimerFired = true
		}, 180)
		let frameTimer = view.setTimeout(() => {}, 0)
		while (frameTimer < parentTimer - 1) frameTimer = view.setTimeout(() => {}, 0)
		if (frameTimer !== parentTimer - 1) throw new Error('Timer collision fixture did not align')
		button.dispatchEvent(new view.PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
		button.dispatchEvent(new view.PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }))
	})
	await page.waitForTimeout(250)
	expect(await page.evaluate(() => window.parentTimerFired)).toBe(true)
	await expect(tip).toBeHidden()
	await page.evaluate(() => window.stopFrame())
})
