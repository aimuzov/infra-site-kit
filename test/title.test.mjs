import assert from 'node:assert/strict'
import test from 'node:test'

import { pageTitle } from '../site/title.js'

test('preserves site-specific title conventions', () => {
	assert.equal(pageTitle(undefined, { siteName: 'Site' }), 'Site')
	assert.equal(pageTitle('', { siteName: 'Site', homeTitle: 'Home' }), 'Home')
	assert.equal(pageTitle('Page', { siteName: 'Site' }), 'Page — Site')
	assert.equal(pageTitle('Site', { siteName: 'Site' }), 'Site — Site')
	assert.equal(pageTitle('Site', { siteName: 'Site', omitSameName: true }), 'Site')
	assert.equal(pageTitle('Page', { siteName: 'Site', separator: ' | ' }), 'Page | Site')
})

test('SEO renders explicit metadata and keeps noindex URLs separate from canonical', async () => {
	const { execFile } = await import('node:child_process')
	const { promisify } = await import('node:util')
	const { mkdtemp, readFile, rm } = await import('node:fs/promises')
	const { tmpdir } = await import('node:os')
	const { join } = await import('node:path')
	const output = await mkdtemp(join(tmpdir(), 'site-kit-seo-'))
	try {
		await promisify(execFile)(
			process.execPath,
			['node_modules/astro/bin/astro.mjs', 'build', '--root', 'test/seo', '--outDir', output],
			{ cwd: new URL('..', import.meta.url), timeout: 60000 },
		)
		const home = await readFile(join(output, 'index.html'), 'utf8')
		assert.match(home, /<title>Страница — Сайт<\/title>/)
		assert.match(home, /name="description" content="Описание страницы"/)
		assert.match(home, /rel="canonical" href="https:\/\/example.test\/"/)
		assert.match(home, /property="og:url" content="https:\/\/example.test\/"/)
		assert.match(home, /property="og:image" content="https:\/\/example.test\/og.png"/)
		const service = await readFile(join(output, 'service/index.html'), 'utf8')
		assert.match(service, /name="robots" content="noindex"/)
		assert.match(service, /property="og:url" content="https:\/\/example.test\/service\/"/)
		assert.doesNotMatch(service, /rel="canonical"|property="og:type"|property="og:locale"|property="og:image"/)
		const minimal = await readFile(join(output, 'minimal/index.html'), 'utf8')
		assert.doesNotMatch(
			minimal,
			/rel="canonical"|name="robots"|property="og:url"|property="og:type"|property="og:locale"|property="og:image"/,
		)
	} finally {
		await rm(output, { recursive: true, force: true })
	}
})
