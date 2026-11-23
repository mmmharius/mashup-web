#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { generate } from './generate.js'

const HELP = `Builds an image from an editor template.

  node cli.js <template.json> <output.png> [--image photo.jpg] [--text "New text"]

  --image file          replaces the main image of the template (added as background when it has none)
  --text "..."          replaces the first text of the template (added in the center when it has none)
  --image name=file     replaces the image of the layer called "name" (repeatable)
  --text name="..."     replaces the text of the layer called "name" (repeatable)`

/** Splits "name=value" entries from bare values. A path or a text without "=" targets the default slot. */
function split(values) {
  const named = {}
  let fallback
  for (const value of values) {
    const cut = value.indexOf('=')
    if (cut > 0) named[value.slice(0, cut)] = value.slice(cut + 1)
    else fallback = value
  }
  return { fallback, named }
}

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { image: { type: 'string', multiple: true, default: [] }, text: { type: 'string', multiple: true, default: [] } },
  })
  const [templatePath, output] = positionals
  if (!templatePath || !output) throw new Error(HELP)

  const images = split(values.image)
  const texts = split(values.text)
  const loaded = {}
  for (const [name, path] of Object.entries(images.named)) loaded[name] = await readFile(path)

  const png = await generate(JSON.parse(await readFile(templatePath, 'utf8')), {
    image: images.fallback && (await readFile(images.fallback)),
    text: texts.fallback,
    images: loaded,
    texts: texts.named,
  })
  await writeFile(output, png)
  console.log(`${output} (${png.length} bytes)`)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
