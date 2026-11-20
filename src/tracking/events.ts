import type { ExportMode } from '../editor/export'
import type { Format } from '../editor/formats'

/** Catalogue of tracked events: the name, then the required properties of each. */
export interface Events {
  session_start: object
  format_selected: { format: Format; width: number; height: number }
  main_image_imported: { width: number; height: number; replacement: boolean }
  image_layer_added: { layer_count: number }
  text_added: { layer_count: number }
  /** Sent once typing has stopped, with the list of settings touched. */
  text_edited: { fields: string }
  layer_deleted: { type: 'image' | 'text' | 'main' }
  export_succeeded: {
    mode: ExportMode
    format: Format
    width: number
    height: number
    image_count: number
    text_count: number
    /** Time elapsed since landing on the page: used for the time to first export. */
    seconds_since_arrival: number
  }
  export_failed: { mode: ExportMode }
}
