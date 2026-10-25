import { expect, test } from '@playwright/test'

// Компоненты `ui/` на стенде из `test/ui`: то, что видно только в браузере, --
// перетаскивание, выбор файла с клавиатуры, проверка типа и размера, подсказка.

/** Бросает файл на элемент так же, как это делает браузер при перетаскивании. */
async function dropFile(page, selector, { name, type, size }) {
	const data = await page.evaluateHandle(
		({ name, type, size }) => {
			const transfer = new DataTransfer()

			transfer.items.add(new File(['x'.repeat(size)], name, { type }))

			return transfer
		},
		{ name, type, size },
	)

	await page.dispatchEvent(selector, 'dragover', { dataTransfer: data })
	await page.dispatchEvent(selector, 'drop', { dataTransfer: data })
}

const zone = '.dropzone >> nth=0'

test.beforeEach(async ({ page }) => {
	await page.goto('/ui/')
})

test('a dropped file of the right type reaches onfile', async ({ page }) => {
	await dropFile(page, zone, { name: 'result.json', type: 'application/json', size: 10 })
	await expect(page.locator('[data-taken]')).toHaveText('result.json')
})

test('a wrong type or an oversized file shows why and stays out', async ({ page }) => {
	await dropFile(page, zone, { name: 'photo.png', type: 'image/png', size: 10 })
	await expect(page.locator(zone)).toHaveClass(/dropzone--error/)
	await expect(page.getByRole('alert').first()).toContainText('photo.png')

	await dropFile(page, zone, { name: 'big.json', type: 'application/json', size: 2048 })
	await expect(page.getByRole('alert').first()).toContainText('Файл больше 1 КБ')
	await expect(page.locator('[data-taken]')).toHaveText('')
})

test('the zone opens the file dialog from the keyboard and from the chip outside it', async ({ page }) => {
	await page.locator(zone).focus()

	const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Enter')])

	await chooser.setFiles({ name: 'export.json', mimeType: 'application/json', buffer: Buffer.from('{}') })
	await expect(page.locator('[data-taken]')).toHaveText('export.json')

	const [again] = await Promise.all([
		page.waitForEvent('filechooser'),
		page.getByRole('button', { name: 'Заменить' }).click(),
	])

	expect(again).toBeTruthy()
})

test('pickFile opens the dialog without a zone on the page', async ({ page }) => {
	const [chooser] = await Promise.all([
		page.waitForEvent('filechooser'),
		page.getByRole('button', { name: 'Выбрать вне зоны' }).click(),
	])

	expect(await chooser.element().getAttribute('accept')).toBe('.json')
	await chooser.setFiles({ name: 'outside.json', mimeType: 'application/json', buffer: Buffer.from('{}') })
	await expect(page.locator('[data-taken]')).toHaveText('outside.json')
})

test('a disabled zone takes neither focus nor files', async ({ page }) => {
	const disabled = page.locator('.dropzone--disabled')

	await expect(disabled).toHaveAttribute('tabindex', '-1')
	await dropFile(page, '.dropzone--disabled', { name: 'result.json', type: 'application/json', size: 10 })
	await expect(page.locator('[data-taken]')).toHaveText('')
})

test('the info tip opens on hover and stays inside the screen', async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 700 })
	await page.getByRole('button', { name: 'Пояснение' }).first().hover()

	const tip = page.getByRole('tooltip', { name: 'Справка о выгрузке' })

	await expect(tip).toBeVisible()

	const box = await tip.boundingBox()

	expect(box.x).toBeGreaterThanOrEqual(0)
	expect(box.x + box.width).toBeLessThanOrEqual(360)
})

test('the field label focuses its input', async ({ page }) => {
	await page.getByText('Токен', { exact: true }).click()
	await expect(page.locator('#token')).toBeFocused()
})
