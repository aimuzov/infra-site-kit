import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import { syncYear } from '../site/year.js'

test('syncYear puts the current year into every data-year element', () => {
	const nodes = [{ textContent: '2020' }, { textContent: '' }]
	const root = { querySelectorAll: (selector) => (selector === '[data-year]' ? nodes : []) }

	syncYear(root)
	assert.deepEqual(
		nodes.map((node) => node.textContent),
		Array(2).fill(String(new Date().getFullYear())),
	)
})

test('the credit takes its colours and spacing from variables with the old look as defaults', () => {
	const source = readFileSync(join(import.meta.dirname, '..', 'site', 'credit.svelte'), 'utf8')

	for (const variable of ['--credit-color', '--credit-hover', '--credit-gap', '--credit-decoration']) {
		assert.match(source, new RegExp(`var\\(${variable}, `), variable)
	}

	assert.match(source, /var\(--credit-glitch-a, rgb\(255 0 90 \/ 70%\)\)/)
	assert.match(source, /var\(--credit-glitch-b, rgb\(0 210 255 \/ 70%\)\)/)
	assert.doesNotMatch(source, /drop-shadow\(-?[\d.]+em 0 rgb\(/)
})

test('the package exports the credit files it ships', () => {
	const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'))

	for (const target of ['./credit.astro', './credit.svelte', './year.js']) assert.ok(pkg.exports[target], target)
	assert.ok(pkg.files.includes('site'))
})
