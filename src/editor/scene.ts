import { Canvas, FabricImage, type FabricObject, IText } from 'fabric'
import type { useEditor } from '../stores/editor'
import type { Layer } from './layers'
import type { Size } from './formats'

type Editor = ReturnType<typeof useEditor>

/** Background padding around the text, as a fraction of the font size. */
const BACKGROUND_PADDING = 0.35

/** Text editable on the canvas, whose background extends slightly beyond the letters with rounded corners. */
class RoundedText extends IText {
  _renderBackground(ctx: CanvasRenderingContext2D) {
    if (!this.backgroundColor) return
    const padding = this.fontSize * BACKGROUND_PADDING
    const width = this.width + 2 * padding
    const height = this.height + 2 * padding
    ctx.fillStyle = this.backgroundColor
    ctx.beginPath()
    ctx.roundRect(-width / 2, -height / 2, width, height, this.fontSize * 0.2)
    ctx.fill()
  }
}

function create(layer: Layer): FabricObject {
  const common = { originX: 'center', originY: 'center', lockScalingFlip: true } as const
  const object =
    layer.type === 'image'
      ? new FabricImage(layer.element, common)
      : // no caching: the background drawn above extends beyond the text box
        new RoundedText(layer.text, { ...common, textAlign: 'center', objectCaching: false })
  // corner handles only: the layer keeps its proportions
  object.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false })
  return object
}

/** What Fabric must display for a store layer. */
function properties(layer: Layer): Record<string, unknown> {
  const position = {
    left: layer.x,
    top: layer.y,
    angle: layer.rotation,
    scaleX: layer.scale,
    scaleY: layer.scale,
  }
  if (layer.type === 'image') return position
  return {
    ...position,
    text: layer.text,
    fontSize: layer.size,
    fontFamily: layer.font,
    fill: layer.color,
    backgroundColor: layer.backgroundEnabled ? layer.background : '',
    padding: layer.size * BACKGROUND_PADDING,
  }
}

/** Brings an angle between -180 and 180 degrees, like the rotation slider. */
function shortAngle(angle: number): number {
  return ((((angle + 180) % 360) + 360) % 360) - 180
}

/**
 * Binds the store to a Fabric canvas. The store stays the single source of truth:
 * `sync` copies its state into Fabric, and gestures made on the canvas
 * (move, resize, rotate, type text) go back through the store actions.
 */
export function createScene(element: HTMLCanvasElement, editor: Editor) {
  const canvas = new Canvas(element, {
    backgroundColor: '#ffffff',
    // a selected layer keeps its place in the stack
    preserveObjectStacking: true,
    // no multi-selection lasso
    selection: false,
  })
  const objects = new Map<string, FabricObject>()
  const ids = new WeakMap<FabricObject, string>()

  canvas.on('object:modified', ({ target }) => {
    const id = ids.get(target)
    if (!id) return
    editor.update(id, {
      x: target.left,
      y: target.top,
      rotation: shortAngle(target.angle),
      scale: target.scaleX,
    })
  })

  const selection = () => {
    const active = canvas.getActiveObject()
    editor.select((active && ids.get(active)) ?? null)
  }
  canvas.on('selection:created', selection)
  canvas.on('selection:updated', selection)
  canvas.on('selection:cleared', selection)

  canvas.on('text:changed', ({ target }) => {
    const id = ids.get(target)
    if (id) editor.updateText(id, { text: target.text })
  })

  canvas.on('mouse:wheel', ({ e }) => {
    const layer = editor.selection
    if (!layer) return
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.05 : 1 / 1.05
    editor.update(layer.id, { scale: layer.scale * factor })
  })

  return {
    /** Copies the store state into Fabric: layers, order and selection. */
    sync() {
      const layers = [editor.main, ...editor.layers].filter((layer) => layer !== null)

      for (const [id, object] of objects) {
        const layer = layers.find((c) => c.id === id)
        // a replaced image keeps its id: its object has to be rebuilt
        const stale = layer?.type === 'image' && (object as FabricImage).getElement() !== layer.element
        if (layer && !stale) continue
        canvas.remove(object)
        objects.delete(id)
      }

      layers.forEach((layer, index) => {
        let object = objects.get(layer.id)
        if (!object) {
          object = create(layer)
          objects.set(layer.id, object)
          ids.set(object, layer.id)
          canvas.add(object)
        }
        // only touch what changes: rewriting the text while typing would move the caret
        for (const [key, value] of Object.entries(properties(layer))) {
          if (object.get(key) !== value) object.set(key, value)
        }
        object.setCoords()
        canvas.moveObjectTo(object, index)
      })

      const wanted = editor.selectionId ? objects.get(editor.selectionId) : undefined
      if (canvas.getActiveObject() !== wanted) {
        if (wanted) canvas.setActiveObject(wanted)
        else canvas.discardActiveObject()
      }
      canvas.requestRenderAll()
    },

    /** Shows the canvas scaled down on screen: layers stay in export pixels. */
    resizeView(size: Size, scale: number) {
      canvas.setDimensions({ width: size.width * scale, height: size.height * scale })
      canvas.setZoom(scale)
    },

    /** Renders the visual at its exact export size, without the selection handles. */
    render(size: Size): HTMLCanvasElement {
      const zoom = canvas.getZoom()
      const display = { width: canvas.width, height: canvas.height }
      canvas.setDimensions({ width: size.width, height: size.height })
      canvas.setZoom(1)
      try {
        return canvas.toCanvasElement()
      } finally {
        canvas.setDimensions(display)
        canvas.setZoom(zoom)
      }
    },

    destroy() {
      return canvas.dispose()
    },
  }
}

export type Scene = ReturnType<typeof createScene>
