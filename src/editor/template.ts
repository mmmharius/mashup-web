import type { Layer, ImageLayer } from './layers'
import { FONTS } from './fonts'
import { canvasSize, type Format, FORMAT_LIST, type Size } from './formats'

/** Placement shared by every element, in visual pixels. x and y are the center. */
interface Placement {
  name: string
  x: number
  y: number
  rotation: number
  scale: number
}

export interface ImageElement extends Placement {
  type: 'image'
  /** `main`: the background image, the first one to replace when producing a variation of the template. */
  role: 'main' | 'layer'
  /** Original image size, before `scale`. */
  width: number
  height: number
  /** The image itself, as a data URL: the template is self-contained. */
  source: string
}

export interface TextElement extends Placement {
  type: 'text'
  text: string
  /** Font size in pixels, before `scale`. */
  size: number
  font: string
  color: string
  /** Text background color, or `null` for none. */
  background: string | null
}

export type TemplateElement = ImageElement | TextElement

/**
 * Full description of a visual: this is the file saved by the editor
 * and read back by the server (`server/generate.js`) to produce variations.
 */
export interface Template {
  version: 1
  format: Format
  width: number
  height: number
  background: string
  /** From the bottom to the top of the stack. */
  elements: TemplateElement[]
}

function element(layer: Layer, role: ImageElement['role']): TemplateElement {
  const placement = { name: layer.name, x: layer.x, y: layer.y, rotation: layer.rotation, scale: layer.scale }
  if (layer.type === 'image') {
    return { type: 'image', role, ...placement, width: layer.width, height: layer.height, source: layer.source }
  }
  return {
    type: 'text',
    ...placement,
    text: layer.text,
    size: layer.size,
    font: layer.font,
    color: layer.color,
    background: layer.backgroundEnabled ? layer.background : null,
  }
}

export function toTemplate(state: {
  format: Format
  background: string
  size: Size
  main: ImageLayer | null
  layers: Layer[]
}): Template {
  return {
    version: 1,
    format: state.format,
    ...state.size,
    background: state.background,
    elements: [
      ...(state.main ? [element(state.main, 'main')] : []),
      ...state.layers.map((layer) => element(layer, 'layer')),
    ],
  }
}

const COLOR = /^#[0-9a-f]{6}$/i

/**
 * Reads a template file. The file comes from outside: everything is checked,
 * and an error says what is wrong rather than loading a half-valid state.
 */
export function parseTemplate(text: string): Template {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Ce fichier n\'est pas du JSON valide.')
  }
  const fail = (reason: string): never => {
    throw new Error(`Template invalide : ${reason}.`)
  }
  const object = (value: unknown, what: string) =>
    (typeof value === 'object' && value !== null ? value : fail(`${what} manquant`)) as Record<string, unknown>
  const num = (value: unknown, what: string) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fail(`${what} doit être un nombre`)
  const positive = (value: unknown, what: string) => (num(value, what) > 0 ? (value as number) : fail(`${what} doit être positif`))
  const str = (value: unknown, what: string) => (typeof value === 'string' ? value : fail(`${what} doit être un texte`))
  const color = (value: unknown, what: string) =>
    COLOR.test(str(value, what)) ? (value as string) : fail(`${what} doit être une couleur #rrggbb`)

  const t = object(raw, 'contenu')
  if (t.version !== 1) fail('version inconnue')
  if (!FORMAT_LIST.includes(t.format as Format)) fail('format inconnu')
  if (!Array.isArray(t.elements)) fail('liste des éléments manquante')

  const elements = (t.elements as unknown[]).map((value, index): TemplateElement => {
    const e = object(value, `élément ${index + 1}`)
    const what = (field: string) => `${field} de l'élément ${index + 1}`
    const placement = {
      name: str(e.name, what('name')),
      x: num(e.x, what('x')),
      y: num(e.y, what('y')),
      rotation: num(e.rotation, what('rotation')),
      scale: positive(e.scale, what('scale')),
    }
    if (e.type === 'image') {
      const source = str(e.source, what('source'))
      // embedded images only: a template must not make the browser load a remote address
      if (!source.startsWith('data:image/')) fail(`${what('source')} doit être une image embarquée`)
      return {
        type: 'image',
        role: e.role === 'main' ? 'main' : 'layer',
        ...placement,
        width: positive(e.width, what('width')),
        height: positive(e.height, what('height')),
        source,
      }
    }
    if (e.type !== 'text') fail(`type inconnu pour l'élément ${index + 1}`)
    return {
      type: 'text',
      ...placement,
      text: str(e.text, what('text')),
      size: positive(e.size, what('size')),
      font: FONTS.includes(e.font as string) ? (e.font as string) : fail(`${what('font')} doit être une des polices de l'éditeur`),
      color: color(e.color, what('color')),
      background: e.background === null ? null : color(e.background, what('background')),
    }
  })
  const mains = elements.filter((e): e is ImageElement => e.type === 'image' && e.role === 'main')
  if (mains.length > 1) fail('plusieurs images principales')
  // the editor computes the size from the format, the server reads width and height: both must agree
  const size = canvasSize(t.format as Format, mains[0])
  if (t.width !== size.width || t.height !== size.height) fail(`width et height doivent valoir ${size.width} x ${size.height} pour ce format`)

  return {
    version: 1,
    format: t.format as Format,
    ...size,
    background: color(t.background, 'background'),
    elements,
  }
}
