// The last item copied in game (Shortcuts.ts notes it), for the Claude link's
// last_item tool. Kept in memory only: gone when the app restarts.

let lastItem: { text: string, at: number } | null = null

export function noteItemText (text: string): void {
  if (text) lastItem = { text: text.slice(0, 20000), at: Date.now() }
}

export function lastItemText (): { text: string, at: number } | null {
  return lastItem
}
