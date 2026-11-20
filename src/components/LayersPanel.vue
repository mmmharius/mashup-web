<script setup lang="ts">
import { computed } from 'vue'
import { layerName } from '../editor/layers'
import { useEditor } from '../stores/editor'

const editor = useEditor()

// shown like the stack: top layer first
const stack = computed(() => [...editor.layers].reverse())
</script>

<template>
  <ul>
    <li v-for="(layer, index) in stack" :key="layer.id" :class="{ active: layer.id === editor.selectionId }">
      <button class="name" @click="editor.select(layer.id)">{{ layerName(layer) }}</button>
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
