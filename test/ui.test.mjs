import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import { createRawSnippet } from 'svelte'
import { render } from 'svelte/server'

import Alert from '../site/ui/alert.svelte'
import Badge from '../site/ui/badge.svelte'
import Button from '../site/ui/button.svelte'
import Card from '../site/ui/card.svelte'
import CopyValue from '../site/ui/copy-value.svelte'
import Dropzone from '../site/ui/dropzone.svelte'
import Field from '../site/ui/field.svelte'
import InfoTip from '../site/ui/info-tip.svelte'
import Input from '../site/ui/input.svelte'
import Skeleton from '../site/ui/skeleton.svelte'
import { formatSize, matchesAccept, rejectFile } from '../site/ui/files.js'

const root = join(import.meta.dirname, '..')
const text = (value) => createRawSnippet(() => ({ render: () => `<span>${value}</span>` }))
const html = (component, props) => render(component, { props }).body

test('matchesAccept understands extensions, exact types and wildcards', () => {
	const zip = { name: 'Komplekt.ZIP', type: 'application/zip' }

	assert.ok(matchesAccept(zip, ''))
	assert.ok(matchesAccept(zip, '.xml, .zip'))
	assert.ok(matchesAccept(zip, 'application/zip'))
	assert.ok(matchesAccept({ name: 'a.png', type: 'image/png' }, 'image/*'))
	assert.ok(!matchesAccept(zip, '.json,application/json'))
	// Перетащенный файл может прийти без типа: тогда решает расширение.
	assert.ok(matchesAccept({ name: 'result.json', type: '' }, '.json,application/json'))
})

test('formatSize writes Russian units with a comma and a no-break space', () => {
	assert.equal(formatSize(512), '512 Б')
	assert.equal(formatSize(1536), '1,5 КБ')
	assert.equal(formatSize(1024 * 1024 * 1024), '1 ГБ')
	assert.equal(formatSize(20 * 1024 * 1024), '20 МБ')
})

test('rejectFile names the reason or returns null', () => {
	const file = { name: 'result.json', type: 'application/json', size: 2048 }

	assert.equal(rejectFile(file, { accept: '.json', maxSize: 4096 }), null)
	assert.match(rejectFile(file, { accept: '.zip' }), /тип файла/)
	assert.match(rejectFile(file, { maxSize: 1024 }), /больше 1 КБ/)
})

test('button renders its variant and size and keeps native attributes', () => {
	const body = html(Button, { variant: 'danger', size: 'lg', disabled: true, children: text('Удалить') })

	assert.match(body, /class="button button--danger button--lg/)
	assert.match(body, /type="button"/)
	assert.match(body, /disabled/)
	assert.match(body, /Удалить/)
})

test('card renders the title with an icon slot, the info tip and the danger tone', () => {
	const body = html(Card, { title: 'Данные', info: 'Справка', tone: 'danger', children: text('тело') })

	assert.match(body, /card card--stack card--danger/)
	assert.match(body, /<h2 class="card__title/)
	assert.match(body, /role="tooltip"[^>]*>Справка</)
	assert.doesNotMatch(html(Card, { children: text('тело') }), /<h2/)
})

test('field ties the label to the input and marks a missing value', () => {
	const body = html(Field, { label: 'Токен', for: 'token', missing: true, children: text('') })

	assert.match(body, /<label class="field__label[^"]*" for="token">/)
	assert.match(body, /field__missing/)
})

test('input, badge, alert and skeleton render their modifiers', () => {
	assert.match(
		html(Input, { value: 'ab12', code: true, name: 'room' }),
		/class="input input--code[^"]*"[^>]*name="room"/,
	)
	assert.match(html(Badge, { mono: true, children: text('№ 12') }), /badge badge--mono/)
	assert.match(html(Alert, { variant: 'danger', title: 'Ошибка', children: text('x') }), /role="alert"/)
	assert.match(html(Skeleton, { width: '7rem', round: true }), /class="skeleton skeleton--round/)
})

// Статичный HTML с атрибутом style строгая CSP режет.
// Размеры и сдвиги компоненты ставят в браузере через el.style.
test('skeleton and info-tip render no style attribute', () => {
	assert.doesNotMatch(html(Skeleton, { width: '7rem', height: '2rem', round: true }), /style=/)
	assert.doesNotMatch(html(InfoTip, { text: 'Пояснение' }), /style=/)
})

test('copy-value voices the label and the value', () => {
	const body = html(CopyValue, { label: 'ИНН', value: '7700000000' })

	assert.match(body, /aria-label="Скопировать ИНН 7700000000"/)
	assert.match(body, /role="status"/)
})

test('dropzone hides the file input behind a keyboard-reachable zone', () => {
	const body = html(Dropzone, { onfile() {}, accept: '.json', note: 'result.json', error: 'Сервер занят' })

	assert.match(body, /<input type="file" accept=".json" hidden/)
	assert.match(body, /role="button" tabindex="0"/)
	assert.match(body, /dropzone--error/)
	assert.match(body, /role="alert">Сервер занят</)
	assert.match(html(Dropzone, { onfile() {}, disabled: true }), /tabindex="-1"[^>]*aria-disabled="true"/)
})

test('every ui component ships typings and uses only --ui- tokens', () => {
	const dir = join(root, 'site/ui')
	const files = readdirSync(dir)

	for (const file of files.filter((name) => name.endsWith('.svelte'))) {
		assert.ok(files.includes(`${file}.d.ts`), `${file}.d.ts`)

		const tokens = readFileSync(join(dir, file), 'utf8').match(/var\(--[a-z-]+/g) ?? []

		for (const token of tokens) assert.match(token, /^var\(--ui-/, `${file}: ${token}`)
	}

	const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

	for (const target of ['./ui/*.svelte', './ui/tokens.css', './ui/files.js']) assert.ok(pkg.exports[target], target)
})

// Без сигнатуры для Astro `astro check` не пускает компонент на страницу, а svelte-check
// берёт пропсы из последней сигнатуры, поэтому `Component` замыкает декларацию.
test('every ui typing serves Astro first and Svelte last', () => {
	const dir = join(root, 'site/ui')

	for (const file of readdirSync(dir).filter((name) => name.endsWith('.svelte.d.ts'))) {
		const typing = readFileSync(join(dir, file), 'utf8')

		assert.match(typing, /declare const C: AstroComponent<(\w+)> & Component<\1[,>]/, file)
	}
})
