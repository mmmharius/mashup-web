import assert from 'node:assert/strict'
import { test } from 'node:test'
import sharp from 'sharp'
import { generate } from './generate.js'

const plain = (width, height, color) =>
  sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer()
const toDataUrl = (bytes) => `data:image/png;base64,${bytes.toString('base64')}`

/** Color of one pixel of the produced visual, as #rrggbb. */
async function pixel(png, x, y) {
  const { data } = await sharp(png).extract({ left: x, top: y, width: 1, height: 1 }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return `#${data.toString('hex')}`
}

/** A 400 x 600 visual: cream background, red main image on the top half, blue logo, a text on a black background. */
async function template() {
  const element = { x: 200, rotation: 0, scale: 1 }
  return {
    version: 1,
    format: '1:1',
    width: 400,
    height: 600,
    background: '#ffeecc',
    elements: [
      { type: 'image', role: 'main', name: 'photo', ...element, y: 150, width: 400, height: 300, source: toDataUrl(await plain(400, 300, '#ff0000')) },
      { type: 'image', role: 'layer', name: 'logo', ...element, x: 50, y: 50, width: 20, height: 20, scale: 2, source: toDataUrl(await plain(20, 20, '#0000ff')) },
      { type: 'text', name: 'title', ...element, y: 450, text: 'Hello', size: 40, font: 'Inter', color: '#ffffff', background: '#000000' },
    ],
  }
}

test('the template alone gives back the editor visual', async () => {
  const png = await generate(await template())
  const { width, height } = await sharp(png).metadata()

  assert.deepEqual([width, height], [400, 600])
  assert.equal(await pixel(png, 300, 150), '#ff0000') // main image
  assert.equal(await pixel(png, 50, 50), '#0000ff') // logo, enlarged twice around its center
  assert.equal(await pixel(png, 80, 80), '#ff0000') // just past the logo
  assert.equal(await pixel(png, 10, 590), '#ffeecc') // background
  assert.equal(await pixel(png, 145, 420), '#000000') // text background, inside its padding
})

test('a new image fills the main image slot, a new text replaces the first one', async () => {
  const model = await template()
  const before = await generate(model)
  // tall green image: it must cover the slot in width, without spilling below
  const after = await generate(model, { image: await plain(100, 500, '#00ff00'), text: 'Sale' })

  assert.equal(await pixel(after, 5, 150), '#00ff00')
  assert.equal(await pixel(after, 395, 295), '#00ff00')
  assert.equal(await pixel(after, 200, 320), '#ffeecc')
  assert.equal(await pixel(after, 50, 50), '#0000ff') // the logo does not change
  assert.notDeepEqual(await sharp(after).extract({ left: 0, top: 400, width: 400, height: 100 }).raw().toBuffer(),
    await sharp(before).extract({ left: 0, top: 400, width: 400, height: 100 }).raw().toBuffer()) // the text changed
})

test('a layer is replaced by its name', async () => {
  const png = await generate(await template(), { images: { logo: await plain(10, 10, '#00ff00') }, texts: { title: 'Promo' } })
  assert.equal(await pixel(png, 50, 50), '#00ff00')
  assert.equal(await pixel(png, 300, 150), '#ff0000')
})

test('a rotated layer or one overflowing the visual is placed without error', async () => {
  const model = await template()
  model.elements[1] = { ...model.elements[1], x: 0, y: 0, rotation: 45, scale: 10 }
  const png = await generate(model)
  assert.equal(await pixel(png, 2, 2), '#0000ff')
})

test('without a main image, the new image becomes the visual background', async () => {
  const model = await template()
  model.elements.shift()
  const png = await generate(model, { image: await plain(50, 50, '#00ff00') })
  assert.equal(await pixel(png, 390, 590), '#00ff00')
  assert.equal(await pixel(png, 50, 50), '#0000ff')
})

test('without a text, the new text is added in the center', async () => {
  const model = await template()
  model.elements.pop()
  const png = await generate(model, { text: 'Sale' })
  // 400 wide: a 27 px text on its dark background, around (200, 300); the main image stops at y = 300
  assert.equal(await pixel(png, 200, 281), '#1c2030') // inside the top padding of the text background
  assert.equal(await pixel(png, 200, 340), '#ffeecc') // below it, the visual background
  assert.equal(await pixel(png, 300, 150), '#ff0000') // the rest does not change
})

test('an impossible request is rejected with the reason', async () => {
  const model = await template()
  await assert.rejects(generate({ ...model, version: 2 }), /unknown version/)
  await assert.rejects(generate({ ...model, width: 100000 }), /too large/)
  await assert.rejects(generate(model, { texts: { unknown: 'x' } }), /no text layer called "unknown"/)
  await assert.rejects(generate({ ...model, elements: [{ ...model.elements[2], font: 'Comic Sans' }] }), /unknown font "Comic Sans"/)
  await assert.rejects(generate({ ...model, elements: [{ ...model.elements[0], source: 'https://example.com/a.png' }] }), /data URL/)
})

test('a text with markup characters is drawn as is', async () => {
  await generate(await template(), { text: 'Price < 10 € & delivery > 2 days\n\nline 2' })
})
