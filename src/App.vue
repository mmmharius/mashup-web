<script setup lang="ts">
import FormatBar from './components/FormatBar.vue'
import ImportImage from './components/ImportImage.vue'
import LayersPanel from './components/LayersPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import CanvasArea from './components/CanvasArea.vue'
import { useEditor } from './stores/editor'

const editor = useEditor()
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>Éditeur de template</h1>
      <FormatBar />
    </header>
    <aside class="column left">
      <section>
        <h2>Image principale</h2>
        <ImportImage @file="editor.importMain">
          {{ editor.main ? 'Remplacer l\'image' : 'Importer une image' }}
        </ImportImage>
      </section>
      <section>
        <h2>Ajouter</h2>
        <ImportImage @file="editor.addImage">Image par-dessus</ImportImage>
      </section>
      <section>
        <h2>Calques</h2>
        <LayersPanel />
      </section>
    </aside>
    <main class="scene">
      <CanvasArea />
    </main>
    <aside class="column right">
      <SettingsPanel />
    </aside>
  </div>
</template>
