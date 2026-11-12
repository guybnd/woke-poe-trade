// Colours for lit mechanics on the atlas tree: by the order they were picked,
// so the first pick is always red, the second blue and so on.
export const LIT_COLOURS = ['#e0605a', '#5fb2e8', '#7fd27a', '#c58dff', '#f0a040', '#5fd6c4', '#ff7fb5', '#d8d860', '#9aa8ff', '#ff9a7a']

export function litColour (lit: string[], name: string): string {
  const i = lit.indexOf(name)
  return LIT_COLOURS[(i < 0 ? 0 : i) % LIT_COLOURS.length]
}
