// Уводит со страницы языка по умолчанию на версию на языке браузера, до отрисовки. Обычно это
// делает Caddy по `Accept-Language`, скрипт -- фолбек там, где его нет впереди. Правило то же:
// явный выбор в cookie главнее, а читающий на языке по умолчанию остаётся на нём. Имя cookie,
// язык по умолчанию и остальные языки -- в `data-*` тега. Подключает locale-boot.astro.
// Адрес берётся из `location`, а не со сборки: 404 отдаётся по любому пути.
;(() => {
	const tag = document.currentScript

	if (!tag || document.cookie.split(/;\s*/).some((pair) => pair.startsWith(`${tag.dataset.cookie}=`))) return

	const path = location.pathname
	const others = JSON.parse(tag.dataset.locales || '[]')
	const langs = Array.from(navigator.languages ?? [], (lang) => lang.toLowerCase().split('-')[0])

	if (!langs.length || langs.includes(tag.dataset.locale)) return
	if (others.some((/** @type {string} */ locale) => path === `/${locale}` || path.startsWith(`/${locale}/`))) return

	const target = langs.find((lang) => others.includes(lang)) ?? others[0]

	if (target) location.replace(`/${target}${path}${location.search}${location.hash}`)
})()
