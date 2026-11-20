import { Canvas } from 'fabric'
import type { Size } from './formats'

/** Creates the editor Fabric canvas. */
export function createScene(element: HTMLCanvasElement) {
  const canvas = new Canvas(element, {
    backgroundColor: '#ffffff',
    // a selected layer keeps its place in the stack
    preserveObjectStacking: true,
    // no multi-selection lasso
    selection: false,
  })

  return {
    /** Shows the canvas scaled down on screen: layers stay in export pixels. */
    resizeView(size: Size, scale: number) {
      canvas.setDimensions({ width: size.width * scale, height: size.height * scale })
      canvas.setZoom(scale)
    },

    destroy() {
      return canvas.dispose()
    },
  }
}

export type Scene = ReturnType<typeof createScene>
