<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watchEffect } from 'vue'
import { scene } from '../editor/export'
import { displayScale } from '../editor/formats'
import { createScene } from '../editor/scene'
import { useEditor } from '../stores/editor'

const editor = useEditor()

// space available on screen, tracked to recompute the display scale
const zone = ref<HTMLElement>()
const available = reactive({ width: 0, height: 0 })
const observer = new ResizeObserver(([entry]) => {
  available.width = entry.contentRect.width
  available.height = entry.contentRect.height
})
// margin around the visual, to see the handles and whatever overflows
const MARGIN = 56
const scale = computed(() =>
  displayScale(editor.size, { width: available.width - 2 * MARGIN, height: available.height - 2 * MARGIN }),
)

const canvasElement = ref<HTMLCanvasElement>()

onMounted(() => {
  observer.observe(zone.value!)
  const fabric = createScene(canvasElement.value!, editor)
  scene.value = fabric
  // the store is in charge: every state change is copied into Fabric
  watchEffect(() => fabric.resizeView(editor.size, { ...available }, scale.value))
  watchEffect(() => fabric.sync())
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  observer.disconnect()
  window.removeEventListener('keydown', onKeydown)
  scene.value?.destroy()
  scene.value = undefined
})

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

/** Arrow keys move the selected layer by one screen pixel, ten with Shift. */
function moveWithKeyboard(event: KeyboardEvent) {
  const direction = ARROWS[event.key]
  const layer = editor.selection
  // inside a field (slider, list, text) the arrow keys keep their usual role
  if (!direction || !layer || (event.target as HTMLElement).closest('input, select, textarea')) return
  event.preventDefault()
  const step = (event.shiftKey ? 10 : 1) / scale.value
  editor.update(layer.id, { x: layer.x + direction[0] * step, y: layer.y + direction[1] * step })
}

/** Delete or Backspace removes the selected layer, except while typing. */
function onKeydown(event: KeyboardEvent) {
  moveWithKeyboard(event)
  if (event.key !== 'Delete' && event.key !== 'Backspace') return
  // a slider or a checkbox keeps focus after use: only a text field blocks the key
  const typing = (event.target as HTMLElement).closest('textarea, input[type=number], input[type=text]')
  if (typing || !editor.selectionId) return
  event.preventDefault()
  editor.remove(editor.selectionId)
}
</script>

<template>
  <div class="frame">
    <div ref="zone" class="zone">
      <canvas ref="canvasElement" aria-label="Aperçu du visuel" />
    </div>
    <p class="caption">
      Export : {{ editor.size.width }} x {{ editor.size.height }} px, affiché à
      {{ Math.round(scale * 100) }} %
    </p>
  </div>
</template>

<style scoped>
.frame {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-bottom: 8px;
}

.zone {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

/* Fabric wraps the canvas in this container: taken out of the flow, it does not affect the size of the area */
.zone :deep(.canvas-container) {
  position: absolute !important;
  inset: 0;
}

.caption {
  margin: 0;
  text-align: center;
  color: var(--muted);
}
</style>
