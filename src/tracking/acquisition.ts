const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

export type Acquisition = Partial<Record<(typeof UTM_KEYS)[number], string>> & {
  /** Always set: utm_source, otherwise the referrer, otherwise "direct". */
  source: string
}

/** Reads the acquisition source from the page address and the referrer. */
export function readAcquisition(search: string, referrer: string): Acquisition {
  const params = new URLSearchParams(search)
  const utm: Partial<Record<(typeof UTM_KEYS)[number], string>> = {}
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim()
    if (value) utm[key] = value
  }
  let origin = ''
  try {
    origin = new URL(referrer).hostname
  } catch {
    // no usable referrer
  }
  return { ...utm, source: utm.utm_source ?? (origin || 'direct') }
}

const STORAGE_KEY = 'acquisition'

/** Session source: the one from the first page seen, kept even if the address changes later. */
export function sessionAcquisition(): Acquisition {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
    const parsed = readAcquisition(location.search, document.referrer)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
    return parsed
  } catch {
    // storage blocked (strict private browsing): read the address again each time
    return readAcquisition(location.search, document.referrer)
  }
}
