/** Available fonts, loaded from Google Fonts in index.html. */
export const FONTS = ['Inter', 'Montserrat', 'Playfair Display', 'Bebas Neue', 'Pacifico', 'Roboto Mono']

/** Waits for a font to be ready. Offline, the browser keeps its fallback font. */
export async function loadFont(font: string): Promise<void> {
  await document.fonts.load(`16px "${font}"`).catch(() => {})
}
