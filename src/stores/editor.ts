import { defineStore } from 'pinia'
import { type Format, canvasSize } from '../editor/formats'

export const useEditor = defineStore('editor', {
  state: () => ({
    format: 'auto' as Format,
  }),

  getters: {
    size: (state) => canvasSize(state.format),
  },

  actions: {
    selectFormat(format: Format) {
      this.format = format
    },
  },
})
