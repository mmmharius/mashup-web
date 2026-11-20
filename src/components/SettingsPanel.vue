<script setup lang="ts">
import { MAIN_ID } from '../editor/layers'
import { useEditor } from '../stores/editor'

const editor = useEditor()

function num(event: Event): number {
  return Number((event.target as HTMLInputElement).value)
}
</script>

<template>
  <p v-if="!editor.selection" class="empty">Sélectionnez un élément sur le canvas pour le régler.</p>

  <section v-else>
    <h2>Position</h2>
    <label class="field">
      Zoom : {{ Math.round(editor.selection.scale * 100) }} %
      <input
        type="range"
        min="5"
        max="400"
        :value="editor.selection.scale * 100"
        @input="editor.update(editor.selection.id, { scale: num($event) / 100 })"
      />
    </label>
    <label class="field">
      Rotation : {{ Math.round(editor.selection.rotation) }}°
      <input
        type="range"
        min="-180"
        max="180"
        :value="editor.selection.rotation"
        @input="editor.update(editor.selection.id, { rotation: num($event) })"
      />
    </label>
    <button v-if="editor.selection.id === MAIN_ID" @click="editor.recenterMain()">
      Recadrer sur le canvas
    </button>
  </section>
</template>

<style scoped>
.empty {
  color: var(--muted);
}
</style>
