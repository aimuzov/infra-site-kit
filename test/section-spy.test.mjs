import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import { currentSection, watchSection } from '../site/section-spy.js'

// Заглушка окна: прокрутка `page.y`, слушатели и кадры, которые выполняются,
// только когда тест скажет (`page.flush()`).
const page = {
	y: 0,
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
	scroll(y) {
		page.y = y
		page.listeners.scroll()
	},
}

Object.assign(globalThis, {
	innerHeight: 900,
	addEventListener: (name, fn) => (page.listeners[name] = fn),
	removeEventListener: (name) => delete page.listeners[name],
	requestAnimationFrame: (run) => (page.frames.set(++page.lastFrame, run), page.lastFrame),
	cancelAnimationFrame: (id) => page.frames.delete(id),
})

/** Заголовок на `y` пикселей от начала документа, его верх в окне сдвигается прокруткой. */
const heading = (id, y) => ({ id, getBoundingClientRect: () => ({ top: y - page.y }) })

// Треть окна -- 300 пикселей от верха.
const doc = [heading('intro', 100), heading('setup', 500), heading('usage', 1400)]

/** Контейнер со своей прокруткой: верх на `top`, видимая высота `height`. */
function container(top, height) {
	return {
		clientHeight: height,
		/** @type {Record<string, Function>} */
		listeners: {},
		getBoundingClientRect: () => ({ top }),
		addEventListener(name, fn) {
			this.listeners[name] = fn
		},
		removeEventListener(name) {
			delete this.listeners[name]
		},
	}
}

const reset = () => {
	page.y = 0
	page.listeners = {}
	page.frames.clear()
}

test('the current section is the last heading that has risen to a third of the window', () => {
	reset()
	assert.equal(currentSection(doc)?.id, 'intro')

	page.y = 199
	assert.equal(currentSection(doc)?.id, 'intro')

	page.y = 200
	assert.equal(currentSection(doc)?.id, 'setup')

	page.y = 2000
	assert.equal(currentSection(doc)?.id, 'usage')
})

test('above the first heading there is no current section', () => {
	reset()
	assert.equal(currentSection([heading('setup', 500)]), null)
	assert.equal(currentSection([]), null)
})

test('a line of its own gets the viewport and moves the switch point', () => {
	reset()

	/** @type {unknown[]} */
	const seen = []
	// 30 % окна вместо трети: 270 пикселей от верха.
	const line = (viewport) => (seen.push(viewport), viewport.top + viewport.height * 0.3)

	page.y = 210
	assert.equal(currentSection(doc)?.id, 'setup')
	assert.equal(currentSection(doc, { line })?.id, 'intro')
	assert.deepEqual(seen, [{ top: 0, height: 900 }])
})

test('in a container the line counts from its top and visible height', () => {
	reset()

	// Треть контейнера -- 100 + 600 / 3 = 300 пикселей от верха окна.
	const scroller = container(100, 600)

	page.y = 199
	assert.equal(currentSection(doc, { scroller })?.id, 'intro')

	page.y = 200
	assert.equal(currentSection(doc, { scroller })?.id, 'setup')
})

test('the window passed as the scroller is the same as no scroller', () => {
	reset()
	page.y = 200
	assert.equal(currentSection(doc, { scroller: globalThis })?.id, 'setup')
})

test('headings may come as any iterable, such as a NodeList', () => {
	reset()
	page.y = 200
	assert.equal(currentSection(new Set(doc))?.id, 'setup')
})

test('the first report comes in the next frame, not right away', () => {
	reset()

	/** @type {unknown[]} */
	const calls = []
	const stop = watchSection(doc, (h) => calls.push(h?.id ?? null))

	assert.deepEqual(calls, [])
	page.flush()
	assert.deepEqual(calls, ['intro'])

	stop()
})

test('above the first heading the first report is null', () => {
	reset()

	/** @type {unknown[]} */
	const calls = []
	const stop = watchSection([heading('setup', 500)], (h) => calls.push(h))

	page.flush()
	assert.deepEqual(calls, [null])

	stop()
})

test('scrolls between two frames are measured once', () => {
	reset()

	let reads = 0
	const counted = doc.map((h) => ({ ...h, getBoundingClientRect: () => (reads++, h.getBoundingClientRect()) }))
	const stop = watchSection(counted, () => {})

	page.flush()
	reads = 0

	for (let y = 10; y <= 50; y += 10) page.scroll(y)

	assert.equal(page.frames.size, 1)
	page.flush()
	assert.ok(reads > 0 && reads <= counted.length, String(reads))

	stop()
})

test('the callback runs only when the section changes', () => {
	reset()

	/** @type {unknown[]} */
	const calls = []
	const stop = watchSection(doc, (h) => calls.push(h?.id ?? null))

	page.flush()

	page.scroll(100)
	page.flush()
	assert.deepEqual(calls, ['intro'])

	page.scroll(200)
	page.flush()
	page.scroll(1100)
	page.flush()
	assert.deepEqual(calls, ['intro', 'setup', 'usage'])

	// Обратно к началу, выше первого заголовка.
	page.scroll(-300)
	page.flush()
	assert.deepEqual(calls, ['intro', 'setup', 'usage', null])

	stop()
})

test('a resize is measured too, since the text reflows without a scroll', () => {
	reset()

	/** @type {unknown[]} */
	const calls = []
	const stop = watchSection(doc, (h) => calls.push(h?.id ?? null), { line: () => innerHeight / 3 })

	page.flush()
	globalThis.innerHeight = 1500
	page.listeners.resize()
	page.flush()
	assert.deepEqual(calls, ['intro', 'setup'])

	globalThis.innerHeight = 900
	stop()
})

test('in a container it follows the container scroll and the window resize', () => {
	reset()

	const scroller = container(100, 600)
	/** @type {unknown[]} */
	const calls = []
	const stop = watchSection(doc, (h) => calls.push(h?.id ?? null), { scroller })

	assert.equal(page.listeners.scroll, undefined)
	assert.ok(page.listeners.resize)

	page.flush()
	page.y = 200
	scroller.listeners.scroll()
	page.flush()
	assert.deepEqual(calls, ['intro', 'setup'])

	stop()
	assert.deepEqual(Object.keys(scroller.listeners), [])
})

test('the stop takes the listeners and the pending frame away', () => {
	reset()

	const calls = []
	const stop = watchSection(doc, (h) => calls.push(h))

	stop()
	assert.deepEqual(Object.keys(page.listeners), [])
	assert.equal(page.frames.size, 0)
	assert.deepEqual(calls, [])
})

test('the package exports the section spy with its types', () => {
	const root = join(import.meta.dirname, '..')
	const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
	const entry = pkg.exports['./section-spy.js']

	assert.ok(entry, './section-spy.js')

	for (const file of [entry.types, entry.default]) assert.ok(existsSync(join(root, file)), file)
})
