import { expect, test } from 'vitest'
import type { Layer, ImageLayer } from './layers'
import { parseTemplate, toTemplate } from './template'

const PIXEL = 'data:image/png;base64,iVBORw0KGgo='
const image = (id: string): ImageLayer => ({
  id,
  type: 'image',
  name: id,
  element: {} as HTMLImageElement,
  source: PIXEL,
  width: 200,
  height: 100,
  x: 540,
  y: 960,
  rotation: 10,
  scale: 2,
})
const text: Layer = {
  id: 't',
  type: 'text',
  name: 'Title',
  text: 'Hello',
  size: 72,
  font: 'Inter',
  color: '#ffffff',
  background: '#1c2030',
  backgroundEnabled: false,
  x: 100,
  y: 200,
  rotation: 0,
  scale: 1,
}
const state = {
  format: '9:16' as const,
  background: '#ffeecc',
  size: { width: 1080, height: 1920 },
  main: image('main'),
  layers: [image('logo'), text],
}

test('the template describes the visual bottom to top, without browser objects', () => {
  const template = toTemplate(state)

  expect(template).toMatchObject({ version: 1, format: '9:16', width: 1080, height: 1920, background: '#ffeecc' })
  expect(template.elements.map((e) => [e.type, e.name])).toEqual([['image', 'main'], ['image', 'logo'], ['text', 'Title']])
  expect(template.elements[0]).toMatchObject({ role: 'main', source: PIXEL, x: 540, y: 960, rotation: 10, scale: 2 })
  // a disabled text background is written as null
  expect(template.elements[2]).toMatchObject({ text: 'Hello', background: null })
  expect(JSON.stringify(template)).not.toContain('element"')
})

test('a saved template is read back unchanged', () => {
  const template = toTemplate(state)
  expect(parseTemplate(JSON.stringify(template))).toEqual(template)
})

test('a damaged file is rejected with the reason', () => {
  const template = toTemplate(state)
  expect(() => parseTemplate('not json')).toThrow('JSON valide')
  expect(() => parseTemplate(JSON.stringify({ ...template, version: 2 }))).toThrow('version inconnue')
  const remote = { ...template, elements: [{ ...template.elements[0], source: 'https://example.fr/a.png' }] }
  expect(() => parseTemplate(JSON.stringify(remote))).toThrow('image embarquée')
  const withoutX = { ...template, elements: [{ ...template.elements[2], x: 'left' }] }
  expect(() => parseTemplate(JSON.stringify(withoutX))).toThrow('x de l\'élément 1 doit être un nombre')
})
