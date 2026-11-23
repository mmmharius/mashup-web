import { createPinia, setActivePinia, type PiniaPluginContext } from 'pinia'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { ImageLayer, TextLayer } from '../editor/layers'

// the tracking layer reads the page address when it loads: give it one before importing it
vi.stubGlobal('window', {})
vi.stubGlobal('location', { search: '?utm_source=tiktok&utm_medium=video' })
vi.stubGlobal('document', { referrer: 'https://www.linkedin.com/' })
vi.spyOn(console, 'debug').mockImplementation(() => {})
const { editorTracking } = await import('./pinia')
const { useEditor } = await import('../stores/editor')

const image = (id: string): ImageLayer => ({
  id, type: 'image', name: id, element: {} as HTMLImageElement, source: 'data:image/png;base64,AA==',
  width: 100, height: 100, x: 0, y: 0, rotation: 0, scale: 1,
})
const text: TextLayer = {
  id: 't', type: 'text', name: '', text: 'Hello', size: 72, font: 'Inter', color: '#ffffff',
  background: '#1c2030', backgroundEnabled: true, x: 0, y: 0, rotation: 0, scale: 1,
}

/** Events sent since the start of the test, oldest first. */
const sent = () => (window.dataLayer ?? []) as Record<string, unknown>[]

function trackedEditor() {
  const editor = useEditor()
  editorTracking({ store: editor } as unknown as PiniaPluginContext)
  return editor
}

beforeEach(() => {
  setActivePinia(createPinia())
  window.dataLayer = []
})
afterEach(() => vi.useRealTimers())

test('every event carries the acquisition source and the session', () => {
  const editor = trackedEditor()
  editor.selectFormat('9:16')

  expect(sent()).toHaveLength(1)
  expect(sent()[0]).toMatchObject({ event: 'format_selected', format: '9:16', width: 1080, height: 1920, utm_source: 'tiktok', utm_medium: 'video', source: 'tiktok' })
  expect(sent()[0].session_id).toEqual(expect.any(String))
})

test('an action that changes nothing or fails is not tracked', async () => {
  const editor = trackedEditor()
  editor.selectFormat('auto') // already the active format
  editor.undo() // nothing to undo
  await expect(editor.openTemplate(new File(['not json'], 'template.json'))).rejects.toThrow('JSON valide')

  expect(sent()).toEqual([])
})

test('images are counted the same way everywhere, main image included', () => {
  const editor = trackedEditor()
  editor.main = image('main')
  editor.layers = [image('logo'), text]
  editor.exportTemplate()

  expect(sent()[0]).toMatchObject({ event: 'template_saved', image_count: 2, text_count: 1 })
})

test('removing the main image or a layer says which kind was removed', () => {
  const editor = trackedEditor()
  editor.main = image('main')
  editor.layers = [text]
  editor.remove('t')
  editor.remove('main')
  editor.undo()

  expect(sent().map((e) => [e.event, e.type ?? e.direction])).toEqual([['layer_deleted', 'text'], ['layer_deleted', 'main'], ['history_used', 'undo']])
})

test('typing sends a single event once it stops, with the settings touched', async () => {
  vi.useFakeTimers()
  const editor = trackedEditor()
  editor.layers = [{ ...text }]
  await editor.updateText('t', { text: 'Hello w' })
  await editor.updateText('t', { text: 'Hello world' })
  await editor.updateText('t', { color: '#ff0000' })
  expect(sent()).toEqual([])

  vi.advanceTimersByTime(1000)
  expect(sent()).toHaveLength(1)
  expect(sent()[0]).toMatchObject({ event: 'text_edited', fields: 'color,text' })
})
