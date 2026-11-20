import { expect, test } from 'vitest'
import { displayScale, coverScale, canvasSize } from './formats'

test('a forced format ignores the image size', () => {
  expect(canvasSize('9:16', { width: 800, height: 600 })).toEqual({ width: 1080, height: 1920 })
})

test('auto mode takes the image size', () => {
  expect(canvasSize('auto', { width: 800, height: 600 })).toEqual({ width: 800, height: 600 })
})

test('auto mode without an image gives a default square', () => {
  expect(canvasSize('auto', null)).toEqual({ width: 1080, height: 1080 })
})

test('auto mode caps very large images and keeps the ratio', () => {
  expect(canvasSize('auto', { width: 8192, height: 4096 })).toEqual({ width: 4096, height: 2048 })
})

test('display shrinks the canvas but never enlarges it', () => {
  const canvas = { width: 1080, height: 1920 }
  expect(displayScale(canvas, { width: 540, height: 2000 })).toBe(0.5)
  expect(displayScale(canvas, { width: 5000, height: 5000 })).toBe(1)
})

test('an image covers the whole canvas', () => {
  expect(coverScale({ width: 500, height: 1000 }, { width: 1000, height: 1000 })).toBe(2)
})
