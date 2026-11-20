<script setup lang="ts">
import { computed, ref } from 'vue'
import { layerName } from '../editor/layers'
import { useEditor } from '../stores/editor'

const editor = useEditor()

// shown like the stack: top layer first
const stack = computed(() => [...editor.layers].reverse())

/** Layer whose name is being typed, after a double click. */
const renaming = ref<string | null>(null)

function confirmRename(event: Event) {
  // Escape already closed the field: the blur that follows must not save anything
  if (!renaming.value) return
  editor.rename(renaming.value, (event.target as HTMLInputElement).value)
  renaming.value = null
}

const vFocus = { mounted: (field: HTMLInputElement) => field.select() }
</script>

<template>
  <ul>
    <li v-for="(layer, index) in stack" :key="layer.id" :class="{ active: layer.id === editor.selectionId }">
      <input
        v-if="renaming === layer.id"
        v-focus
        class="name"
        type="text"
        maxlength="40"
        aria-label="Nom du calque"
        :value="layerName(layer)"
        @keydown.enter="confirmRename"
        @keydown.esc="renaming = null"
        @blur="confirmRename"
      />
      <button
        v-else
        class="name"
        title="Double clic pour renommer"
        @click="editor.select(layer.id)"
        @dblclick="renaming = layer.id"
      >
        {{ layerName(layer) }}
      </button>
      <button title="Monter" aria-label="Monter" :disabled="index === 0" @click="editor.reorder(layer.id, 1)">
        ↑
      </button>
      <button
        title="Descendre"
        aria-label="Descendre"
        :disabled="index === stack.length - 1"
        @click="editor.reorder(layer.id, -1)"
      >
        ↓
      </button>
      <button title="Supprimer" aria-label="Supprimer" @click="editor.remove(layer.id)">✕</button>
    </li>
    <li v-if="editor.main" :class="{ active: editor.main.id === editor.selectionId }">
      <button class="name" @click="editor.select(editor.main.id)">
        Image principale
      </button>
      <button title="Supprimer" aria-label="Supprimer" @click="editor.remove(editor.main.id)">
        ✕
      </button>
    </li>
    <li class="background">
      <label>
        Fond
        <input
          type="color"
          :value="editor.background"
          aria-label="Couleur du fond"
          @input="editor.setBackground(($event.target as HTMLInputElement).value)"
        />
      </label>
    </li>
  </ul>
</template>

<style scoped>
ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

li {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
  border-radius: var(--radius);
}

li.active {
  background: var(--accent-light);
}

li input.name {
  padding: 4px 7px;
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  font: inherit;
}

li button {
  padding: 5px 8px;
  border-color: transparent;
  background: none;
}

.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.background label {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
}

.background input {
  width: 36px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: none;
}
</style>
