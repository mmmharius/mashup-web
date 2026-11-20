<script setup lang="ts">
import { computed, ref } from 'vue'
import { exportVisual, type ExportMode, canShareFiles } from '../editor/export'
import { useEditor } from '../stores/editor'

const editor = useEditor()
const empty = computed(() => !editor.main && !editor.layers.length)
const busy = ref(false)
const error = ref('')

async function run(mode: ExportMode) {
  busy.value = true
  error.value = ''
  try {
    await exportVisual(mode)
  } catch (cause) {
    // closing the share sheet is not an error
    if ((cause as Error).name !== 'AbortError') error.value = 'L\'export a échoué.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="export">
    <span v-if="error" class="error" role="alert">{{ error }}</span>
    <button v-if="canShareFiles()" :disabled="empty || busy" @click="run('share')">Partager</button>
    <button class="primary" :disabled="empty || busy" @click="run('download')">
      Télécharger le PNG
    </button>
  </div>
</template>

<style scoped>
.export {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.error {
  color: var(--danger);
}
</style>
