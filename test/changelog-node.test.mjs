import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
	addRelease,
	changelogSection,
	distHas,
	distPages,
	readConfig,
	sectionDate,
	sectionPulls,
	verifyChangelog,
} from '../changelog/node.mjs'

const entry = (version, date, items = ['Пункт']) => ({ version, date, title: 'Заголовок', items })

/** Сайт во временном каталоге: package.json, ченжлог и собранные страницы. */
function site({ version = '1.1.0', changelog = 'data/changelog.json', releases, pages = ['/', '/about/'] } = {}) {
	const cwd = mkdtempSync(join(tmpdir(), 'site-changelog-'))

	writeFileSync(join(cwd, 'package.json'), JSON.stringify({ version, changelog }))
	mkdirSync(join(cwd, 'data'))

	if (releases) writeFileSync(join(cwd, 'data/changelog.json'), JSON.stringify(releases))

	for (const page of pages) {
		mkdirSync(join(cwd, 'dist', page), { recursive: true })
		writeFileSync(join(cwd, 'dist', page, 'index.html'), '')
	}

	return cwd
}

test('readConfig takes true, a path or an object and returns null without the field', () => {
	assert.equal(readConfig(site({ changelog: null })), null)
	assert.equal(readConfig(site({ changelog: true })).file, 'src/frontend/data/changelog.json')
	assert.equal(readConfig(site()).file, 'data/changelog.json')

	assert.deepEqual(readConfig(site({ changelog: { file: 'a.json', icons: ['X'] } })), {
		file: 'a.json',
		guide: 'changelog.guide.md',
		icons: ['X'],
		locales: [],
		version: '1.1.0',
	})
})

/** Приложение: без package.json, с changelog.config.json и манифестом release-please. */
function app({ version = '0.2.0', releases, locales } = {}) {
	const cwd = mkdtempSync(join(tmpdir(), 'app-changelog-'))

	writeFileSync(join(cwd, 'changelog.config.json'), JSON.stringify({ file: 'changelog.json', locales }))
	writeFileSync(join(cwd, '.release-please-manifest.json'), JSON.stringify({ '.': version }))

	if (releases) writeFileSync(join(cwd, 'changelog.json'), JSON.stringify(releases))

	return cwd
}

test('readConfig of an app takes changelog.config.json and the release-please version', () => {
	assert.deepEqual(readConfig(app({ locales: ['ru', 'en'] })), {
		file: 'changelog.json',
		guide: 'changelog.guide.md',
		icons: [],
		locales: ['ru', 'en'],
		version: '0.2.0',
	})
})

test('verifyChangelog of an app wants every language and lets links leave the site', () => {
	const both = {
		title: { ru: 'Т', en: 'T' },
		items: { ru: ['[Релиз](https://github.com/x/y) и [страница](/install/)'], en: ['[odd](mailto:a@b)'] },
	}

	assert.deepEqual(
		verifyChangelog(app({ locales: ['ru', 'en'], releases: [{ ...entry('0.2.0', '2026-10-26'), ...both }] })),
		['0.2.0: mailto:a@b is neither a site path nor an https link'],
	)

	assert.deepEqual(verifyChangelog(app({ locales: ['ru', 'en'], releases: [entry('0.2.0', '2026-10-26')] })), [])
	assert.deepEqual(
		verifyChangelog(
			app({ locales: ['ru', 'en'], releases: [{ ...entry('0.2.0', '2026-10-26'), title: { ru: 'Т' } }] }),
		),
		['0.2.0: title has no en version'],
	)
})

test('verifyChangelog wants an entry for the package version', () => {
	assert.deepEqual(verifyChangelog(site({ releases: [entry('1.1.0', '2026-01-02')] })), [])
	assert.deepEqual(verifyChangelog(site({ releases: [{ version: '1.1.0', hidden: true }] })), [])
	assert.match(verifyChangelog(site({ releases: [entry('1.0.0', '2026-01-01')] }))[0], /add a 1\.1\.0 entry/)
	assert.match(verifyChangelog(site())[0], /is missing/)
	assert.deepEqual(verifyChangelog(site({ changelog: null })), [])
})

test('verifyChangelog checks links against the build', () => {
	const cwd = site({
		releases: [entry('1.1.0', '2026-01-02', ['[О сайте](/about/#a) и [нет](/nope/), [внешняя](https://x.y)'])],
	})

	assert.deepEqual(verifyChangelog(cwd), ['1.1.0: /nope/ leads to no page'])
	assert.deepEqual(verifyChangelog(cwd, { dist: 'missing' }), [])
})

test('distHas and distPages read the build', () => {
	const cwd = site({ pages: ['/', '/a/', '/a/b/'] })

	assert.ok(distHas(join(cwd, 'dist'), '/a/b/'))
	assert.ok(distHas(join(cwd, 'dist'), '/a/b'))
	assert.ok(!distHas(join(cwd, 'dist'), '/c/'))
	assert.deepEqual(distPages(join(cwd, 'dist')), ['/', '/a/', '/a/b/'])
})

test('changelogSection cuts the release-please section of a version', () => {
	const md = [
		'# Changelog',
		'',
		'## [1.1.0](https://x/compare/v1.0.0...v1.1.0) (2026-10-19)',
		'',
		'### Features',
		'',
		'* a thing ([#88](https://x/issues/88)) ([7930d2a](https://x/commit/7930d2a))',
		'* another ([#89](https://x/issues/89))',
		'',
		'## [1.0.0](https://x) (2026-10-01)',
		'',
		'* old ([#1](https://x/issues/1))',
	].join('\n')
	const section = changelogSection(md, '1.1.0')

	assert.match(section, /^## \[1\.1\.0\]/)
	assert.ok(!section.includes('1.0.0]'))
	assert.equal(sectionDate(section), '2026-10-19')
	assert.deepEqual(sectionPulls(section), [88, 89])
	assert.equal(changelogSection(md, '2.0.0'), '')
})

test('addRelease puts the entry on top and keeps the file when it does not pass', () => {
	const cwd = site({ releases: [entry('1.0.0', '2026-01-01')] })
	const file = join(cwd, 'data/changelog.json')

	assert.deepEqual(addRelease(cwd, entry('1.1.0', '2026-01-02', ['[нет](/nope/)'])), [
		'1.1.0: /nope/ leads to no page',
	])

	assert.equal(JSON.parse(readFileSync(file, 'utf8')).length, 1)

	assert.deepEqual(addRelease(cwd, entry('1.1.0', '2026-01-02', ['[О сайте](/about/)'])), [])

	assert.deepEqual(
		JSON.parse(readFileSync(file, 'utf8')).map((r) => r.version),
		['1.1.0', '1.0.0'],
	)
})
