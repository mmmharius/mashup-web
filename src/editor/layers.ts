import { markRaw } from 'vue'

/** Position shared by every layer, in export pixels. x and y are the center. */
interface Base {
  id: string
  x: number
  y: number
  rotation: number
  scale: number
}

export interface ImageLayer extends Base {
  type: 'image'
  name: string
  element: HTMLImageElement
  /** The original file as a data URL: this is what gets written into the template. */
  source: string
  width: number
  height: number
}

export interface TextLayer extends Base {
  type: 'text'
  /** Name given by hand. Empty: the list shows the start of the text. */
  name: string
  text: string
  /** Font size, in export pixels. */
  size: number
  font: string
  color: string
  background: string
  backgroundEnabled: boolean
}

export type Layer = ImageLayer | TextLayer

/** Name shown in the layer list. */
export function layerName(layer: Layer): string {
  return layer.name || (layer.type === 'text' && layer.text.split('\n')[0]) || 'Sans nom'
}

/** How many images (main image included) and texts a visual holds: sent with the tracking events. */
export function countLayers(main: ImageLayer | null, layers: Layer[]): { image_count: number; text_count: number } {
  const texts = layers.filter((layer) => layer.type === 'text').length
  return { image_count: layers.length - texts + (main ? 1 : 0), text_count: texts }
}

export const MAIN_ID = 'main'

export function newId(): string {
  return crypto.randomUUID()
}

/** Reads an image file picked by the user, as a data URL. */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(`Fichier illisible : ${file.name}`))
    reader.readAsDataURL(file)
  })
}

/** Loads an image from its data URL. Rejects if it is not a readable image. */
export function loadImage(source: string, name: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(markRaw(element))
    element.onerror = () => reject(new Error(`Image illisible : ${name}`))
    element.src = source
  })
}
