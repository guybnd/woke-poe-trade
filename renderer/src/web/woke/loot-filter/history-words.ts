// The Changes tab's History in words: each step as the values it moved, from
// what to what and where ("Essences ruler · Normal 2.8c → 3.5c"), and steps in
// a row that moved the same thing folded into one line. Loaded with the
// editor, never at startup.
import type { StylePatch } from './edits'
import { defaultPresets, type Presets } from './presets'
import { PRESET_NAMES, describePatch, describeStep, type Settings, type TimelineStep } from './timeline'
import type { CurrencySettings, ItemEdit } from './currency-settings'
import { CSTEP_NAMES } from './currency-settings'
import { ALL_CATEGORIES } from './currency-weights'
import { CHASE_LOOKS } from './unique-classes'
import { LOOK_CHANNELS, LOOK_LABEL, WEIGHT_LABEL, type WeightSettings } from './weight-settings'
import type { GearSettings } from './gear'

// The editor tab a change was made on, for the row's icon and the chips.
export type HistoryTab = 'loot' | 'equipment' | 'prices' | 'presets' | 'rules'
export const HISTORY_TABS: Array<{ key: HistoryTab, label: string, icon: string }> = [
  { key: 'loot', label: 'Loot', icon: 'fas fa-coins' },
  { key: 'equipment', label: 'Equipment', icon: 'fas fa-shield-alt' },
  { key: 'prices', label: 'Prices', icon: 'fas fa-chart-line' },
  { key: 'presets', label: 'Presets', icon: 'fas fa-sliders-h' },
  { key: 'rules', label: 'Rules', icon: 'fas fa-pen' }
]

export interface Change {
  tab: HistoryTab
  // The same control every time it moves: steps in a row with the same keys fold.
  key: string
  where: string
  what: string
  from?: string
  to?: string
  // An item the line names, for its hover tooltip.
  item?: string
}

