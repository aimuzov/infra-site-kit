import assert from 'node:assert/strict'
import test from 'node:test'

import { typographMiddleware } from '../site/typograph-middleware.js'
import { typographHtml, typographText } from '../site/typograph.js'

test('formats Russian text, numbers, phones and remains idempotent', () => {
	const source = 'Я в доме... 12000 ₽, А. С. Пушкин, можно ли? +7 999 123 45 67'
	const result = typographText(source)
	assert.equal(result, 'Я в доме… 12 000 ₽, А. С. Пушкин, можно ли? +7 999 123 45 67')
	assert.equal(typographText(result), result)
	assert.equal(typographText('12000 ₽', { thousandsSeparator: ' ' }), '12 000 ₽')
	assert.equal(typographText('abc12345 #12345'), 'abc12345 #12345')
})

test('HTML protects attributes, raw text, nested foreign languages and inline boundaries', () => {
	const source = `<html lang="ru"><p title="Я в доме > ...">Я в <a>доме</a> — текст...</p><section lang='en'><span>I am in a home...</span><section lang="ru">Я в доме...</section></section><kbd>Я в доме...</kbd><code>Я в доме...</code><!-- Я в доме... --><script>const x = "<p>Я в доме...</p>"</script></html>`
	const result = typographHtml(source)
	assert.ok(result.includes('title="Я в доме > ..."'))
	assert.ok(result.includes('Я в <a>доме</a> — текст…'))
	assert.ok(
		result.includes(
			`<section lang='en'><span>I am in a home...</span><section lang="ru">Я в доме...</section></section>`,
		),
	)
	assert.ok(result.includes('<kbd>Я в доме...</kbd><code>Я в доме...</code>'))
	assert.ok(result.includes('<!-- Я в доме... -->'))
	assert.ok(result.includes('<script>const x = "<p>Я в доме...</p>"</script>'))
	assert.equal(typographHtml(result), result)
	assert.equal(typographHtml('<p lang=ru-RU>Я в доме...</p>'), '<p lang=ru-RU>Я в доме…</p>')
})

test('middleware preserves response metadata and processes Russian HTML only', async () => {
	const run = typographMiddleware()
	const response = await run(
		{},
		async () =>
			new Response('<html lang="ru"><p>Я в доме...</p></html>', {
				status: 201,
				statusText: 'Created',
				headers: { 'content-type': 'text/html; charset=utf-8', 'content-length': '12', 'x-test': 'yes' },
			}),
	)
	assert.equal(response.status, 201)
	assert.equal(response.statusText, 'Created')
	assert.equal(response.headers.get('x-test'), 'yes')
	assert.equal(response.headers.get('content-length'), null)
	assert.match(await response.text(), /Я в доме…/)
	const english = new Response('<html lang="en">I am in a home...</html>', {
		headers: { 'content-type': 'text/html' },
	})
	const unchanged = await run({}, async () => english)
	assert.equal(await unchanged.text(), '<html lang="en">I am in a home...</html>')
	const json = new Response('{}', { headers: { 'content-type': 'application/json' } })
	assert.equal(await run({}, async () => json), json)
})

test('language attributes are parsed without reading other attribute values', () => {
	assert.equal(typographHtml(`<p data-hint=' lang="en"'>Я в доме...</p>`), `<p data-hint=' lang="en"'>Я в доме…</p>`)
	assert.equal(
		typographHtml('<p LANG = EN><b>Я в доме...</b></p><p>Я в доме...</p>'),
		'<p LANG = EN><b>Я в доме...</b></p><p>Я в доме…</p>',
	)
})

test('middleware handles empty HTML responses', async () => {
	const empty = new Response(null, { status: 204, headers: { 'content-type': 'text/html' } })
	assert.equal(await typographMiddleware()({}, async () => empty), empty)
})

test('nested pre, code and kbd stay protected until their outer closing tag', () => {
	for (const name of ['pre', 'code', 'kbd']) {
		const protectedHtml = `<${name}><${name}>Ctrl</${name}> и клавиша...</${name}>`
		assert.equal(typographHtml(`${protectedHtml}<p>Я в доме...</p>`), `${protectedHtml}<p>Я в доме…</p>`)
	}
	const source = '<pre><code><code>Ctrl</code> и код...</code> и блок...</pre>'
	assert.equal(typographHtml(source), source)
})

test('raw and RCDATA elements close at their first end tag without nesting', () => {
	for (const name of ['script', 'style', 'textarea']) {
		const raw = `<${name}><${name}>Я в доме...</${name}>`
		assert.equal(typographHtml(`${raw}<p>Я в доме...</p>`), `${raw}<p>Я в доме…</p>`)
	}
})

test('implied list-item ends do not leak the previous item language', () => {
	assert.equal(
		typographHtml('<ul><li lang="en">English...<li>Я в доме...</ul>'),
		'<ul><li lang="en">English...<li>Я в доме…</ul>',
	)
	assert.equal(
		typographHtml('<ul><li lang="en">English...<ul><li>Я в доме...</ul><li>Я в доме...</ul>'),
		'<ul><li lang="en">English...<ul><li>Я в доме...</ul><li>Я в доме…</ul>',
	)
})

test('implied paragraph and definition-item ends reset language in the right scope', () => {
	assert.equal(typographHtml('<p lang="en">English...<p>Я в доме...'), '<p lang="en">English...<p>Я в доме…')
	assert.equal(
		typographHtml('<p lang="en">English...<div>Я в доме...</div>'),
		'<p lang="en">English...<div>Я в доме…</div>',
	)
	assert.equal(
		typographHtml('<dl><dt lang="en">English...<dd>Я в доме...<dt>Я в доме...</dl>'),
		'<dl><dt lang="en">English...<dd>Я в доме…<dt>Я в доме…</dl>',
	)
	assert.equal(
		typographHtml('<dl><dd lang="en">English...<dl><dt>Я в доме...</dl><dd>Я в доме...</dl>'),
		'<dl><dd lang="en">English...<dl><dt>Я в доме...</dl><dd>Я в доме…</dl>',
	)
})
