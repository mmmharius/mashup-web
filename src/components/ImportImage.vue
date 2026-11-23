<script setup lang="ts">
import { ref } from 'vue'

/** What to do with the picked file. A rejection (unreadable image) is shown under the button. */
const props = defineProps<{ load: (file: File) => Promise<void> }>()
const error = ref('')

async function chosen(event: Event) {
  const field = event.target as HTMLInputElement
  const file = field.files?.[0]
  // reset so the same file can be picked again
  field.value = ''
  if (!file) return
  error.value = file.type.startsWith('image/') ? '' : 'Ce fichier n\'est pas une image.'
  if (error.value) return
  try {
    await props.load(file)
  } catch (cause) {
    // the type said "image" but the browser cannot decode it (damaged file, HEIC on a desktop browser)
    error.value = (cause as Error).message
  }
}
</script>

<template>
  <div>
    <label class="button import">
      <slot />
      <input type="file" accept="image/*" @change="chosen" />
    </label>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.import {
  display: block;
  text-align: center;
}

/* hidden from sight but still reachable with the keyboard */
input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.import:focus-within {
  outline: 2px solid var(--accent);
}

.error {
  margin: 6px 0 0;
  color: var(--danger);
}
</style>
