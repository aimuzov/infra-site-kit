import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import { coverRadius, themePeek } from '../site/theme-peek.js'

// Заглушка страницы: DOM ровно настолько, чтобы хватило подглядыванию,
// а кадры выполняются только когда тест скажет (`page.flush()`).
const page = {
	scheme: 'light',
	hover: true,
	/** @type {Record<string, Function>} */
	listeners: {},
	/** @type {Map<number, Function>} */
	frames: new Map(),
	lastFrame: 0,
	flush() {
		const due = [...page.frames.values()]

		page.frames.clear()
		for (const run of due) run(0)
	},
}

function element(rect = { left: 0, top: 0, width: 0, height: 0 }) {
	const props = new Map()
	const classes = new Set()
	const el = {
		rect,
		reads: 0,
		/** @type {Record<string, Function>} */
		listeners: {},
		dataset: {},
		children: [],
		style: {
			setProperty: (name, value) => props.set(name, value),
			getPropertyValue: (name) => props.get(name) ?? '',
		},
		classList: {
			toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
			contains: (name) => classes.has(name),
		},
		set className(name) {
			classes.add(name)
		},
		getBoundingClientRect() {
			el.reads++

			return el.rect
		},
		addEventListener: (name, fn) => (el.listeners[name] = fn),
		removeEventListener: (name) => delete el.listeners[name],
		replaceChildren: (...children) => (el.children = children),
		querySelectorAll: () => [],
		remove: () => (document.body.children = document.body.children.filter((child) => child !== el)),
	}

	return el
}

const document = {
	documentElement: { ...element(), clientWidth: 1000 },
	body: { children: [], append: (node) => document.body.children.push(node) },
	createElement: () => element(),
}

Object.assign(globalThis, {
	document,
	innerHeight: 800,
	scrollX: 0,
	scrollY: 0,
	addEventListener: (name, fn) => (page.listeners[name] = fn),
	removeEventListener: (name) => delete page.listeners[name],
	matchMedia: (query) => ({ matches: query === '(hover: hover)' && page.hover }),
	getComputedStyle: () => ({ colorScheme: page.scheme }),
	requestAnimationFrame: (run) => (page.frames.set(++page.lastFrame, run), page.lastFrame),
	cancelAnimationFrame: (id) => page.frames.delete(id),
})

/** Кнопка темы с центром в точке (x, y). */
const button = (x, y) => element({ left: x - 10, top: y - 10, width: 20, height: 20 })
const peeks = () => document.body.children.filter((child) => child.classList.contains('theme-peek'))

test('coverRadius matches the plain circle area when the whole circle is on the screen', () => {
	const r = coverRadius(500, 500, 1000, 1000, 0.1)

	assert.ok(Math.abs(r - Math.sqrt(100_000 / Math.PI)) < 1, String(r))
})

test('coverRadius grows the circle in a corner, where three quarters of it are off the screen', () => {
	const r = coverRadius(0, 0, 1000, 1000, 0.1)

	assert.ok(Math.abs(r - Math.sqrt(400_000 / Math.PI)) < 1, String(r))
})

test('the package exports the theme peek files it ships', () => {
	const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'))

	for (const target of ['./theme-peek.js', './theme-peek.css']) assert.ok(pkg.exports[target], target)
})

test('the peek stays off without a mouse', () => {
	page.hover = false

	assert.equal(themePeek(button(100, 10)), undefined)
	assert.deepEqual(Object.keys(page.listeners), [])

	page.hover = true
})

test('scrolls between two frames are drawn once, measuring the button once', () => {
	const anchor = button(100, 10)
	const cleanup = themePeek(anchor)

	for (let i = 0; i < 5; i++) page.listeners.scroll()

	assert.equal(page.frames.size, 1)
	page.flush()
	assert.equal(anchor.reads, 1)

	cleanup()
})

test('the page does not follow the pointer, so nothing grows on the way to the button', () => {
	const anchor = button(100, 10)
	const cleanup = themePeek(anchor)

	assert.equal(page.listeners.pointermove, undefined)
	page.flush()
	assert.equal(peeks().length, 0)

	anchor.listeners.pointerenter()
	page.flush()
	assert.equal(peeks().length, 1)

	cleanup()
	assert.equal(peeks().length, 0)
})

test('of two buttons side by side only the hovered one opens its circle', () => {
	const left = button(100, 10)
	const cleanups = [themePeek(left), themePeek(button(160, 10))]

	left.listeners.pointerenter()
	page.flush()

	assert.equal(peeks().length, 1)
	assert.equal(peeks()[0].style.getPropertyValue('--peek-x'), '100px')

	for (const cleanup of cleanups) cleanup()
})

test('on hover the circle opens to a third of the screen, measured once until the screen changes', (t) => {
	const anchor = button(100, 10)
	const cleanup = themePeek(anchor)

	anchor.listeners.pointerenter()
	page.flush()

	const [peek] = peeks()

	assert.equal(peek.style.getPropertyValue('--peek-r'), `${coverRadius(100, 10, 1000, 800)}px`)
	assert.equal(peek.style.opacity, '1')
	assert.equal(peek.classList.contains('theme-peek--open'), true)

	const sqrt = t.mock.method(Math, 'sqrt')

	page.listeners.scroll()
	page.flush()
	assert.equal(sqrt.mock.callCount(), 0)

	document.documentElement.clientWidth = 900
	page.listeners.resize()
	page.flush()
	assert.ok(sqrt.mock.callCount() > 0)

	document.documentElement.clientWidth = 1000
	cleanup()
})

test('a click puts the circle out until the pointer comes onto a button again', () => {
	const anchor = button(100, 10)
	const cleanup = themePeek(anchor)

	anchor.listeners.pointerenter()
	page.flush()

	const [peek] = peeks()

	anchor.listeners.click()
	page.flush()
	assert.equal(peek.style.getPropertyValue('--peek-r'), '0px')

	anchor.listeners.pointerleave()
	page.flush()
	assert.equal(peek.style.getPropertyValue('--peek-r'), '0px')

	anchor.listeners.pointerenter()
	page.flush()
	assert.equal(peek.style.opacity, '1')

	cleanup()
})

test('the copy leaves the page once the circle has shrunk to nothing', () => {
	const anchor = button(100, 10)
	const cleanup = themePeek(anchor)

	anchor.listeners.pointerenter()
	page.flush()
	anchor.listeners.pointerleave()
	page.flush()

	const [peek] = peeks()

	page.listeners.transitionend({ target: peek, propertyName: 'clip-path' })
	assert.equal(peeks().length, 0)

	cleanup()
})

test('target gets the current scheme, and a target equal to it shows nothing', () => {
	/** @type {string[]} */
	const seen = []
	const anchor = button(100, 10)
	const cleanup = themePeek(anchor, { target: (current) => (seen.push(current), 'light') })

	anchor.listeners.pointerenter()
	page.flush()

	assert.deepEqual(seen, ['light'])
	assert.equal(peeks().length, 0)

	cleanup()
})

test('the last cleanup takes the page listeners and the pending frame away', () => {
	const cleanups = [themePeek(button(100, 10)), themePeek(button(160, 10))]

	page.listeners.scroll()
	cleanups[0]()
	assert.ok(page.listeners.scroll)

	cleanups[1]()
	assert.deepEqual(Object.keys(page.listeners), [])
	assert.equal(page.frames.size, 0)
})
