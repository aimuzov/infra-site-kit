import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import vm from 'node:vm'

import { render } from 'svelte/server'

import Credit from '../site/credit.svelte'
import { alternates, localeOfPath, localizePath, negotiateLocale, t, toLocale } from '../site/i18n.js'
import en from '../site/i18n/en.js'
import ru from '../site/i18n/ru.js'
import CopyValue from '../site/ui/copy-value.svelte'
import Dropzone from '../site/ui/dropzone.svelte'
import { formatSize, rejectFile } from '../site/ui/files.js'
import LangSwitch from '../site/ui/lang-switch.svelte'
import ThemeToggle from '../site/ui/theme-toggle.svelte'

const html = (component, props) => render(component, { props }).body

test('в английском словаре те же ключи, что в русском', () => {
	assert.deepEqual(Object.keys(en).sort(), Object.keys(ru).sort())
})

test('t подставляет переменные, падает на русский и показывает неизвестный ключ', () => {
	assert.equal(t('en', 'files.wrongType', { name: 'a.exe' }), 'This file type does not fit: a.exe')
	assert.equal(t('de', 'copy.copied'), 'Скопировано')
	assert.equal(t('en', 'no.such.key'), 'no.such.key')
	assert.equal(t('en', 'hello', undefined, { en: { hello: 'Hi' }, ru: { hello: 'Привет' } }), 'Hi')
	assert.equal(t('en', 'only.ru', undefined, { ru: { 'only.ru': 'Только' } }), 'Только')
	assert.equal(toLocale('EN'), 'ru')
})

test('путь переводится между языками, русский без префикса', () => {
	assert.equal(localeOfPath('/en/account'), 'en')
	assert.equal(localeOfPath('/account'), 'ru')
	assert.equal(localeOfPath('/ru/account'), 'ru')
	assert.equal(localizePath('/account', 'en'), '/en/account')
	assert.equal(localizePath('/', 'en'), '/en/')
	assert.equal(localizePath('/en/account', 'ru'), '/account')
	assert.equal(localizePath('/en', 'ru'), '/')
	assert.equal(localizePath('/en/', 'en'), '/en/')
	// Так пути отдаёт Astro на сборке с `build.format: 'file'`.
	assert.equal(localeOfPath('/en.html'), 'en')
	assert.equal(localizePath('/en/login.html', 'ru'), '/login')
	assert.equal(localizePath('/index.html', 'en'), '/en/')
})

test('alternates даёт обе версии и x-default на русскую', () => {
	assert.deepEqual(alternates('https://x.test/en/login?q=1'), [
		{ hreflang: 'ru', href: 'https://x.test/login' },
		{ hreflang: 'en', href: 'https://x.test/en/login' },
		{ hreflang: 'x-default', href: 'https://x.test/login' },
	])
})

test('язык из Accept-Language: по весам, по основному тегу, иначе русский', () => {
	assert.equal(negotiateLocale('en-US,en;q=0.9,ru;q=0.8'), 'en')
	assert.equal(negotiateLocale('de-DE,ru;q=0.5,en;q=0.7'), 'en')
	assert.equal(negotiateLocale('ru-RU,ru;q=0.9,en;q=0.8'), 'ru')
	assert.equal(negotiateLocale('fr,de'), 'ru')
	assert.equal(negotiateLocale('en;q=0'), 'ru')
	assert.equal(negotiateLocale(''), 'ru')
	assert.equal(negotiateLocale(undefined), 'ru')
})

const boot = readFileSync(join(import.meta.dirname, '..', 'site', 'locale-boot.js'), 'utf8')

/** Прогоняет locale-boot на странице `path` и возвращает, куда он увёл, или `null`. */
function runBoot({ languages, path = '/about', cookie = '', others = ['en'], locale = 'ru' }) {
	let target = null

	vm.runInNewContext(boot, {
		document: { cookie, currentScript: { dataset: { cookie: 'lang', locale, locales: JSON.stringify(others) } } },
		navigator: { languages },
		location: { pathname: path, search: '?q=1', hash: '', replace: (href) => (target = href) },
	})

	return target
}

test('locale-boot уводит на язык браузера, только если пользователь не читает на языке по умолчанию', () => {
	assert.equal(runBoot({ languages: ['en-US', 'en'] }), '/en/about?q=1')
	assert.equal(runBoot({ languages: ['en'], path: '/' }), '/en/?q=1')
	assert.equal(runBoot({ languages: ['de-DE', 'fr'] }), '/en/about?q=1')
	assert.equal(runBoot({ languages: ['en-US', 'ru-RU'] }), null)
	assert.equal(runBoot({ languages: ['RU'] }), null)
	assert.equal(runBoot({ languages: [] }), null)
	assert.equal(runBoot({ languages: ['ru'], locale: 'en', others: ['ru'] }), '/ru/about?q=1')
})

