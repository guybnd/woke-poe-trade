// The tool's side of What's new's Show me: open the tab a line names
// (goto-targets.ts).
import { shallowReactive, watch } from 'vue'
import type { Widget } from '@/web/overlay/widgets'
import type { GotoTool, GotoTarget } from './goto-targets'

// Kept here, not in the window's flags: a new window's first mount resets those.
const pending = shallowReactive(new Map<number, string>())

export function requestGoto (wmId: number, target: string): void {
  pending.set(wmId, target)
}

// Every target of the tool's type needs a handler (the type checks it). Runs on
// a request made before or after the window mounts, then forgets it.
export function useGoto<T extends GotoTool> (widget: Widget, _type: T, go: Record<GotoTarget<T>, () => void>): void {
  watch(() => pending.get(widget.wmId), target => {
    if (target == null) return
    pending.delete(widget.wmId)
    ;(go as Record<string, (() => void) | undefined>)[target]?.()
  }, { immediate: true })
}
