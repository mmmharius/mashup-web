<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useEditor } from '../stores/editor'

const editor = useEditor()

/** Ctrl+Z undoes, Ctrl+Shift+Z or Ctrl+Y redoes. Inside a text area the browser keeps its own undo. */
function onKeydown(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey)) return
  if ((event.target as HTMLElement).closest('textarea')) return
  const key = event.key.toLowerCase()
  if (key !== 'z' && key !== 'y') return
  event.preventDefault()
  if (key === 'y' || event.shiftKey) editor.redo()
  else editor.undo()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="history" role="group" aria-label="Historique">
    <button :disabled="!editor.past.length" title="Annuler (Ctrl+Z)" @click="editor.undo()">↶ Annuler</button>
    <button :disabled="!editor.future.length" title="Rétablir (Ctrl+Maj+Z)" @click="editor.redo()">
      ↷ Rétablir
    </button>
  </div>
</template>

<style scoped>
.history {
  display: flex;
  gap: 6px;
}
</style>
