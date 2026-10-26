import assert from 'node:assert/strict'
import test from 'node:test'

import {
	itemHtml,
	itemLinks,
	localized,
	localizeRelease,
	releaseDate,
	releaseErrors,
	releaseId,
	releaseItems,
	visibleReleases,
} from '../site/changelog.js'

const release = (version, date, extra = {}) => ({ version, date, title: 'Заголовок', items: ['Пункт'], ...extra })

test('itemHtml turns links into anchors and escapes the rest', () => {
	assert.equal(
		itemHtml('Статья о [разрыве ПКС](/injuries/acl-tear/) & <b>'),
		'Статья о <a href="/injuries/acl-tear/">разрыве ПКС</a> &amp; &lt;b&gt;',
	)

	assert.equal(itemHtml('Без ссылок'), 'Без ссылок')
	assert.equal(itemHtml('[a"b](/x/)'), '<a href="/x/">a&quot;b</a>')
})

test('itemLinks lists every link path', () => {
	assert.deepEqual(itemLinks('[a](/a/) и [b](/b/#c)'), ['/a/', '/b/#c'])
})

test('releaseDate reads as a Russian date without the year suffix', () => {
	assert.equal(releaseDate('2026-10-18'), '18 октября 2026')
	assert.equal(releaseDate('2026-01-01'), '1 января 2026')
})

test('releaseId makes an anchor from the version', () => {
	assert.equal(releaseId('1.12.0'), 'v1-12-0')
})

test('visibleReleases drops hidden ones', () => {
	assert.deepEqual(
		visibleReleases([release('1.1.0', '2026-01-02'), { version: '1.0.1', hidden: true }]).map((r) => r.version),
		['1.1.0'],
	)
})

test('releaseErrors accepts a well-formed list with hidden entries in between', () => {
	assert.deepEqual(
		releaseErrors(
			[
				release('1.2.0', '2026-01-03', { icon: 'Goal' }),
				{ version: '1.1.1', hidden: true },
				release('1.1.0', '2026-01-02'),
			],
			{ icons: ['Goal'] },
		),
		[],
	)
})

test('releaseErrors catches broken entries', () => {
	const errors = releaseErrors(
		[
			release('1.2', '2026-01-03'),
			release('1.1.0', '03.01.2026'),
			release('1.0.1', '2026-01-01', { items: [] }),
			release('1.0.0', '2026-01-02', { title: ' ', icon: 'Nope' }),
			release('1.0.0', '2026-01-01'),
		],
		{ icons: ['Goal'] },
	)

	assert.deepEqual(errors, [
		'1.2: version must look like 1.2.3',
		'1.1.0: date must look like 2026-10-18',
		'1.0.1: items must be a non-empty list of strings',
		'1.0.1: is older than 1.0.0, newer releases go first',
		'1.0.0: title is empty',
		'1.0.0: unknown icon "Nope"',
		'1.0.0: the version is listed twice',
	])

	assert.deepEqual(releaseErrors({}), ['the changelog must be an array of releases'])
})

test("localized picks the page's language, then Russian, then any", () => {
	assert.equal(localized('Один'), 'Один')
	assert.equal(localized({ ru: 'Новое', en: 'New' }, 'en'), 'New')
	assert.equal(localized({ ru: 'Новое', en: 'New' }, 'de'), 'Новое')
	assert.equal(localized({ en: 'New' }), 'New')
	assert.deepEqual(localized(['a'], 'en'), ['a'])
})

test('localizeRelease gives the title and items in one language', () => {
	const r = release('1.0.0', '2026-01-01', { title: { ru: 'Т', en: 'T' }, items: { ru: ['П'], en: ['I'] } })

	assert.deepEqual(localizeRelease(r, 'en'), { ...r, title: 'T', items: ['I'] })
	assert.deepEqual(releaseItems(r), ['П', 'I'])
	assert.deepEqual(releaseItems(release('1.0.0', '2026-01-01')), ['Пункт'])
})

test('releaseErrors checks every language and the required ones', () => {
	const errors = releaseErrors(
		[
			release('1.1.0', '2026-01-02', { title: { ru: 'Т', en: ' ' }, items: { ru: ['П'], en: [] } }),
			release('1.0.0', '2026-01-01', { title: { ru: 'Т' }, items: { ru: ['П'] } }),
		],
		{ locales: ['ru', 'en'] },
	)

	assert.deepEqual(errors, [
		'1.1.0: title.en is empty',
		'1.1.0: items.en must be a non-empty list of strings',
		'1.0.0: title has no en version',
		'1.0.0: items has no en version',
	])

	assert.deepEqual(releaseErrors([release('1.0.0', '2026-01-01', { title: { ru: 'Т' } })]), [])
})
