import assert from 'node:assert/strict'
import test from 'node:test'

import { render } from 'svelte/server'

import Credit from '../site/credit.svelte'
import { alternates, localeOfPath, localizePath, negotiateLocale, t, toLocale } from '../site/i18n.js'
import en from '../site/i18n/en.js'
import ru from '../site/i18n/ru.js'
import CopyValue from '../site/ui/copy-value.svelte'
import Dropzone from '../site/ui/dropzone.svelte'
import { formatSize, rejectFile } from '../site/ui/files.js'
import LangSwitch from '../site/ui/lang-switch.svelte'

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

test('переключатель ведёт на тот же путь на другом языке', () => {
	const toEn = html(LangSwitch, { locale: 'ru', path: '/account' })
	const toRu = html(LangSwitch, { locale: 'en', path: '/en/account' })

	assert.match(toEn, /href="\/en\/account"/)
	assert.match(toEn, /hreflang="en"/)
	assert.match(toRu, /href="\/account"/)
	assert.match(toRu, /lang="ru"/)
})
