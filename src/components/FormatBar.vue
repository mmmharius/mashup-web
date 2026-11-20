<script setup lang="ts">
import { FORMAT_LIST } from '../editor/formats'
import { useEditor } from '../stores/editor'

const editor = useEditor()
</script>

<template>
  <div class="formats" role="group" aria-label="Format du canvas">
    <button
      v-for="format in FORMAT_LIST"
      :key="format"
      :class="{ active: editor.format === format }"
      :aria-pressed="editor.format === format"
      @click="editor.selectFormat(format)"
    >
      {{ format === 'auto' ? 'Auto' : format }}
    </button>
  </div>
</template>

<style scoped>
.formats {
  display: flex;
  gap: 6px;
}
</style>
