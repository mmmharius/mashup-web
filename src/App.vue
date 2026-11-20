<script setup lang="ts">
import FormatBar from './components/FormatBar.vue'
import CanvasArea from './components/CanvasArea.vue'
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>Éditeur de template</h1>
      <FormatBar />
    </header>
    <aside class="column left"></aside>
    <main class="scene">
      <CanvasArea />
    </main>
    <aside class="column right"></aside>
  </div>
</template>
