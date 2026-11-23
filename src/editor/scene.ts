import { Canvas, FabricImage, type FabricObject, IText, Point, Rect } from 'fabric'
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

const ACCENT = '#4f46e5'

/** Rotation handle: a filled circle with an arrow, to tell it apart from the size handles. */
function rotationHandle(ctx: CanvasRenderingContext2D, left: number, top: number) {
  ctx.save()
  ctx.fillStyle = ACCENT
  ctx.beginPath()
  ctx.arc(left, top, 11, 0, 2 * Math.PI)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '15px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('↻', left, top + 1)
  ctx.restore()
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
  object.set({ borderColor: ACCENT, cornerColor: '#ffffff', cornerStrokeColor: ACCENT, transparentCorners: false })
  Object.assign(object.controls.mtr, { render: rotationHandle, sizeX: 24, sizeY: 24, cursorStyle: 'grab' })
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
export function createScene(element: HTMLCanvasElement, editor: Editor, onView: (zoom: number) => void) {
  const canvas = new Canvas(element, {
    // a selected layer keeps its place in the stack
    preserveObjectStacking: true,
    // no multi-selection lasso
    selection: false,
  })
  // the visual background: a rectangle at the very bottom of the stack, neither selectable nor movable
  const background = new Rect({ originX: 'left', originY: 'top', left: 0, top: 0, selectable: false, evented: false })
  canvas.add(background)
  let visual: Size = { width: 0, height: 0 }
  let exporting = false
  /** Zoom that shows the whole visual: the reference for the view zoom limits. */
  let fitZoom = 1

  // the canvas covers the whole workspace: whatever overflows the visual stays visible but dimmed,
  // and the handles are never cut off by the edge
  canvas.on('after:render', ({ ctx }) => {
    if (exporting) return
    const [scale, , , , left, top] = canvas.viewportTransform
    const density = canvas.getRetinaScaling()
    ctx.save()
    ctx.setTransform(density, 0, 0, density, 0, 0)
    ctx.beginPath()
    ctx.rect(0, 0, canvas.width, canvas.height)
    ctx.rect(left, top, visual.width * scale, visual.height * scale)
    ctx.fillStyle = 'rgb(243 244 247 / 0.8)'
    ctx.fill('evenodd')
    ctx.strokeStyle = '#c3c8d6'
    ctx.strokeRect(left, top, visual.width * scale, visual.height * scale)
    ctx.restore()
    // the handles are drawn again on top of the dimming
    canvas.drawControls(ctx)
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

  // the wheel zooms the view around the pointer (the visual itself does not change); with Shift it scrolls
  canvas.on('mouse:wheel', ({ e }) => {
    e.preventDefault()
    if (e.shiftKey) {
      const view = canvas.viewportTransform
      canvas.setViewportTransform([view[0], 0, 0, view[3], view[4] - e.deltaX - e.deltaY, view[5]])
      onView(view[0])
      return
    }
    const factor = e.deltaY < 0 ? 1.05 : 1 / 1.05
    const zoom = Math.min(fitZoom * 8, Math.max(fitZoom / 4, canvas.getZoom() * factor))
    canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), zoom)
    onView(zoom)
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
        // index 0: the background
        canvas.moveObjectTo(object, index + 1)
      })

      background.set({ width: editor.size.width, height: editor.size.height, fill: editor.background })

      const wanted = editor.selectionId ? objects.get(editor.selectionId) : undefined
      if (canvas.getActiveObject() !== wanted) {
        if (wanted) canvas.setActiveObject(wanted)
        else canvas.discardActiveObject()
      }
      canvas.requestRenderAll()
    },

    /** Centers the scaled-down visual in the workspace: layers stay in export pixels. */
    resizeView(size: Size, available: Size, scale: number) {
      visual = size
      fitZoom = scale
      onView(scale)
      canvas.setDimensions({ width: available.width, height: available.height })
      canvas.setViewportTransform([
        scale,
        0,
        0,
        scale,
        (available.width - size.width * scale) / 2,
        (available.height - size.height * scale) / 2,
      ])
    },

    /** Renders the visual alone, at its exact export size, without dimming or handles. */
    render(size: Size): HTMLCanvasElement {
      const view = canvas.viewportTransform
      const display = { width: canvas.width, height: canvas.height }
      exporting = true
      canvas.setDimensions({ width: size.width, height: size.height })
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
      try {
        return canvas.toCanvasElement()
      } finally {
        exporting = false
        canvas.setDimensions(display)
        canvas.setViewportTransform(view)
      }
    },

    destroy() {
      return canvas.dispose()
    },
  }
}

export type Scene = ReturnType<typeof createScene>
