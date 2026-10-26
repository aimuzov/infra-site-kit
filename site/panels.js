/**
 * Скрываемые панели страницы: сайдбар, оглавление, панель комментариев. Скрытая панель
 * отмечена на корне атрибутом `data-panel-<имя>="hidden"`, по нему CSS сайта сворачивает
 * её колонку: раскладка у каждого сайта своя, кит держит только состояние.
 *
 * Выбор живёт в localStorage этого устройства под ключом `<prefix>:panel-<имя>`.
 * До отрисовки его ставит panels-boot.astro, иначе панели мигали бы при загрузке.
 */

/** Префикс ключей в localStorage по умолчанию. */
export const PANELS_PREFIX = 'site'

/** @param {string} name */
const attr = (name) => `data-panel-${name}`

/**
 * @param {string} name
 * @param {string} [prefix]
 */
export const panelKey = (name, prefix = PANELS_PREFIX) => `${prefix}:panel-${name}`

/** @param {string} name */
export function isPanelHidden(name) {
	return document.documentElement.getAttribute(attr(name)) === 'hidden'
}

/**
 * Скрывает или показывает панель и запоминает выбор.
 * @param {string} name
 * @param {boolean} hidden
 * @param {{ prefix?: string }} [options]
 */
export function setPanelHidden(name, hidden, { prefix } = {}) {
	if (hidden) document.documentElement.setAttribute(attr(name), 'hidden')
	else document.documentElement.removeAttribute(attr(name))

	try {
		if (hidden) localStorage.setItem(panelKey(name, prefix), 'hidden')
		else localStorage.removeItem(panelKey(name, prefix))
	} catch {
		// Без хранилища выбор живёт до перезагрузки.
	}
}

/**
 * @param {string} name
 * @param {{ prefix?: string }} [options]
 * @returns {boolean} Скрыта ли панель после клика.
 */
export function togglePanel(name, options) {
	const hidden = !isPanelHidden(name)

	setPanelHidden(name, hidden, options)

	return hidden
}

/**
 * Следит за панелью: вызывает `callback` сразу и при каждой смене, откуда бы она ни пришла,
 * так что две кнопки одной панели на странице не расходятся.
 * @param {string} name
 * @param {(hidden: boolean) => void} callback
 * @returns {() => void} Отписка.
 */
export function watchPanel(name, callback) {
	const observer = new MutationObserver(() => callback(isPanelHidden(name)))

	observer.observe(document.documentElement, { attributes: true, attributeFilter: [attr(name)] })
	callback(isPanelHidden(name))

	return () => observer.disconnect()
}
