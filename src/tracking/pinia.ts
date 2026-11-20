import type { PiniaPluginContext } from 'pinia'
import type { useEditor } from '../stores/editor'
import { track } from './index'

const TYPING_DELAY = 1000

/**
 * Hooks tracking onto the editor store actions: components never call `track`.
 * An event is only sent once the action has succeeded.
 */
export function editorTracking({ store }: PiniaPluginContext) {
  if (store.$id !== 'editor') return
  const editor = store as ReturnType<typeof useEditor>

  // one keystroke = one action: text changes are grouped into a single event
  const touchedFields = new Set<string>()
  let timer: ReturnType<typeof setTimeout>

  editor.$onAction(({ name, args, after }) => {
    const previousFormat = editor.format
    const stepsBefore = editor.past.length
    const hadMain = !!editor.main
    const removedType =
      name === 'remove'
        ? editor.main?.id === args[0]
          ? 'main'
          : editor.layers.find((layer) => layer.id === args[0])?.type
        : undefined

    after(() => {
      const { width, height } = editor.size
      switch (name) {
        case 'selectFormat':
          // clicking the already active format again is not a choice
          if (editor.format === previousFormat) return
          return track('format_selected', { format: editor.format, width, height })
        case 'importMain':
          return track('main_image_imported', {
            width: editor.main!.width,
            height: editor.main!.height,
            replacement: hadMain,
          })
        case 'addImage':
          return track('image_layer_added', { layer_count: editor.layers.length })
        case 'addText':
          return track('text_added', { layer_count: editor.layers.length })
        case 'updateText':
          Object.keys(args[1]).forEach((field) => touchedFields.add(field))
          clearTimeout(timer)
          timer = setTimeout(() => {
            track('text_edited', { fields: [...touchedFields].sort().join(',') })
            touchedFields.clear()
          }, TYPING_DELAY)
          return
        case 'undo':
          if (editor.past.length < stepsBefore) track('history_used', { direction: 'undo' })
          return
        case 'redo':
          if (editor.past.length > stepsBefore) track('history_used', { direction: 'redo' })
          return
        case 'remove':
          if (removedType) track('layer_deleted', { type: removedType })
      }
    })
  })
}
