// "Open this saved item": the search palette asks, the tool that keeps it
// (by widget type) shows it. The tool clears the request once it has it.
import { shallowRef, watch } from 'vue'

export interface SavedOpen {
  tool: string
  // An entry id, or a PoB build's file.
  id: string
  // When it was asked for (ms): a tool that mounts much later ignores it.
  at: number
}

// Older than this, a request is left alone: a tool that wasn't there to
// take it then shouldn't jump open minutes later.
export const SAVED_OPEN_MAX_AGE = 10_000

export const savedOpenRequest = shallowRef<SavedOpen | null>(null)

// For a tool's setup: runs `open` with each request meant for `tool`.
export function onSavedOpen (tool: string, open: (id: string) => void): void {
  watch(savedOpenRequest, (req) => {
    if (req?.tool !== tool) return
    savedOpenRequest.value = null
    if (Date.now() - req.at <= SAVED_OPEN_MAX_AGE) open(req.id)
  }, { immediate: true })
}

// The folded folders with `folder` and its parents unfolded.
export function unfold (closed: readonly string[] | undefined, folder: string): string[] {
  const parts = folder.split(/[/\\]+/).map(p => p.trim()).filter(Boolean)
  const opens = new Set(parts.map((_, i) => parts.slice(0, i + 1).join('/')))
  return (closed ?? []).filter(p => !opens.has(p))
}
