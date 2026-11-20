import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, test } from 'vitest'
import type { ImageLayer } from '../editor/layers'
import { useEditor } from './editor'

function image(id: string, width: number, height: number): ImageLayer {
  const element = {} as HTMLImageElement
  return { id, type: 'image', name: id, element, width, height, x: 0, y: 0, rotation: 0, scale: 1 }
}

beforeEach(() => setActivePinia(createPinia()))

test('changing format keeps the main image framing and the layers in place', () => {
  const editor = useEditor()
  editor.format = '1:1'
  // main image 2000 x 1000: zoomed 2x relative to the cover size, and rotated
  editor.main = { ...image('main', 2000, 1000), x: 540, y: 540, rotation: 30, scale: 2.16 }
  editor.layers = [{ ...image('logo', 100, 100), x: 270, y: 810, scale: 3 }]

  editor.selectFormat('16:9')

  expect(editor.main).toMatchObject({ x: 960, y: 540, rotation: 30 })
  expect(editor.main!.scale).toBeCloseTo(2 * 1.08)
  // left quarter and three quarters of the height, same size because the short side did not change
  expect(editor.layers[0]).toMatchObject({ x: 480, y: 810, scale: 3 })
})

test('undo then redo a removal', () => {
  const editor = useEditor()
  editor.layers = [image('a', 10, 10), image('b', 10, 10)]

  editor.remove('a')
  expect(editor.layers.map((layer) => layer.id)).toEqual(['b'])
  editor.undo()
  expect(editor.layers.map((layer) => layer.id)).toEqual(['a', 'b'])
  editor.redo()
  expect(editor.layers.map((layer) => layer.id)).toEqual(['b'])
})

test('quick successive updates of one layer make a single history step', () => {
  const editor = useEditor()
  editor.layers = [image('a', 10, 10)]

  editor.update('a', { scale: 2 })
  editor.update('a', { scale: 3 })
  editor.undo()

  expect(editor.layers[0].scale).toBe(1)
})

test('rename a layer, then undo', () => {
  const editor = useEditor()
  editor.layers = [image('a', 10, 10)]

  editor.rename('a', '  Client logo ')
  expect(editor.layers[0].name).toBe('Client logo')
  editor.undo()
  expect(editor.layers[0].name).toBe('a')
})
