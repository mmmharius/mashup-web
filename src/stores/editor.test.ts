import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, test, vi } from 'vitest'
import type { ImageLayer } from '../editor/layers'
import { useEditor } from './editor'

// no browser here: decoding an image and loading a font are replaced, the rest of the store is the real one
vi.mock('../editor/layers', async (original) => ({
  ...(await original<typeof import('../editor/layers')>()),
  loadImage: async () => ({}) as HTMLImageElement,
}))
vi.mock('../editor/fonts', async (original) => ({
  ...(await original<typeof import('../editor/fonts')>()),
  loadFont: async () => {},
}))

function image(id: string, width: number, height: number): ImageLayer {
  const element = {} as HTMLImageElement
  return { id, type: 'image', name: id, element, source: '', width, height, x: 0, y: 0, rotation: 0, scale: 1 }
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

test('a saved template opens as the same visual, and undo brings the previous one back', async () => {
  const editor = useEditor()
  editor.format = '9:16'
  editor.background = '#ffeecc'
  editor.main = { ...image('main', 2000, 1000), source: 'data:image/png;base64,AA==', x: 540, y: 960, scale: 2 }
  editor.layers = [
    { ...image('logo', 100, 100), source: 'data:image/png;base64,AA==', x: 100, y: 100 },
    { id: 't', type: 'text', name: 'Title', text: 'Hello', size: 72, font: 'Inter', color: '#ffffff', background: '#1c2030', backgroundEnabled: false, x: 540, y: 1500, rotation: 5, scale: 1 },
  ]
  const saved = new File([JSON.stringify(editor.exportTemplate())], 'template.json')
  editor.remove('main')
  editor.remove('logo')
  editor.selectFormat('1:1')

  await editor.openTemplate(saved)

  expect(editor.format).toBe('9:16')
  expect(editor.background).toBe('#ffeecc')
  expect(editor.main).toMatchObject({ id: 'main', name: 'main', width: 2000, height: 1000, x: 540, y: 960, scale: 2 })
  expect(editor.layers.map((layer) => [layer.type, layer.name])).toEqual([['image', 'logo'], ['text', 'Title']])
  // a text saved without background comes back with its background off, ready to be switched on again
  expect(editor.layers[1]).toMatchObject({ text: 'Hello', rotation: 5, backgroundEnabled: false, background: '#1c2030' })
  expect(editor.exportTemplate()).toEqual(JSON.parse(await saved.text()))

  editor.undo()
  expect(editor.format).toBe('1:1')
  expect(editor.main).toBeNull()
})
