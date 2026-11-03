import { watchEscape } from './escape.js'

/**
 * Стрелка «Назад» в шапке лонгрида (`[data-back]`, ссылка на главную) и маленький заголовок
 * рядом с ней. Пришли со страницы сайта -- возвращают туда же, с её прокруткой; иначе
 * срабатывают как обычная ссылка.
 *
 * Сноски и якоря меняют хеш и кладут записи в историю той же страницы: одного шага назад
 * мало, их пропускаем. Если за полторы секунды страница так и не ушла (истории сайта нет),
 * уходим по ссылке.
 *
 * Esc делает то же, что стрелка, как на сцене главной. Открытую подсказку он сначала закрывает,
 * а в поле ввода не трогает.
 */
export function initBackLink() {
	const links = [...document.querySelectorAll('[data-back]')]
	const [link] = links

	const fromOutside = () => document.referrer === '' || new URL(document.referrer).origin !== location.origin

	const plainClick = (event, link) =>
		!event.defaultPrevented &&
		event.button === 0 &&
		!event.ctrlKey &&
		!event.metaKey &&
		!event.shiftKey &&
		!event.altKey &&
		(!link.target || link.target === '_self') &&
		!link.hasAttribute('download')

	for (const back of links)
		back.addEventListener('click', (event) => {
			if (plainClick(event, back) && document.referrer && !fromOutside() && hasPrevious())
				goBack(event, back.href)
		})

	// Navigation API видит только записи своего сайта: есть предыдущая -- назад к нам.
	// Без него судим по истории вкладки, она помнит и чужие сайты
	const hasPrevious = () =>
		'navigation' in window ? navigation.currentEntry.index > 0 : !fromOutside() && history.length > 1

	// Ссылка, которая закрывает экран (`[data-close]`, "в статье" у самопроверки):
	// шаг назад, если есть куда, даже без referrer. Иначе -- обычный переход
	for (const close of document.querySelectorAll('[data-close]'))
		close.addEventListener('click', (event) => {
			if (plainClick(event, close) && hasPrevious()) goBack(event, close.href)
		})

	function goBack(event, href) {
		event.preventDefault()

		const path = location.pathname + location.search
		const samePage = () => location.pathname + location.search === path
		let timer
		const stop = () => {
			clearTimeout(timer)
			removeEventListener('popstate', skipOwn)
			removeEventListener('pagehide', stop)
		}
		const skipOwn = () => {
			if (!samePage()) return stop()
			if (window.navigation?.currentEntry?.index > 0) history.back()
			else {
				stop()
				location.assign(href)
			}
		}

		addEventListener('pagehide', stop, { once: true })
		addEventListener('popstate', skipOwn)
		timer = setTimeout(() => {
			stop()

			if (samePage()) location.assign(href)
		}, 1500)
		history.back()
	}

	return watchEscape(() => link.click(), { enabled: () => Boolean(link) })
}
