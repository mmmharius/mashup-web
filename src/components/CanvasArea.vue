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
const scale = computed(() => displayScale(editor.size, available))

const canvasElement = ref<HTMLCanvasElement>()

onMounted(() => {
  observer.observe(zone.value!)
  const fabric = createScene(canvasElement.value!, editor)
  scene.value = fabric
  // the store is in charge: every state change is copied into Fabric
  watchEffect(() => fabric.resizeView(editor.size, scale.value))
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
  const typing = (event.target as HTMLElement).closest('textarea')
  if (typing || !editor.selectionId) return
  event.preventDefault()
  editor.remove(editor.selectionId)
}

/** A click around the canvas, in the grey area, deselects the layer. */
function clickAround(event: MouseEvent) {
  if (!(event.target as HTMLElement).closest('.canvas-container')) editor.select(null)
}
</script>

<template>
  <div class="frame" @mousedown="clickAround">
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
  padding: 24px 24px 8px;
}

.zone {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Fabric wraps the canvas in this container */
.zone :deep(.canvas-container) {
  box-shadow: 0 4px 24px rgb(0 0 0 / 0.15);
}

.caption {
  margin: 8px 0 0;
  text-align: center;
  color: var(--muted);
}
</style>
