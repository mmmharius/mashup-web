import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // relative paths: the demo works under any sub-folder (GitHub Pages)
  base: './',
  plugins: [vue()],
})
