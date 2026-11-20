import { defineStore } from 'pinia'
import { type Layer, type ImageLayer, loadImage, MAIN_ID } from '../editor/layers'
import { coverScale, type Format, canvasSize } from '../editor/formats'

export const useEditor = defineStore('editor', {
  state: () => ({
    format: 'auto' as Format,
    main: null as ImageLayer | null,
    selectionId: null as string | null,
  }),

  getters: {
    size: (state) => canvasSize(state.format, state.main),
    selection(state): Layer | null {
      return state.main?.id === state.selectionId ? state.main : null
    },
  },

  actions: {
    selectFormat(format: Format) {
      this.format = format
      this.recenterMain()
    },

    async importMain(file: File) {
      const element = await loadImage(file)
      this.main = {
        id: MAIN_ID,
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
      this.recenterMain()
      this.selectionId = MAIN_ID
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

    select(id: string | null) {
      this.selectionId = id
    },

    /** Move, zoom or rotation of a layer. */
    update(id: string, changes: Partial<Pick<Layer, 'x' | 'y' | 'rotation' | 'scale'>>) {
      if (this.main?.id === id) Object.assign(this.main, changes)
    },
  },
})
