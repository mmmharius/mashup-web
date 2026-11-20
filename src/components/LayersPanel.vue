<script setup lang="ts">
import { computed } from 'vue'
import { layerName } from '../editor/layers'
import { useEditor } from '../stores/editor'

const editor = useEditor()

// shown like the stack: top layer first
const stack = computed(() => [...editor.layers].reverse())
</script>

<template>
  <p v-if="!stack.length && !editor.main" class="empty">Aucun calque pour l'instant.</p>
  <ul v-else>
    <li v-for="layer in stack" :key="layer.id" :class="{ active: layer.id === editor.selectionId }">
      <button class="name" @click="editor.select(layer.id)">{{ layerName(layer) }}</button>
      <button title="Monter" aria-label="Monter" @click="editor.reorder(layer.id, 1)">↑</button>
      <button title="Descendre" aria-label="Descendre" @click="editor.reorder(layer.id, -1)">↓</button>
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

.empty {
  color: var(--muted);
}
</style>
