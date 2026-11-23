import { shallowRef } from 'vue'
import { useEditor } from '../stores/editor'
import { countLayers } from './layers'
import { track } from '../tracking'
import type { Scene } from './scene'

/** The Fabric scene on screen, set by CanvasArea. */
export const scene = shallowRef<Scene>()

export type ExportMode = 'download' | 'share'

/** True when the browser can share an image file (mostly on phones). */
export function canShareFiles(): boolean {
  const probe = new File([], 'visual.png', { type: 'image/png' })
  return !!navigator.canShare?.({ files: [probe] })
}

/** Renders the visual as a PNG at its real export size. */
function render(): Promise<Blob> {
  if (!scene.value) throw new Error('Canvas indisponible')
  const rendered = scene.value.render(useEditor().size)
  return new Promise((resolve, reject) =>
    rendered.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Export impossible'))), 'image/png'),
  )
}

async function send(mode: ExportMode): Promise<void> {
  const file = new File([await render()], 'visual.png', { type: 'image/png' })
  if (mode === 'share') {
    await navigator.share({ files: [file] })
    return
  }
  const link = document.createElement('a')
  link.href = URL.createObjectURL(file)
  link.download = file.name
  link.click()
  URL.revokeObjectURL(link.href)
}

/** Downloads or shares the visual. A dismissed share sheet throws an `AbortError`, which is not tracked. */
export async function exportVisual(mode: ExportMode): Promise<void> {
  const editor = useEditor()
  try {
    await send(mode)
  } catch (cause) {
    if ((cause as Error).name !== 'AbortError') track('export_failed', { mode })
    throw cause
  }
  track('export_succeeded', {
    mode,
    format: editor.format,
    ...editor.size,
    ...countLayers(editor.main, editor.layers),
    seconds_since_arrival: Math.round(performance.now() / 1000),
  })
}
