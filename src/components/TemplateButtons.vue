<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditor } from '../stores/editor'

const editor = useEditor()
const empty = computed(() => !editor.main && !editor.layers.length)
const error = ref('')

function save() {
  const file = new Blob([JSON.stringify(editor.exportTemplate(), null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(file)
  link.download = 'template.json'
  link.click()
  URL.revokeObjectURL(link.href)
}

async function openFile(event: Event) {
  const field = event.target as HTMLInputElement
  const file = field.files?.[0]
  // reset so the same file can be opened again
  field.value = ''
  if (!file) return
  error.value = ''
  try {
    await editor.openTemplate(file)
  } catch (cause) {
    error.value = (cause as Error).message
  }
}
</script>

<template>
  <div>
    <div class="buttons">
      <label class="button">
        Ouvrir
        <input type="file" accept=".json,application/json" @change="openFile" />
      </label>
      <button :disabled="empty" @click="save">Enregistrer</button>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.buttons {
  display: flex;
  gap: 6px;
}

.buttons > * {
  flex: 1;
  text-align: center;
}

/* hidden from sight but still reachable with the keyboard */
input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.button:focus-within {
  outline: 2px solid var(--accent);
}

.error {
  margin: 6px 0 0;
  color: var(--danger);
}
</style>
