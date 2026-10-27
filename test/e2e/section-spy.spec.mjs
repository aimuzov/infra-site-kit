import { expect, test } from '@playwright/test'

// Текущий раздел в настоящем браузере: окно 1280 × 720, треть -- 240 пикселей от верха.
// Страница своя, через `page.route`, а модуль берётся с сервера стенда как есть.
const body = `<!doctype html>
<html lang="en">
	<head>
		<title>Sections</title>
		<style>
			body { margin: 0; }
			h2, h3 { height: 40px; margin: 0; }
			.text { height: 800px; margin: 0; }
			#box { height: 300px; overflow: auto; }
		</style>
	</head>
	<body>
		<main>
			<p style="height: 400px; margin: 0">Intro</p>
			<h2 id="one">One</h2><p class="text"></p>
			<h2 id="two">Two</h2><p class="text"></p>
			<div id="box">
				<h3 id="first">First</h3><p class="text"></p>
				<h3 id="second">Second</h3><p class="text"></p>
			</div>
			<p class="text"></p>
		</main>
		<script type="module">
			import { watchSection } from '/site/section-spy.js'

			const box = document.getElementById('box')

			watchSection(document.querySelectorAll('h2'), (heading) => {
				document.body.dataset.window = heading?.id ?? 'none'
			})
			watchSection(box.querySelectorAll('h3'), (heading) => {
				document.body.dataset.box = heading?.id ?? 'none'
			}, { scroller: box })
		</script>
	</body>
</html>`

test.beforeEach(async ({ page }) => {
	await page.route('/sections/', (route) => route.fulfill({ contentType: 'text/html', body }))
	await page.goto('/sections/')
})

/** Прокручивает окно так, чтобы верх заголовка встал на `top` пикселей от верха окна. */
const scrollHeadingTo = (page, id, top) =>
	page.evaluate(
		([id, top]) => scrollTo(0, document.getElementById(id).getBoundingClientRect().top + scrollY - top),
		[id, top],
	)

test('a section turns current once its heading rises to a third of the window', async ({ page }) => {
	const current = page.locator('body')

	await expect(current).toHaveAttribute('data-window', 'none')

	await scrollHeadingTo(page, 'two', 241)
	await expect(current).toHaveAttribute('data-window', 'one')

	await scrollHeadingTo(page, 'two', 240)
	await expect(current).toHaveAttribute('data-window', 'two')

	await page.evaluate(() => scrollTo(0, 0))
	await expect(current).toHaveAttribute('data-window', 'none')
})

test('in a container the line is a third of the container and its own scroll moves it', async ({ page }) => {
	const current = page.locator('body')

	await expect(current).toHaveAttribute('data-box', 'first')

	// Треть контейнера -- 100 пикселей от его верха, второй заголовок -- на 840 от начала.
	await page.locator('#box').evaluate((box) => (box.scrollTop = 739))
	await expect(current).toHaveAttribute('data-box', 'first')

	await page.locator('#box').evaluate((box) => (box.scrollTop = 740))
	await expect(current).toHaveAttribute('data-box', 'second')
})
