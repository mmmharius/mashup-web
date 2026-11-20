<script setup lang="ts">
import { MAIN_ID } from '../editor/layers'
import { FONTS } from '../editor/fonts'
import { useEditor } from '../stores/editor'

const editor = useEditor()

function value(event: Event): string {
  return (event.target as HTMLInputElement).value
}

/** Hand-typed value, clamped to its limits. */
function clamp(typed: string, min: number, max: number): number {
  const num = Number(typed)
  return Math.min(max, Math.max(min, Number.isFinite(num) ? num : min))
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
      <div class="setting">
        <span>Zoom</span>
        <span>
          <input
            type="number"
            min="1"
            max="1000"
            aria-label="Zoom en pourcentage"
            :value="Math.round(editor.selection.scale * 100)"
            @change="editor.update(editor.selection.id, { scale: clamp(value($event), 1, 1000) / 100 })"
          />
          %
        </span>
        <input
          type="range"
          min="5"
          max="400"
          aria-label="Zoom"
          :value="editor.selection.scale * 100"
          @input="editor.update(editor.selection.id, { scale: Number(value($event)) / 100 })"
        />
      </div>
      <div class="setting">
        <span>Rotation</span>
        <span>
          <input
            type="number"
            min="-180"
            max="180"
            aria-label="Rotation en degrés"
            :value="Math.round(editor.selection.rotation)"
            @change="editor.update(editor.selection.id, { rotation: clamp(value($event), -180, 180) })"
          />
          °
        </span>
        <input
          type="range"
          min="-180"
          max="180"
          aria-label="Rotation"
          :value="editor.selection.rotation"
          @input="editor.update(editor.selection.id, { rotation: Number(value($event)) })"
        />
      </div>
      <button v-if="editor.selection.id === MAIN_ID" @click="editor.recenterMain()">
        Recadrer sur le canvas
      </button>
    </section>
  </template>
</template>

<style scoped>
.setting {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  color: var(--muted);
}

.setting input[type='number'] {
  width: 64px;
  padding: 3px 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font: inherit;
  color: var(--text);
  text-align: right;
}

.setting input[type='range'] {
  width: 100%;
  margin-top: 4px;
}

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
