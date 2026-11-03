import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import processCss from 'postcss'

import postcss from '../postcss.mjs'

test('creates fresh plugin chains in the required order', () => {
	const a = postcss(),
		b = postcss()
	assert.deepEqual(
		a.plugins.map((p) => p.postcssPlugin),
		['postcss-global-data', 'postcss-custom-media', 'postcss-nested'],
	)
	assert.notEqual(a.plugins, b.plugins)
	assert.notEqual(a.plugins[0], b.plugins[0])
})

test('loads custom media before expanding nested rules', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'site-kit-postcss-'))
	try {
		const mediaFile = join(directory, 'media.css')
		await writeFile(mediaFile, '@custom-media --small (width < 40rem);')
		const result = await processCss(postcss({ mediaFile }).plugins).process(
			'.card { @media (--small) { & .label { color: red; } } }',
			{ from: undefined },
		)
		assert.match(result.css, /@media \(width < 40rem\)/)
		assert.match(result.css, /\.card \.label/)
		assert.doesNotMatch(result.css, /--small|&/)
	} finally {
		await rm(directory, { recursive: true, force: true })
	}
})
