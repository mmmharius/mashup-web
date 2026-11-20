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
  width: number
  height: number
}

export type Layer = ImageLayer

export const MAIN_ID = 'main'

export function newId(): string {
  return crypto.randomUUID()
}

/** Loads an image file picked by the user. Rejects if it is not a readable image. */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(markRaw(element))
    element.onerror = () => reject(new Error(`Image illisible : ${file.name}`))
    element.src = URL.createObjectURL(file)
  })
}
