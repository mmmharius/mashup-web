<script setup lang="ts">
import { MAIN_ID } from '../editor/layers'
import { FONTS } from '../editor/fonts'
import { useEditor } from '../stores/editor'

const editor = useEditor()

function value(event: Event): string {
  return (event.target as HTMLInputElement).value
}
</script>

<template>
  <p v-if="!editor.selection" class="empty">Sélectionnez un élément sur le canvas pour le régler.</p>

  <template v-else>
    <section v-if="editor.selection.type === 'text'">
      <h2>Texte</h2>
      <label class="field">
        Contenu
        <textarea
          rows="3"
          :value="editor.selection.text"
          @input="editor.updateText(editor.selection.id, { text: value($event) })"
        />
      </label>
      <label class="field">
        Police
        <select
          :value="editor.selection.font"
          :style="{ fontFamily: editor.selection.font }"
          @change="editor.updateText(editor.selection.id, { font: value($event) })"
        >
          <option v-for="font in FONTS" :key="font" :style="{ fontFamily: font }">{{ font }}</option>
        </select>
      </label>
      <label class="field">
        Taille : {{ editor.selection.size }} px
        <input
          type="range"
          min="12"
          max="400"
          :value="editor.selection.size"
          @input="editor.updateText(editor.selection.id, { size: Number(value($event)) })"
        />
      </label>
      <div class="colors">
        <label>
          Couleur du texte
          <input
            type="color"
            :value="editor.selection.color"
            @input="editor.updateText(editor.selection.id, { color: value($event) })"
          />
        </label>
        <label>
          Couleur de fond
          <input
            type="color"
            :value="editor.selection.background"
            :disabled="!editor.selection.backgroundEnabled"
            @input="editor.updateText(editor.selection.id, { background: value($event) })"
          />
        </label>
      </div>
      <label class="checkbox">
        <input
          type="checkbox"
          :checked="editor.selection.backgroundEnabled"
          @change="
            editor.updateText(editor.selection.id, {
              backgroundEnabled: ($event.target as HTMLInputElement).checked,
            })
          "
        />
        Afficher le fond
      </label>
    </section>

    <section>
      <h2>Position</h2>
      <label class="field">
        Zoom : {{ Math.round(editor.selection.scale * 100) }} %
        <input
          type="range"
          min="5"
          max="400"
          :value="editor.selection.scale * 100"
          @input="editor.update(editor.selection.id, { scale: Number(value($event)) / 100 })"
        />
      </label>
      <label class="field">
        Rotation : {{ Math.round(editor.selection.rotation) }}°
        <input
          type="range"
          min="-180"
          max="180"
          :value="editor.selection.rotation"
          @input="editor.update(editor.selection.id, { rotation: Number(value($event)) })"
        />
      </label>
      <button v-if="editor.selection.id === MAIN_ID" @click="editor.recenterMain()">
        Recadrer sur le canvas
      </button>
    </section>
  </template>
</template>

<style scoped>
.empty,
.colors label,
.checkbox {
  color: var(--muted);
}

.colors {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.colors input {
  display: block;
  width: 100%;
  height: 32px;
  margin-top: 4px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: none;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
