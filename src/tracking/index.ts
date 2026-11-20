import { ref } from 'vue'
import { sessionAcquisition } from './acquisition'
import type { Events } from './events'

declare global {
  interface Window {
    dataLayer?: object[]
  }
}

export interface Entry {
  event: string
  timestamp: string
  session_id: string
  [property: string]: unknown
}

/** Latest events sent, for the demo panel. */
export const log = ref<Entry[]>([])
const LOG_SIZE = 50

export const acquisition = sessionAcquisition()
const sessionId = crypto.randomUUID()

/**
 * Single entry point for tracking. Every event is sent with the acquisition source and the session,
 * into `window.dataLayer`: Google Tag Manager or any other tool plugs in without touching the code.
 */
export function track<Name extends keyof Events>(name: Name, properties: Events[Name]): void {
  const entry: Entry = {
    event: name,
    ...properties,
    ...acquisition,
    session_id: sessionId,
    timestamp: new Date().toISOString(),
  }
  ;(window.dataLayer ??= []).push(entry)
  log.value = [entry, ...log.value].slice(0, LOG_SIZE)
  if (import.meta.env.DEV) console.debug('[tracking]', name, entry)
}
