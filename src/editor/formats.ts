export type Format = 'auto' | '9:16' | '4:3' | '16:9' | '1:1'

export interface Size {
  width: number
  height: number
}

/** Export sizes of the forced formats, in pixels. */
export const FORMATS: Record<Exclude<Format, 'auto'>, Size> = {
  '9:16': { width: 1080, height: 1920 },
  '4:3': { width: 1440, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1080, height: 1080 },
}

export const FORMAT_LIST: Format[] = ['auto', '9:16', '4:3', '16:9', '1:1']

const DEFAULT: Size = { width: 1080, height: 1080 }
// beyond this the export gets heavy and some browsers refuse the canvas
const MAX_SIDE = 4096

/** Canvas size: the main image size in auto mode, otherwise the format size. */
export function canvasSize(format: Format, image?: Size | null): Size {
  if (format !== 'auto') return FORMATS[format]
  if (!image || image.width <= 0 || image.height <= 0) return DEFAULT
  const shrink = Math.min(1, MAX_SIDE / Math.max(image.width, image.height))
  return {
    width: Math.round(image.width * shrink),
    height: Math.round(image.height * shrink),
  }
}

/** Display scale so the whole canvas fits in the area, never enlarging it. */
export function displayScale(canvas: Size, zone: Size): number {
  if (zone.width <= 0 || zone.height <= 0) return 1
  return Math.min(1, zone.width / canvas.width, zone.height / canvas.height)
}

/** Scale for an image to cover the whole canvas (like `object-fit: cover`). */
export function coverScale(image: Size, canvas: Size): number {
  return Math.max(canvas.width / image.width, canvas.height / image.height)
}
