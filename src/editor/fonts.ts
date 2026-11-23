/** Available fonts: the files bundled for the server (server/fonts), declared in style.css. */
export const FONTS = ['Inter', 'Montserrat', 'Playfair Display', 'Bebas Neue', 'Pacifico', 'Roboto Mono']

/** Waits for a font to be ready. If its file cannot be fetched, the browser keeps its fallback font. */
export async function loadFont(font: string): Promise<void> {
  await document.fonts.load(`16px "${font}"`).catch(() => {})
}
