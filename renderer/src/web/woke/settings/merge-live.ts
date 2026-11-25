// The settings window edits a copy of the config. Committing merges it into
// the live config (SettingsShell.vue). Pure: the live config is passed in.
import type { Config } from '@/web/Config'
import type { Widget } from '@/web/overlay/interfaces'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => v != null && typeof v === 'object' && !Array.isArray(v)
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const copy = <T>(v: T): T => v === undefined ? v : JSON.parse(JSON.stringify(v))

// Three-way: what this window changed since its last commit wins; everything
// else takes the live value. Widgets keep saving their own state while the
// window is open (runs, sessions, steps, saved searches), and our copy of it
// is stale.
function merge3 (mine: unknown, base: unknown, live: unknown): unknown {
  if (same(mine, base)) return copy(live)
  if (isObj(mine) && isObj(base) && isObj(live)) {
    const out: Obj = {}
    for (const k of new Set([...Object.keys(mine), ...Object.keys(live)])) {
      const v = merge3(mine[k], base[k], live[k])
      if (v !== undefined) out[k] = v
    }
    return out
  }
  return mine
}

// Widgets this settings window placed itself (setting the map check key before
// Map mods exists): Undo back to before that takes them out again.
// By id, with the type placed, so an id another tool takes later is never
// mistaken for it. Cleared each time the window opens.
export const placedHere = new Map<number, string>()

// `drop`: widgets to take out (placed here, and Undo went back before them).
export function mergeConfigs (next: Config, since: Config, live: Config, drop?: ReadonlySet<number>): Config {
  const noWidgets = (c: Config): Obj => { const o: Obj = { ...c }; delete o.widgets; return o }
  const merged = merge3(noWidgets(next), noWidgets(since), noWidgets(live)) as Omit<Config, 'widgets'>
  // Live order and membership: a widget removed while the window was open
  // stays removed, one added joins.
  const widgets = live.widgets.map(l => {
    const mine = next.widgets.find(w => w.wmId === l.wmId)
    if (!mine) return copy(l)
    const base = since.widgets.find(w => w.wmId === l.wmId)
    // Another widget that got the same id live: never replace it.
    if (!base && mine.wmType !== l.wmType) return copy(l)
    const w = (base ? merge3(mine, base, l) : mine) as Widget
    // Window-manager state lives in the live config, not in our copy.
    w.wmWants = l.wmWants
    w.wmZorder = l.wmZorder
    w.wmFlags = [...l.wmFlags]
    return w
  })
  // Placed by this window (setting Alt+M before Map mods exists): it isn't
  // live yet, and it wasn't in our last commit either.
  // If a different widget took its id live meanwhile, it joins under a new id.
  let top = Math.max(0, ...live.widgets.map(w => w.wmId), ...next.widgets.map(w => w.wmId))
  for (const mine of next.widgets) {
    if (since.widgets.some(w => w.wmId === mine.wmId)) continue
    const taken = live.widgets.find(l => l.wmId === mine.wmId)
    if (!taken) widgets.push(mine)
    else if (taken.wmType !== mine.wmType) {
      const moved = { ...mine, wmId: ++top }
      if (placedHere.has(mine.wmId)) { placedHere.delete(mine.wmId); placedHere.set(moved.wmId, moved.wmType) }
      widgets.push(moved)
    }
  }
  // Only a widget still of the type placed under that id.
  const dropped = (w: Widget) => !!drop?.has(w.wmId) && placedHere.get(w.wmId) === w.wmType
  return { ...merged, widgets: drop?.size ? widgets.filter(w => !dropped(w)) : widgets } as Config
}
