import { defineStore } from 'pinia'
import {
  type Layer,
  type ImageLayer,
  type TextLayer,
  loadImage,
  MAIN_ID,
  readFile,
  newId,
} from '../editor/layers'
import { coverScale, type Format, canvasSize } from '../editor/formats'
import { loadFont, FONTS } from '../editor/fonts'
import { parseTemplate, type Template, toTemplate } from '../editor/template'

async function imageLayer(file: File, id: string): Promise<ImageLayer> {
  const source = await readFile(file)
  const element = await loadImage(source, file.name)
  return {
    id,
    type: 'image',
    name: file.name,
    element,
    source,
    width: element.naturalWidth,
    height: element.naturalHeight,
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
  }
}

/** State restored by undo / redo. The selection is not part of it. */
interface Snapshot {
  format: Format
  background: string
  main: ImageLayer | null
  layers: Layer[]
}

const HISTORY_MAX = 50
/** Quick successive updates of the same layer (slider, wheel, typing) make a single history step. */
const GROUPING_DELAY = 800
let lastKey = ''
let lastTime = 0

export const useEditor = defineStore('editor', {
  state: () => ({
    format: 'auto' as Format,
    /** Canvas background color, visible wherever the main image does not cover. */
    background: '#ffffff',
    main: null as ImageLayer | null,
    /** Layers placed over the main image, bottom to top. */
    layers: [] as Layer[],
    selectionId: null as string | null,
    /** Previous states (undo) and undone states (redo). */
    past: [] as Snapshot[],
    future: [] as Snapshot[],
  }),

  getters: {
    size: (state) => canvasSize(state.format, state.main),
    selection(state): Layer | null {
      if (state.main?.id === state.selectionId) return state.main
      return state.layers.find((layer) => layer.id === state.selectionId) ?? null
    },
  },

  actions: {
    selectFormat(format: Format) {
      if (format === this.format) return
      this.remember()
      this.resize(() => (this.format = format))
    },

    setBackground(color: string) {
      this.remember('background')
      this.background = color
    },

    async importMain(file: File) {
      const image = await imageLayer(file, MAIN_ID)
      this.remember()
      this.resize(() => (this.main = image))
      this.recenter()
      this.selectionId = MAIN_ID
    },

    /**
     * Applies a change that may resize the canvas, without undoing the work already done:
     * each layer keeps its relative place and size, the main image keeps its framing.
     */
    resize(change: () => void) {
      const before = this.size
      const image = this.main
      const coverBefore = image ? coverScale(image, before) : 1
      change()
      const after = this.size
      const ratioX = after.width / before.width
      const ratioY = after.height / before.height
      // short-side ratio: a logo keeps the same size from 9:16 to 16:9
      const zoom = Math.min(after.width, after.height) / Math.min(before.width, before.height)
      for (const layer of this.layers) {
        layer.x *= ratioX
        layer.y *= ratioY
        layer.scale *= zoom
      }
      // same image as before: its zoom stays the same relative to the size that covers the canvas
      if (image && image === this.main) {
        image.x *= ratioX
        image.y *= ratioY
        image.scale *= coverScale(image, after) / coverBefore
      }
    },

    /** Puts the main image back in the center, upright, at the size that covers the canvas. */
    recenter() {
      if (!this.main) return
      Object.assign(this.main, {
        x: this.size.width / 2,
        y: this.size.height / 2,
        rotation: 0,
        scale: coverScale(this.main, this.size),
      })
    },

    recenterMain() {
      this.remember()
      this.recenter()
    },

    async addImage(file: File) {
      const image = await imageLayer(file, newId())
      image.x = this.size.width / 2
      image.y = this.size.height / 2
      // placed at 40% of the canvas width: visible without hiding the main image
      image.scale = (this.size.width * 0.4) / image.width
      this.remember()
      this.layers.push(image)
      this.selectionId = image.id
    },

    async addText() {
      const font = FONTS[0]
      await loadFont(font)
      const text: TextLayer = {
        id: newId(),
        type: 'text',
        name: '',
        text: 'Votre texte',
        // readable whatever the format: one fifteenth of the canvas width
        size: Math.round(this.size.width / 15),
        font,
        color: '#ffffff',
        background: '#1c2030',
        backgroundEnabled: true,
        x: this.size.width / 2,
        y: this.size.height / 2,
        rotation: 0,
        scale: 1,
      }
      this.remember()
      this.layers.push(text)
      this.selectionId = text.id
    },

    async updateText(
      id: string,
      changes: Partial<Pick<TextLayer, 'text' | 'size' | 'font' | 'color' | 'background' | 'backgroundEnabled'>>,
    ) {
      // the font must be loaded before drawing, otherwise Fabric measures the text with another one
      if (changes.font) await loadFont(changes.font)
      const layer = this.layers.find((c) => c.id === id)
      if (layer?.type !== 'text') return
      this.remember(`text:${id}`)
      Object.assign(layer, changes)
    },

    select(id: string | null) {
      this.selectionId = id
    },

    /** Move, zoom or rotation of a layer. */
    update(id: string, changes: Partial<Pick<Layer, 'x' | 'y' | 'rotation' | 'scale'>>) {
      const layer = this.main?.id === id ? this.main : this.layers.find((c) => c.id === id)
      if (!layer) return
      this.remember(`position:${id}`)
      Object.assign(layer, changes)
    },

    /** Name shown in the layer list. */
    rename(id: string, name: string) {
      const layer = this.layers.find((c) => c.id === id)
      if (!layer || layer.name === name.trim()) return
      // an image always keeps a name; a text with an empty name falls back to the start of its content
      if (layer.type === 'image' && !name.trim()) return
      this.remember()
      layer.name = name.trim()
    },

    /** Moves a layer up (+1) or down (-1) in the stack. */
    reorder(id: string, direction: 1 | -1) {
      const fromIndex = this.layers.findIndex((layer) => layer.id === id)
      const toIndex = fromIndex + direction
      if (fromIndex < 0 || toIndex < 0 || toIndex >= this.layers.length) return
      this.remember()
      const [layer] = this.layers.splice(fromIndex, 1)
      this.layers.splice(toIndex, 0, layer)
    },

    remove(id: string) {
      this.remember()
      if (this.main?.id === id) this.resize(() => (this.main = null))
      this.layers = this.layers.filter((layer) => layer.id !== id)
      if (this.selectionId === id) this.selectionId = null
    },

    /** The visual described as JSON, ready to be saved then replayed by the server. */
    exportTemplate(): Template {
      return toTemplate(this)
    },

    /** Replaces the visual with the one from a template file. Nothing changes if the file is invalid. */
    async openTemplate(file: File) {
      const template = parseTemplate(await file.text())
      const layers = await Promise.all(
        template.elements.map(async ({ role, ...e }: Template['elements'][number] & { role?: string }): Promise<Layer> => {
          const id = role === 'main' ? MAIN_ID : newId()
          if (e.type === 'image') return { ...e, id, element: await loadImage(e.source, e.name) }
          await loadFont(e.font)
          const { background, ...text } = e
          return { ...text, id, background: background ?? '#1c2030', backgroundEnabled: background !== null }
        }),
      )
      this.remember()
      this.format = template.format
      this.background = template.background
      this.main = (layers.find((layer) => layer.id === MAIN_ID) as ImageLayer | undefined) ?? null
      this.layers = layers.filter((layer) => layer.id !== MAIN_ID)
      this.selectionId = null
    },

    /** Copy of the current state. The images themselves are shared, only their settings are copied. */
    snapshot(): Snapshot {
      return {
        format: this.format,
        background: this.background,
        main: this.main && { ...this.main },
        layers: this.layers.map((layer) => ({ ...layer })),
      }
    },

    /** Keeps the current state before a change. With a key, groups quick successive changes. */
    remember(key = '') {
      const now = Date.now()
      const grouped = key !== '' && key === lastKey && now - lastTime < GROUPING_DELAY
      lastKey = key
      lastTime = now
      if (grouped) return
      this.past = [...this.past, this.snapshot()].slice(-HISTORY_MAX)
      this.future = []
    },

    restore(snapshot: Snapshot) {
      Object.assign(this, snapshot)
      lastKey = ''
      if (!this.selection) this.selectionId = null
    },

    undo() {
      const previous = this.past.at(-1)
      if (!previous) return
      this.future = [...this.future, this.snapshot()]
      this.past = this.past.slice(0, -1)
      this.restore(previous)
    },

    redo() {
      const next = this.future.at(-1)
      if (!next) return
      this.past = [...this.past, this.snapshot()]
      this.future = this.future.slice(0, -1)
      this.restore(next)
    },
  },
})
