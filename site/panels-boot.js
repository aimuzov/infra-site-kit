// Ставит скрытые панели на `<html data-panel-<имя>="hidden">` до отрисовки, иначе они мигнут.
// Обычный скрипт, не модуль: модули откладываются до разбора страницы. Имена панелей
// и префикс ключей берутся из `data-panels` и `data-prefix` тега, пара -- panels.js.
// Подключает panels-boot.astro.
try {
	const { panels = '', prefix = 'site' } = document.currentScript?.dataset ?? {}

	for (const name of panels.split(/\s+/).filter(Boolean)) {
		if (localStorage.getItem(`${prefix}:panel-${name}`) === 'hidden') {
			document.documentElement.setAttribute(`data-panel-${name}`, 'hidden')
		}
	}
} catch {
	// Хранилище закрыто -- панели открыты.
}
