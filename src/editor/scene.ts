import { Canvas, FabricImage, type FabricObject } from 'fabric'
import type { useEditor } from '../stores/editor'
import type { Layer } from './layers'
import type { Size } from './formats'

type Editor = ReturnType<typeof useEditor>

function create(layer: Layer): FabricObject {
  const common = { originX: 'center', originY: 'center', lockScalingFlip: true } as const
  const object = new FabricImage(layer.element, common)
  // corner handles only: the layer keeps its proportions
  object.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false })
  return object
}

/** What Fabric must display for a store layer. */
function properties(layer: Layer): Record<string, unknown> {
  return {
    left: layer.x,
    top: layer.y,
    angle: layer.rotation,
    scaleX: layer.scale,
    scaleY: layer.scale,
  }
}

/** Brings an angle between -180 and 180 degrees, like the rotation slider. */
function shortAngle(angle: number): number {
  return ((((angle + 180) % 360) + 360) % 360) - 180
}

/**
 * Binds the store to a Fabric canvas. The store stays the single source of truth:
 * `sync` copies its state into Fabric, and gestures made on the canvas
 * (move, resize, rotate) go back through the store actions.
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

    destroy() {
      return canvas.dispose()
    },
  }
}

export type Scene = ReturnType<typeof createScene>