test('locale-boot не спорит с явным выбором в cookie', () => {
	assert.equal(runBoot({ languages: ['en'], cookie: 'theme=dark; lang=ru' }), null)
	assert.equal(runBoot({ languages: ['en'], cookie: 'xlang=ru' }), '/en/about?q=1')
})

test('locale-boot не уводит со страницы под префиксом, даже если это 404 из корня', () => {
	assert.equal(runBoot({ languages: ['en'], path: '/en/missing' }), null)
	assert.equal(runBoot({ languages: ['en'], path: '/en' }), null)
	assert.equal(runBoot({ languages: ['en'], path: '/english' }), '/en/english?q=1')
})

test('без locale компоненты говорят по-русски, как раньше', () => {
	const credit = html(Credit, { repo: 'https://github.com/aimuzov/x' })

	assert.match(credit, /Сделано с&nbsp;любовью|Сделано с любовью/)
	assert.match(credit, /Исходный код/)
	assert.match(html(CopyValue, { value: 'v' }), /Скопировать/)
	assert.match(html(Dropzone, { onfile() {} }), /Перетащите файл сюда/)
	assert.equal(formatSize(1536), '1,5 КБ')
	assert.equal(
		rejectFile({ name: 'a.exe', type: '', size: 1 }, { accept: '.zip' }),
		'Этот тип файла не подходит: a.exe',
	)
})

test('с locale en компоненты переходят на английский', () => {
	const credit = html(Credit, { repo: 'https://github.com/aimuzov/x', locale: 'en' })

	assert.match(credit, /Made with love by/)
	assert.match(credit, /Source code/)
	assert.match(html(CopyValue, { value: 'v', locale: 'en' }), /Copy/)
	assert.match(html(Dropzone, { onfile() {}, locale: 'en' }), /Drop a file here/)
	assert.equal(formatSize(1536, 'en'), '1.5 KB')
	assert.equal(
		rejectFile({ name: 'a', type: '', size: 2048 }, { maxSize: 1024 }, 'en'),
		'The file is larger than 1 KB',
	)
})

test('меню языков ведёт на тот же путь на каждом языке и отмечает текущий', () => {
	const ru = html(LangSwitch, { locale: 'ru', path: '/account' })
	const en = html(LangSwitch, { locale: 'en', path: '/en/account' })

	assert.match(ru, /<details/)
	assert.match(ru, />RU</)
	assert.match(ru, /href="\/en\/account"[^>]*hreflang="en"/)
	assert.match(ru, /href="\/account"[^>]*aria-current="true"/)
	assert.match(ru, /Русский/)
	assert.match(ru, /English/)
	assert.match(en, /href="\/account"[^>]*lang="ru"/)
	assert.match(en, /href="\/en\/account"[^>]*aria-current="true"/)
})

test('сайт с английским в корне задаёт свою схему языков', () => {
	const routing = { locales: ['en', 'ru'], defaultLocale: 'en' }

	assert.equal(localizePath('/extras', 'ru', routing), '/ru/extras')
	assert.equal(localizePath('/ru/extras', 'en', routing), '/extras')
	assert.equal(localizePath('/', 'ru', routing), '/ru/')
	assert.equal(localizePath('/ru/', 'en', routing), '/')
	assert.equal(localeOfPath('/ru/', routing), 'ru')
	assert.equal(localeOfPath('/extras', routing), 'en')
	assert.equal(negotiateLocale('de, fr', routing), 'en')
	assert.equal(toLocale('xx', routing), 'en')
	assert.deepEqual(alternates('https://x.test/ru/extras', routing), [
		{ hreflang: 'en', href: 'https://x.test/extras' },
		{ hreflang: 'ru', href: 'https://x.test/ru/extras' },
		{ hreflang: 'x-default', href: 'https://x.test/extras' },
	])

	const menu = html(LangSwitch, { locale: 'en', path: '/extras', ...routing })

	assert.match(menu, /href="\/ru\/extras"/)
	assert.match(menu, />EN</)
})

test('кнопка темы подписана на языке страницы и несёт обе иконки', () => {
	const en = html(ThemeToggle, { locale: 'en' })

	assert.match(en, /aria-label="Switch theme"/)
	assert.match(en, /theme-toggle__sun/)
	assert.match(en, /theme-toggle__moon/)
	assert.match(html(ThemeToggle, { label: 'Тема' }), /aria-label="Тема"/)
})
