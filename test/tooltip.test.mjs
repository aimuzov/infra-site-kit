import assert from 'node:assert/strict'
import test from 'node:test'
import { positionTooltip } from '../site/tooltip.js'

test('positions above the cursor and clamps to the viewport', () => {
	assert.deepEqual(
		positionTooltip({ point: { x: 5, y: 10 }, width: 80, height: 30, viewportWidth: 200, margin: 8, gap: 12 }),
		{ x: 8, y: 8, side: 'top' },
	)
})

test('flips an anchored tooltip below its element near the top edge', () => {
	assert.deepEqual(
		positionTooltip({
			point: { x: 190, y: 5 },
			bottom: 25,
			width: 80,
			height: 30,
			viewportWidth: 200,
			margin: 16,
			gap: 8,
			flip: true,
			topMargin: 4,
		}),
		{ x: 104, y: 33, side: 'bottom' },
	)
})
