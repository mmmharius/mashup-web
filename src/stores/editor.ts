import { defineStore } from 'pinia'
import {
  type Layer,
  type ImageLayer,
  type TextLayer,
  loadImage,
  MAIN_ID,
  newId,
} from '../editor/layers'
import { coverScale, type Format, canvasSize } from '../editor/formats'
import { loadFont, FONTS } from '../editor/fonts'

async function imageLayer(file: File, id: string): Promise<ImageLayer> {
  const element = await loadImage(file)
  return {
    id,
    type: 'image',
    name: file.name,
    element,
    width: element.naturalWidth,
    height: element.naturalHeight,
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
  }
}

export const useEditor = defineStore('editor', {
  state: () => ({
    format: 'auto' as Format,
    main: null as ImageLayer | null,
    /** Layers placed over the main image, bottom to top. */
    layers: [] as Layer[],
    selectionId: null as string | null,
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
      this.resize(() => (this.format = format))
    },

    async importMain(file: File) {
      const image = await imageLayer(file, MAIN_ID)
      this.resize(() => (this.main = image))
      this.selectionId = MAIN_ID
    },

    /** Applies a change that may resize the canvas, then moves the layers proportionally. */
    resize(change: () => void) {
      const before = this.size
      change()
      const after = this.size
      for (const layer of this.layers) {
        layer.x *= after.width / before.width
        layer.y *= after.height / before.height
      }
      this.recenterMain()
    },

    /** Puts the main image back in the center, upright, at the size that covers the canvas. */
    recenterMain() {
      if (!this.main) return
      Object.assign(this.main, {
        x: this.size.width / 2,
        y: this.size.height / 2,
        rotation: 0,
        scale: coverScale(this.main, this.size),
      })
    },

    async addImage(file: File) {
      const image = await imageLayer(file, newId())
      image.x = this.size.width / 2
      image.y = this.size.height / 2
      // placed at 40% of the canvas width: visible without hiding the main image
      image.scale = (this.size.width * 0.4) / image.width
      this.layers.push(image)
      this.selectionId = image.id
    },

    async addText() {
      const font = FONTS[0]
      await loadFont(font)
      const text: TextLayer = {
        id: newId(),
        type: 'text',
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
      if (layer?.type === 'text') Object.assign(layer, changes)
    },

    select(id: string | null) {
      this.selectionId = id
    },

    /** Move, zoom or rotation of a layer. */
    update(id: string, changes: Partial<Pick<Layer, 'x' | 'y' | 'rotation' | 'scale'>>) {
      const layer = this.main?.id === id ? this.main : this.layers.find((c) => c.id === id)
      if (layer) Object.assign(layer, changes)
    },

    /** Moves a layer up (+1) or down (-1) in the stack. */
    reorder(id: string, direction: 1 | -1) {
      const fromIndex = this.layers.findIndex((layer) => layer.id === id)
      const toIndex = fromIndex + direction
      if (fromIndex < 0 || toIndex < 0 || toIndex >= this.layers.length) return
      const [layer] = this.layers.splice(fromIndex, 1)
      this.layers.splice(toIndex, 0, layer)
    },

    remove(id: string) {
      if (this.main?.id === id) this.resize(() => (this.main = null))
      this.layers = this.layers.filter((layer) => layer.id !== id)
      if (this.selectionId === id) this.selectionId = null
    },
  },
})
