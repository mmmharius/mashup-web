<script setup lang="ts">
import FormatBar from './components/FormatBar.vue'
import ExportButtons from './components/ExportButtons.vue'
import HistoryButtons from './components/HistoryButtons.vue'
import TemplateButtons from './components/TemplateButtons.vue'
import ImportImage from './components/ImportImage.vue'
import EventsPanel from './components/EventsPanel.vue'
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
      <HistoryButtons />
      <ExportButtons />
    </header>
    <aside class="column left">
      <section>
        <h2>Template</h2>
        <TemplateButtons />
      </section>
      <section>
        <h2>Image principale</h2>
        <ImportImage :load="editor.importMain">
          {{ editor.main ? 'Remplacer l\'image' : 'Importer une image' }}
        </ImportImage>
      </section>
      <section>
        <h2>Ajouter</h2>
        <ImportImage :load="editor.addImage">Image par-dessus</ImportImage>
        <button class="add-text" @click="editor.addText()">Texte</button>
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
      <div class="settings"><SettingsPanel /></div>
      <EventsPanel />
    </aside>
  </div>
</template>

<style scoped>
.right {
  display: flex;
  flex-direction: column;
}

.settings {
  flex: 1;
  margin-bottom: 16px;
}

.add-text {
  width: 100%;
  margin-top: 6px;
}
</style>
