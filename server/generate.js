import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

/**
 * Replays a template saved by the editor (see `src/editor/template.ts`) to build
 * a new image, without a browser: another image and another text are dropped in.
 */

/** Fonts offered by the editor, bundled here so the output is the same on any server. */
const FONTS = {
  Inter: 'Inter.ttf',
  Montserrat: 'Montserrat.ttf',
  'Playfair Display': 'PlayfairDisplay.ttf',
  'Bebas Neue': 'BebasNeue.ttf',
  Pacifico: 'Pacifico.ttf',
  'Roboto Mono': 'RobotoMono.ttf',
}

// same proportions as the text background of the editor (src/editor/scene.ts)
const BACKGROUND_PADDING = 0.35
const BACKGROUND_RADIUS = 0.2
// safeguard: a damaged or malicious template must not make us allocate a giant image
const MAX_SIDE = 8192
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

function fail(reason) {
  throw new Error(`Invalid template: ${reason}.`)
}

function requireThat(condition, reason) {
  if (!condition) fail(reason)
}

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)
const isColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)

/** The image embedded in the template, as bytes. */
function bytes(source) {
  const parts = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/i.exec(source ?? '')
  requireThat(parts, 'an image is not a base64 data URL')
  return Buffer.from(parts[1], 'base64')
}

/** An image of the template, or the one replacing it, at the size of its slot. */
function renderImage(element, replacement) {
  const width = Math.max(1, Math.round(element.width * element.scale))
  const height = Math.max(1, Math.round(element.height * element.scale))
  requireThat(width <= MAX_SIDE && height <= MAX_SIDE, `image "${element.name}" is too large`)
  return (
    sharp(replacement ?? bytes(element.source))
      // a phone photo is often stored sideways, with its orientation noted aside: straighten it
      .rotate()
      // a replacement image does not have the same proportions: it fills the slot, cropped around the center
      .resize(width, height, { fit: replacement ? 'cover' : 'fill' })
      .ensureAlpha()
      .png()
      .toBuffer()
  )
}

const escapeMarkup = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

// Fabric text layout, reproduced here so the block has the same size as in the editor:
// a line takes 1.13 times the font size, and line spacing is 1.16 times that height
const LINE_HEIGHT = 1.13
const LINE_SPACING = 1.16