export function changeText (c: Change): string {
  return `${c.where} · ${c.what}${c.from != null || c.to != null ? ` ${c.from ?? '—'} → ${c.to ?? '—'}` : ''}`
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const keysOf = (...xs: unknown[]) => [...new Set(xs.flatMap(x => x && typeof x === 'object' ? Object.keys(x) : []))].sort()

function num (v: number): string {
  const a = Math.abs(v)
  const r = a >= 100 ? Math.round(v) : a >= 10 ? Math.round(v * 10) / 10 : a >= 1 ? Math.round(v * 100) / 100 : Math.round(v * 1000) / 1000
  return r.toLocaleString('en-US')
}
const chaos = (v: unknown) => typeof v === 'number' ? `${num(v)}c` : undefined
const plain = (v: unknown): string | undefined => v == null ? undefined : typeof v === 'number' ? num(v) : typeof v === 'boolean' ? (v ? 'on' : 'off') : typeof v === 'string' ? v : JSON.stringify(v)
// A Price bias as the sliders word it: the % of its price it counts at.
const biasPct = (p: unknown) => `${p == null ? 100 : Math.round(Number(p))}%`
const multPct = (m: unknown) => biasPct(m == null ? null : Number(m) * 100)
const stepName = (s: unknown) => s == null ? 'price decides' : CSTEP_NAMES[Number(s)] ?? String(s)

const PAGE_NAMES: Record<string, string> = { all: 'Every page', currency: 'Currency', fragments: 'Fragments', cards: 'Cards', uniques: 'Uniques', gems: 'Gems', maps: 'Maps', jewels: 'Jewels', league: 'League items', gold: 'Gold' }
let catNames: Map<string, string> | null = null
function catName (id: string): string {
  catNames ??= new Map(ALL_CATEGORIES.map(c => [c.id, c.name]))
  return catNames.get(id) ?? PAGE_NAMES[id] ?? id
}
const MODE_NAME: Record<string, string> = { off: 'Hide', auto: 'By price', always: 'Always' }
const modeName = (m: unknown) => m == null ? 'By price' : MODE_NAME[String(m)] ?? plain(m)
const offNames = (xs: unknown) => Array.isArray(xs) && xs.length ? xs.map(n => CSTEP_NAMES[n] ?? String(n)).join(', ') : 'none'

// Set additions and removals, by name.
function setDiff (b: unknown, a: unknown): { added: string[], removed: string[] } {
  const was = new Set(Array.isArray(b) ? b.map(String) : [])
  const now = new Set(Array.isArray(a) ? a.map(String) : [])
  return { added: [...now].filter(x => !was.has(x)), removed: [...was].filter(x => !now.has(x)) }
}

function lookChange (tab: HistoryTab, key: string, where: string, b: StylePatch | undefined, a: StylePatch | undefined): Change {
  const words = describePatch(a ?? {}, b ?? {})
  return { tab, key, where, what: a && Object.keys(a).length ? (words ? `look: ${words}` : 'look changed') : 'look back to default' }
}

// Any value the handlers below don't know, by its path.
function leaves (tab: HistoryTab, key: string, where: string, b: unknown, a: unknown, path: string[] = []): Change[] {
  if (same(b, a)) return []
  const obj = (x: unknown) => x != null && typeof x === 'object' && !Array.isArray(x)
  if (obj(b) || obj(a)) {
    return keysOf(b, a).flatMap(k => leaves(tab, `${key}.${k}`, where, (b as Record<string, unknown>)?.[k], (a as Record<string, unknown>)?.[k], [...path, k]))
  }
  const what = path.length ? path.map(p => p.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()).join(' › ') : 'changed'
  return [{ tab, key, where, what, from: plain(b) ?? 'none', to: plain(a) ?? 'none' }]
}

function itemChanges (name: string, b: ItemEdit | undefined, a: ItemEdit | undefined): Change[] {
  const base = { tab: 'loot' as const, where: name, item: name }
  if (!a) return [{ ...base, key: `cur.items.${name}`, what: 'back to its section' }]
  const out: Change[] = []
  const k = (f: string) => `cur.items.${name}.${f}`
  if (!same(b?.step, a.step)) out.push({ ...base, key: k('step'), what: 'step', from: stepName(b?.step), to: stepName(a.step) })
  if (!same(b?.price, a.price)) out.push({ ...base, key: k('price'), what: 'price', from: chaos(b?.price) ?? 'poe.ninja', to: chaos(a.price) ?? 'poe.ninja' })
  if (!same(b?.mult, a.mult)) out.push({ ...base, key: k('mult'), what: 'price bias', from: multPct(b?.mult), to: multPct(a.mult) })
  if (!same(b?.supply, a.supply)) out.push({ ...base, key: k('supply'), what: 'always shows from stack', from: plain(b?.supply) ?? 'off', to: plain(a.supply) ?? 'off' })
  if (!same(b?.min, a.min)) out.push({ ...base, key: k('min'), what: a.min ? 'Collecting (at least Normal)' : 'Collecting off' })
  if (!same(b?.look, a.look)) out.push({ ...lookChange('loot', k('look'), name, b?.look, a.look), item: name })
  return out
}

function currencyChanges (b: Partial<CurrencySettings>, a: Partial<CurrencySettings>): Change[] {
  const out: Change[] = []
  const L = 'loot' as const
  if (!same(b.on, a.on)) out.push({ tab: L, key: 'cur.on', where: 'Loot tab', what: a.on ? 'turned on' : 'turned off' })
  if (!same(b.line, a.line)) out.push({ tab: L, key: 'cur.line', where: 'Main ruler', what: 'Small starts', from: chaos(b.line), to: chaos(a.line) })
  for (let i = 0; i < 4; i++) {
    if (!same(b.from?.[i], a.from?.[i])) out.push({ tab: L, key: `cur.from.${i}`, where: 'Main ruler', what: `${CSTEP_NAMES[i + 2]} starts`, from: chaos(b.from?.[i]), to: chaos(a.from?.[i]) })
  }
  if (!same(b.mult, a.mult)) out.push({ tab: L, key: 'cur.mult', where: 'Loot tab', what: 'Strictness', from: b.mult == null ? 'follows the filter' : `×${num(b.mult)}`, to: a.mult == null ? 'follows the filter' : `×${num(a.mult)}` })
  for (const c of keysOf(b.bias, a.bias)) {
    if (!same(b.bias?.[c], a.bias?.[c])) out.push({ tab: L, key: `cur.bias.${c}`, where: catName(c), what: 'price bias', from: biasPct(b.bias?.[c]), to: biasPct(a.bias?.[c]) })
  }
  for (const c of keysOf(b.catMode, a.catMode)) {
    if (!same(b.catMode?.[c], a.catMode?.[c])) out.push({ tab: L, key: `cur.mode.${c}`, where: catName(c), what: 'shows', from: modeName(b.catMode?.[c]), to: modeName(a.catMode?.[c]) })
  }
  for (const c of keysOf(b.rulers, a.rulers)) {
    const was = b.rulers?.[c]
    const now = a.rulers?.[c]
    if (same(was, now)) continue
    if (!now) out.push({ tab: L, key: `cur.ruler.${c}`, where: `${catName(c)} ruler`, what: 'back to the main ruler' })
    else if (!was) out.push({ tab: L, key: `cur.ruler.${c}`, where: `${catName(c)} ruler`, what: 'own ruler, starting from the main one' })
    else {
      now.forEach((v, i) => {
        if (v !== was[i]) out.push({ tab: L, key: `cur.ruler.${c}.${i}`, where: `${catName(c)} ruler`, what: CSTEP_NAMES[i + 1], from: chaos(was[i]), to: chaos(v) })
      })
    }
  }
  for (const p of keysOf(b.offBy, a.offBy)) {
    if (same(b.offBy?.[p] ?? [], a.offBy?.[p] ?? [])) continue
    const { added, removed } = setDiff(b.offBy?.[p], a.offBy?.[p])
    const where = `${catName(p)} steps`
    if (a.offBy?.[p] === undefined) out.push({ tab: L, key: `cur.off.${p}`, where, what: 'back to the row above' })
    else if (added.length && !removed.length) out.push({ tab: L, key: `cur.off.${p}`, where, what: `${offNames(added.map(Number))} turned off` })
    else if (removed.length && !added.length) out.push({ tab: L, key: `cur.off.${p}`, where, what: `${offNames(removed.map(Number))} turned on` })
    else out.push({ tab: L, key: `cur.off.${p}`, where, what: 'off', from: offNames(b.offBy?.[p]), to: offNames(a.offBy?.[p]) })
  }
  for (const n of keysOf(b.items, a.items)) {
    if (!same(b.items?.[n], a.items?.[n])) out.push(...itemChanges(n, b.items?.[n], a.items?.[n]))
  }
  for (const s of keysOf(b.steps, a.steps)) {
    if (!same(b.steps?.[s], a.steps?.[s])) out.push(lookChange(L, `cur.steplook.${s}`, `${CSTEP_NAMES[Number(s)] ?? s} step`, b.steps?.[s], a.steps?.[s]))
  }
  for (const c of keysOf(b.cats, a.cats)) {
    if (!same(b.cats?.[c], a.cats?.[c])) out.push(lookChange(L, `cur.catlook.${c}`, catName(c), b.cats?.[c], a.cats?.[c]))
  }
  if (b.faint && a.faint && !same(b.faint.on, a.faint.on)) out.push({ tab: L, key: 'cur.faint.on', where: 'Faint step', what: a.faint?.on ? 'turned on' : 'turned off' })
  if (b.faint?.until != null && a.faint?.until != null && !same(b.faint.until, a.faint.until)) out.push({ tab: L, key: 'cur.faint.until', where: 'Faint step', what: 'shows below Strictness', from: `×${num(Number(b.faint?.until))}`, to: `×${num(Number(a.faint?.until))}` })
  if (!same(b.mapFrom, a.mapFrom)) out.push({ tab: L, key: 'cur.mapFrom', where: 'Maps', what: 'normal maps shown from tier', from: plain(b.mapFrom), to: plain(a.mapFrom) })
  for (let i = 0; i < 5; i++) {
    if (!same(b.gold?.[i], a.gold?.[i])) out.push({ tab: L, key: `cur.gold.${i}`, where: 'Gold ruler', what: `${CSTEP_NAMES[i + 1]} from pile`, from: plain(b.gold?.[i]), to: plain(a.gold?.[i]) })
  }
  if (!same(b.mapLook, a.mapLook)) {
    const look = (id?: string) => ({ dark: 'Dark card', edge: 'White card' } as Record<string, string>)[id ?? ''] ?? 'Tinted card'
    out.push({ tab: L, key: 'cur.mapLook', where: 'Special maps', what: 'style', from: look(b.mapLook), to: look(a.mapLook) })
  }
  if (!same(b.chaseLook, a.chaseLook)) {
    const look = (id?: string) => id ? CHASE_LOOKS.find(l => l.id === id)?.name ?? id : 'default'
    out.push({ tab: L, key: 'cur.chaseLook', where: 'Chase uniques', what: 'look', from: look(b.chaseLook), to: look(a.chaseLook) })
  }
  if (!same(b.notAvg ?? [], a.notAvg ?? [])) {
    const { added, removed } = setDiff(b.notAvg, a.notAvg)
    for (const n of added) out.push({ tab: L, key: `cur.notAvg.${n}`, where: n, what: 'left out of its base\'s average', item: n })
    for (const n of removed) out.push({ tab: L, key: `cur.notAvg.${n}`, where: n, what: 'counted in its base\'s average again', item: n })
  }
  if (!same(b.sizeCut, a.sizeCut)) {
    const s = (v?: string) => v === 'on' ? 'On' : v === 'off' ? 'Off' : 'Auto'
    out.push({ tab: L, key: 'cur.sizeCut', where: 'Uniques', what: 'size cut', from: s(b.sizeCut), to: s(a.sizeCut) })
  }
  const known = new Set(['on', 'line', 'from', 'mult', 'bias', 'catMode', 'rulers', 'offBy', 'items', 'steps', 'cats', 'faint', 'mapFrom', 'gold', 'chaseLook', 'mapLook', 'notAvg', 'sizeCut', 'sizeOn'])
  for (const k of keysOf(b, a)) {
    if (!known.has(k)) out.push(...leaves(L, `cur.${k}`, 'Loot tab', (b as Record<string, unknown>)[k], (a as Record<string, unknown>)[k], [k]))
  }
  return out
}

const LOUD_NAMES = ['Normal', 'Big', 'Beam']
function weightChanges (b: Partial<WeightSettings>, a: Partial<WeightSettings>): Change[] {
  const out: Change[] = []
  const E = 'equipment' as const
  const W = 'Rare gear'
  if (!same(b.on, a.on)) out.push({ tab: E, key: 'w.on', where: W, what: a.on ? 'scoring turned on' : 'scoring turned off' })
  if (!same(b.need, a.need)) out.push({ tab: E, key: 'w.need', where: W, what: 'score needed to show', from: plain(b.need), to: plain(a.need) })
  if (!same(b.flaskLine, a.flaskLine)) out.push({ tab: E, key: 'w.flaskLine', where: 'Flasks', what: 'score needed to show', from: plain(b.flaskLine), to: plain(a.flaskLine) })
  for (let i = 0; i < 3; i++) {
    if (!same(b.loud?.[i], a.loud?.[i])) out.push({ tab: E, key: `w.loud.${i}`, where: W, what: `${LOUD_NAMES[i]} from score`, from: plain(b.loud?.[i]), to: plain(a.loud?.[i]) })
  }
  for (const k of keysOf(b.mult, a.mult)) {
    const key = k as keyof WeightSettings['mult']
    if (!same(b.mult?.[key], a.mult?.[key])) out.push({ tab: E, key: `w.mult.${k}`, where: W, what: `${WEIGHT_LABEL[key] ?? k} weight`, from: plain(b.mult?.[key]), to: plain(a.mult?.[key]) })
  }
  if (!same(b.always ?? [], a.always ?? [])) {
    const { added, removed } = setDiff(b.always, a.always)
    for (const k of added) out.push({ tab: E, key: `w.always.${k}`, where: W, what: `${WEIGHT_LABEL[k as keyof typeof WEIGHT_LABEL] ?? k} always shows` })
    for (const k of removed) out.push({ tab: E, key: `w.always.${k}`, where: W, what: `${WEIGHT_LABEL[k as keyof typeof WEIGHT_LABEL] ?? k} goes by score again` })
  }
  for (const ch of LOOK_CHANNELS) {
    const was = b.look?.[ch.key]
    const now = a.look?.[ch.key]
    if (!same(was, now)) out.push({ tab: E, key: `w.look.${ch.key}`, where: `${W} ${ch.label.toLowerCase()}`, what: 'order', from: was?.[0] ? `${LOOK_LABEL[was[0]]} first` : 'none', to: now?.[0] ? `${LOOK_LABEL[now[0]]} first` : 'none' })
  }
  for (const base of keysOf(b.ranks, a.ranks)) {
    const r = (v?: string) => v ? WEIGHT_LABEL[v as keyof typeof WEIGHT_LABEL] ?? v : 'filter\'s rank'
    if (!same(b.ranks?.[base], a.ranks?.[base])) out.push({ tab: E, key: `w.rank.${base}`, where: base, what: 'rank', from: r(b.ranks?.[base]), to: r(a.ranks?.[base]), item: base })
  }
  const known = new Set(['on', 'need', 'flaskLine', 'loud', 'mult', 'always', 'look', 'ranks'])
  for (const k of keysOf(b, a)) {
    if (!known.has(k)) out.push(...leaves(E, `w.${k}`, W, (b as Record<string, unknown>)[k], (a as Record<string, unknown>)[k], [k]))
  }
  return out
}

const ROW_NAMES: Record<string, string> = { build: 'Build', exotic: 'Exotic', r1: 'Rank 1', r2: 'Rank 2', r3: 'Rank 3', any: 'Any base' }
const LANE_NAMES: Record<string, string> = { ...ROW_NAMES, none: 'no rank', never: 'Never' }
function gearChanges (b: Partial<GearSettings>, a: Partial<GearSettings>): Change[] {
  const out: Change[] = []
  const E = 'equipment' as const
  const G = 'Gear table'
  if (!same(b.on, a.on)) out.push({ tab: E, key: 'g.on', where: G, what: a.on ? 'turned on' : 'turned off' })
  for (const row of keysOf(b.show, a.show)) {
    for (const r of ['magic', 'rare'] as const) {
      const was = (b.show as Record<string, Record<string, number>> | undefined)?.[row]?.[r]
      const now = (a.show as Record<string, Record<string, number>> | undefined)?.[row]?.[r]
      if (!same(was, now)) out.push({ tab: E, key: `g.show.${row}.${r}`, where: `${G} · ${ROW_NAMES[row] ?? row}`, what: r, from: plain(was), to: plain(now) })
    }
  }
  for (const base of keysOf(b.moves, a.moves)) {
    const l = (v?: string) => v ? LANE_NAMES[v] ?? v : 'filter\'s rank'
    if (!same(b.moves?.[base], a.moves?.[base])) out.push({ tab: E, key: `g.move.${base}`, where: base, what: 'rank', from: l(b.moves?.[base]), to: l(a.moves?.[base]), item: base })
  }
  for (const k of ['magic', 'rare', 'quality'] as const) {
    if (!same(b.look?.[k], a.look?.[k])) out.push(lookChange(E, `g.look.${k}`, `${G} · ${k === 'quality' ? 'over-quality mark' : k}`, b.look?.[k], a.look?.[k]))
  }
  if (!same(b.look?.rarityText, a.look?.rarityText)) out.push({ tab: E, key: 'g.look.rarityText', where: G, what: a.look?.rarityText ? 'rarity colour text on' : 'rarity colour text off' })
  const known = new Set(['on', 'show', 'moves', 'look'])
  for (const k of keysOf(b, a)) {
    if (!known.has(k)) out.push(...leaves(E, `g.${k}`, G, (b as Record<string, unknown>)[k], (a as Record<string, unknown>)[k], [k]))
  }
  return out
}

function presetChanges (b: Partial<Presets>, a: Partial<Presets>): Change[] {
  const out: Change[] = []
  const d = defaultPresets()
  for (const k of keysOf(b, a) as Array<keyof Presets>) {
    const was = b[k] ?? d[k]
    const now = a[k] ?? d[k]
    if (same(was, now)) continue
    if (k === 'currency') out.push(...currencyChanges(was as CurrencySettings, now as CurrencySettings))
    else if (k === 'weights') out.push(...weightChanges(was as WeightSettings, now as WeightSettings))
    else if (k === 'gear') out.push(...gearChanges(was as GearSettings, now as GearSettings))
    else {
      const name = PRESET_NAMES[k] ?? k
      const where = name.charAt(0).toUpperCase() + name.slice(1)
      const w = was as unknown as Record<string, unknown>
      const n = now as unknown as Record<string, unknown>
      if (w && n && typeof w === 'object' && typeof n === 'object') {
        if (w.on !== n.on) out.push({ tab: 'presets', key: `p.${k}.on`, where, what: n.on ? 'turned on' : 'turned off' })
        const rest = (x: Record<string, unknown>) => Object.fromEntries(Object.entries(x).filter(([f]) => f !== 'on'))
        out.push(...leaves('presets', `p.${k}`, where, rest(w), rest(n)))
      } else out.push(...leaves('presets', `p.${k}`, where, was, now))
    }
  }
  return out
}

const EMPTY = (): Settings => ({ edits: [], rules: [], presets: defaultPresets(), moves: [], locks: [] })

// Everything a step changed, one line per value.
export function stepChanges (before: Partial<Settings>, after: Partial<Settings>, lookOf: (type: string, tier: string) => StylePatch = () => ({})): Change[] {
  const out: Change[] = []
  const base = EMPTY()
  const b = { ...base, ...before }
  const a = { ...base, ...after }
  // The parts with their own words in timeline.ts: one line each.
  const only = (k: 'edits' | 'rules' | 'moves' | 'locks') => describeStep({ ...b, [k]: b[k] }, { ...b, [k]: a[k] }, lookOf)
  const ids = (xs: unknown[], ys: unknown[]) => {
    const id = (x: unknown) => String((x as { id?: unknown }).id)
    const was = new Map(xs.map(x => [id(x), JSON.stringify(x)]))
    const now = new Map(ys.map(y => [id(y), JSON.stringify(y)]))
    return [...new Set([...was.keys(), ...now.keys()])].filter(i => was.get(i) !== now.get(i)).sort().join(',')
  }
  if (!same(b.edits, a.edits)) out.push({ tab: 'rules', key: `edits:${ids(b.edits, a.edits)}`, where: 'Drop tiers', what: only('edits') })
  if (!same(b.rules, a.rules)) out.push({ tab: 'rules', key: `rules:${ids(b.rules, a.rules)}`, where: 'Your rules', what: only('rules') })
  if (!same(b.moves, a.moves)) {
    const k = (m: { type: string, base: string, to?: unknown }) => `${m.type}|${m.base}|${String(m.to)}`
    const was = new Set(b.moves.map(k))
    const now = new Set(a.moves.map(k))
    const moved = [...new Set([...was, ...now])].filter(x => was.has(x) !== now.has(x)).sort().join(',')
    out.push({ tab: 'prices', key: `moves:${moved}`, where: 'Prices', what: only('moves') })
  }
  if (!same(b.locks, a.locks)) {
    const { added, removed } = setDiff(b.locks, a.locks)
    out.push({ tab: 'prices', key: `locks:${[...added, ...removed].sort().join(',')}`, where: 'Prices', what: only('locks') })
  }
  if (!same(b.presets, a.presets)) {
    try {
      out.push(...presetChanges(b.presets, a.presets))
    } catch {
      out.push({ tab: 'presets', key: 'presets', where: 'Presets', what: 'changed' })
    }
  }
  return out
}

// ---- rows ----

export interface HistoryRow {
  // The newest step in the row: Back to here goes right after it.
  n: number
  // The oldest one.
  first: number
  ts: number
  firstTs: number
  count: number
  changes: Change[]
  // Each folded value's path, oldest first ("0.2c → 0.3c → 0.5c"), when it moved more than once.
  trails: Map<string, string[]>
  tabs: HistoryTab[]
}

// Steps this close together that move the same control fold into one row.
export const FOLD_GAP_MS = 10 * 60_000

// Only steps whose every line is a value from → to fold: words like "Small
// turned off" or a look would lose the earlier steps' part.
const signature = (cs: Change[]) => cs.length && cs.every(c => c.from != null && c.to != null) ? cs.map(c => c.key).sort().join('|') : ''

// The rows, newest first. `changesOf` is cached by the caller (a step never
// changes). `at` is how many steps are in effect: a row never spans it, so
// each row is either all in effect or all undone.
export function historyRows (steps: readonly TimelineStep[], changesOf: (s: TimelineStep) => Change[], at = steps.length): HistoryRow[] {
  const groups: Array<{ n: number, first: number, ts: number, firstTs: number, sig: string, all: Change[][] }> = []
  steps.forEach((step, n) => {
    const cs = changesOf(step)
    const sig = signature(cs)
    const last = groups[groups.length - 1]
    if (last && sig && sig === last.sig && n !== at && step.ts - last.ts <= FOLD_GAP_MS) {
      last.n = n
      last.ts = step.ts
      last.all.push(cs)
    } else groups.push({ n, first: n, ts: step.ts, firstTs: step.ts, sig, all: [cs] })
  })
  return groups.map(g => {
    const firstOf = new Map(g.all[0].map(c => [c.key, c]))
    const trails = new Map<string, string[]>()
    // The row reads from its first value to its last.
    const changes = g.all[g.all.length - 1].map(c => {
      const was = firstOf.get(c.key)
      if (g.all.length > 1) {
        const t = [was?.from ?? '—', ...g.all.map(cs => cs.find(x => x.key === c.key)?.to ?? '—')]
          .filter((v, i, xs) => i === 0 || v !== xs[i - 1])
        // Only worth showing when it went through more than one value.
        if (t.length > 2) trails.set(c.key, t)
      }
      return { ...c, from: was?.from }
    })
    return { n: g.n, first: g.first, ts: g.ts, firstTs: g.firstTs, count: g.all.length, changes, trails, tabs: [...new Set(changes.map(c => c.tab))] }
  }).reverse()
}

// The row's one line: its first change, and how many more.
export function rowSummary (r: HistoryRow): string {
  if (!r.changes.length) return 'Changed settings'
  const first = changeText(r.changes[0])
  return r.changes.length > 1 ? `${first}, and ${r.changes.length - 1} more` : first
}
