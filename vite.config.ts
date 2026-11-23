import vue from '@vitejs/plugin-vue2'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // relative paths: the demo works under any sub-folder (GitHub Pages)
  base: './',
  plugins: [vue()],
  // server tests run separately, with the Node test runner (server/package.json)
  test: { include: ['src/**/*.test.ts'] },
})
