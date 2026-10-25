/**
 * Проверка файла перед загрузкой: тип по `accept` и размер. Отдельно от дропзоны,
 * чтобы правило было одно и для перетаскивания, и для выбора в диалоге, и чтобы его
 * можно было проверить без браузера.
 */

/**
 * Подходит ли файл под строку `accept` в том виде, как её пишут у `<input type="file">`:
 * `.zip,.xml`, `application/json`, `image/*`. Пустая строка пропускает всё. Диалог выбора
 * фильтрует по `accept` сам, а перетаскивание нет, поэтому дропзона проверяет здесь.
 *
 * @param {{ name: string, type: string }} file
 * @param {string} [accept]
 */
export function matchesAccept(file, accept = '') {
	const rules = accept
		.split(',')
		.map((rule) => rule.trim().toLowerCase())
		.filter(Boolean)

	if (rules.length === 0) return true

	const name = file.name.toLowerCase()
	const type = file.type.toLowerCase()

	return rules.some((rule) => {
		if (rule.startsWith('.')) return name.endsWith(rule)

		if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1))

		return type === rule
	})
}

/**
 * Размер для человека: «512 КБ», «1,4 МБ». По-русски, с запятой и неразрывным пробелом.
 *
 * @param {number} bytes
 */
export function formatSize(bytes) {
	const units = ['Б', 'КБ', 'МБ', 'ГБ']
	let value = bytes
	let unit = 0

	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024
		unit++
	}

	const rounded = unit === 0 || value >= 10 ? Math.round(value) : Math.round(value * 10) / 10

	return `${String(rounded).replace('.', ',')} ${units[unit]}`
}

/**
 * Открывает системный диалог выбора файла и отдаёт выбранный, или `null`, если окно закрыли.
 * Поле создаётся на время вызова, поэтому кнопка «Заменить» работает и тогда, когда
 * дропзоны на странице уже нет.
 *
 * @param {string} [accept]
 * @returns {Promise<File | null>}
 */
export function pickFile(accept = '') {
	return new Promise((resolve) => {
		const input = document.createElement('input')

		input.type = 'file'
		input.accept = accept
		input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true })
		input.addEventListener('cancel', () => resolve(null), { once: true })
		input.click()
	})
}

/**
 * Почему файл не подходит, или `null`, если подходит.
 *
 * @param {{ name: string, type: string, size: number }} file
 * @param {{ accept?: string, maxSize?: number }} [rules]
 */
export function rejectFile(file, { accept, maxSize } = {}) {
	if (!matchesAccept(file, accept)) return `Этот тип файла не подходит: ${file.name}`

	if (maxSize !== undefined && file.size > maxSize) return `Файл больше ${formatSize(maxSize)}`

	return null
}