/** A text of the template, with its rounded background when it has one. */
async function renderText(element, text) {
  const file = FONTS[element.font]
  requireThat(file, `unknown font "${element.font}" (known: ${Object.keys(FONTS).join(', ')})`)
  const size = element.size * element.scale
  requireThat(size > 0 && size <= 2000, `size of text "${element.name}" out of range`)

  // each line is drawn on its own then placed by hand: line spacing no longer depends on the font
  const lines = await Promise.all(
    text.split('\n').map((line) =>
      line.trim() === ''
        ? null
        : sharp({
            text: {
              text: `<span foreground="${element.color}">${escapeMarkup(line)}</span>`,
              font: `${element.font} ${size}`,
              fontfile: fileURLToPath(new URL(`./fonts/${file}`, import.meta.url)),
              // 72 points per inch: the font size then reads in pixels
              dpi: 72,
              rgba: true,
            },
          })
            .png()
            .toBuffer({ resolveWithObject: true }),
    ),
  )

  const padding = Math.round(size * BACKGROUND_PADDING)
  const step = size * LINE_HEIGHT * LINE_SPACING
  const textWidth = Math.max(1, ...lines.map((line) => line?.info.width ?? 0))
  const textHeight = Math.round((lines.length - 1) * step + size * LINE_HEIGHT)
  // descenders of a script font stick out of their line: keep some room around the block
  const overflow = Math.ceil(size)
  const width = textWidth + 2 * padding
  const height = textHeight + 2 * padding + 2 * overflow
  requireThat(width <= MAX_SIDE && height <= MAX_SIDE, `text "${element.name}" is too large`)

  const background = element.background
    ? `<rect y="${overflow}" width="${width}" height="${textHeight + 2 * padding}" rx="${size * BACKGROUND_RADIUS}" fill="${element.background}"/>`
    : ''
  const placed = lines.flatMap((line, index) =>
    line
      ? [{
          input: line.data,
          left: Math.round((width - line.info.width) / 2),
          // centered in the height of its line
          top: Math.max(0, Math.round(overflow + padding + index * step + (size * LINE_HEIGHT - line.info.height) / 2)),
        }]
      : [],
  )
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${background}</svg>`))
    .composite(placed)
    .png()
    .toBuffer()
}

/** Rotates a piece and places it, centered on (x, y), keeping only what falls inside the visual. */
async function place(piece, element, visual) {
  const rotated = await sharp(piece).rotate(element.rotation, { background: TRANSPARENT }).png().toBuffer({ resolveWithObject: true })
  const left = Math.round(element.x - rotated.info.width / 2)
  const top = Math.round(element.y - rotated.info.height / 2)
  // sharp refuses a piece that extends beyond the base: cut out the visible part
  const x0 = Math.max(0, left)
  const y0 = Math.max(0, top)
  const x1 = Math.min(visual.width, left + rotated.info.width)
  const y1 = Math.min(visual.height, top + rotated.info.height)
  if (x1 <= x0 || y1 <= y0) return null
  const visible = await sharp(rotated.data)
    .extract({ left: x0 - left, top: y0 - top, width: x1 - x0, height: y1 - y0 })
    .toBuffer()
  return { input: visible, left: x0, top: y0 }
}

function check(template) {
  requireThat(template && template.version === 1, 'unknown version')
  requireThat(Number.isInteger(template.width) && Number.isInteger(template.height), 'missing visual size')
  requireThat(template.width > 0 && template.height > 0, 'empty visual size')
  requireThat(template.width <= MAX_SIDE && template.height <= MAX_SIDE, 'visual too large')
  requireThat(isColor(template.background), 'missing background color')
  requireThat(Array.isArray(template.elements), 'missing element list')
  template.elements.forEach((element, index) => {
    const where = `element ${index + 1}`
    requireThat(element && (element.type === 'image' || element.type === 'text'), `${where}: unknown type`)
    for (const field of ['x', 'y', 'rotation', 'scale']) requireThat(isNumber(element[field]), `${where}: missing ${field}`)
    requireThat(element.scale > 0, `${where}: empty scale`)
    requireThat(typeof element.name === 'string', `${where}: missing name`)
    if (element.type === 'image') {
      requireThat(isNumber(element.width) && isNumber(element.height), `${where}: missing image size`)
    } else {
      requireThat(typeof element.text === 'string' && isNumber(element.size), `${where}: missing text or size`)
      requireThat(isColor(element.color) && (element.background === null || isColor(element.background)), `${where}: invalid color`)
    }
  })
}

/**
 * Builds the visual of a template, as a PNG.
 *
 * @param {object} template the JSON saved by the editor
 * @param {object} [content] what gets dropped into the template
 * @param {Buffer} [content.image] replaces the main image (added as background when the template has none)
 * @param {string} [content.text] replaces the first text of the template
 * @param {Record<string, Buffer>} [content.images] replaces images picked by their layer name
 * @param {Record<string, string>} [content.texts] replaces texts picked by their layer name
 * @returns {Promise<Buffer>}
 */
export async function generate(template, { image, text, images = {}, texts = {} } = {}) {
  check(template)
  const visual = { width: template.width, height: template.height }
  let elements = template.elements

  if (image && !elements.some((e) => e.type === 'image' && e.role === 'main')) {
    // no main image to replace: the new image becomes the background, over the whole visual
    const full = { type: 'image', role: 'main', name: 'image', rotation: 0, scale: 1 }
    elements = [{ ...full, ...visual, x: visual.width / 2, y: visual.height / 2 }, ...elements]
  }
  const firstText = elements.find((e) => e.type === 'text')
  requireThat(text === undefined || firstText, 'no text to replace')
  for (const [kind, names] of [['image', images], ['text', texts]]) {
    for (const name of Object.keys(names)) {
      requireThat(elements.some((e) => e.type === kind && e.name === name), `no ${kind} layer called "${name}"`)
    }
  }

  const pieces = []
  for (const element of elements) {
    const piece =
      element.type === 'image'
        ? await renderImage(element, images[element.name] ?? (element.role === 'main' ? image : undefined))
        : await renderText(element, texts[element.name] ?? (element === firstText && text !== undefined ? text : element.text))
    const placed = await place(piece, element, visual)
    if (placed) pieces.push(placed)
  }

  return sharp({ create: { width: visual.width, height: visual.height, channels: 4, background: template.background } })
    .composite(pieces)
    .png()
    .toBuffer()
}
