// User edits to a filter, stored as a list of operations rather than a
// modified file. They are keyed by NeverSink's $type/$tier tags and base type
// names, so the same list can be reapplied to every new NeverSink version.
import { ruleLabel } from './parse'
import { tierLabel } from './names'
import { STACK_MAX } from './stack'
import type { FilterAction, FilterBlock, FilterCondition, FilterDoc, Visibility } from './parse'

export type Colour = [number, number, number, number]

export interface StylePatch {
  fontSize?: number
  text?: Colour
  border?: Colour | null
  background?: Colour
  // null removes the action. id is 1-16 for the game's own sounds, or a
  // file name in the filter folder (CustomAlertSound).
  sound?: { id: string, volume: number } | null
  effect?: { color: string, temp: boolean } | null
  icon?: { size: number, color: string, shape: string } | null
}

interface EditBase {
  id: number
  // Group tag ($type), e.g. "currency" or "maps->influenced".
  type: string
}

export type FilterEdit =
  | EditBase & { kind: 'move', base: string, from: string, to: string }
  | EditBase & { kind: 'style', tier: string, patch: StylePatch }
  | EditBase & { kind: 'visibility', tier: string, visibility: Visibility }
  | EditBase & { kind: 'group', hidden: boolean }
  | EditBase & { kind: 'stack', tier: string, size: number }
  | EditBase & {
    kind: 'item'
    tier: string
    base: string
    visibility: Visibility
    patch: StylePatch
    // Which block of the tier the item hit (a tier can hold several rules), by
    // its conditions, so the own rule copies the one that matches this item.
    anchor?: string
    // Goes above everything, so nothing earlier in the filter can catch it.
    pin?: boolean
  }

// A FilterEdit before it gets an id.
export type NewFilterEdit = FilterEdit extends infer E ? (E extends FilterEdit ? Omit<E, 'id'> : never) : never

export interface EditStatus {
  edit: FilterEdit
  ok: boolean
  // Blocks the edit changed (or added).
  blocks: number
  message?: string
}

export const OWN_RULE_TYPE = 'woke->own'

// ---- checking saved or shared edits ----

const isColour = (v: unknown) => Array.isArray(v) && v.length >= 3 && v.length <= 4 && v.every(n => typeof n === 'number')

export function isPatch (p: unknown): boolean {
  if (!p || typeof p !== 'object') return false
  const s = p as Record<string, unknown>
  const obj = (v: unknown, keys: string[]) => v == null || (typeof v === 'object' && keys.every(k => (v as Record<string, unknown>)[k] != null))
  return (s.fontSize === undefined || typeof s.fontSize === 'number') &&
    (s.text === undefined || isColour(s.text)) &&
    (s.background === undefined || isColour(s.background)) &&
    (s.border === undefined || s.border === null || isColour(s.border)) &&
    obj(s.sound, ['id', 'volume']) && typeof s.sound !== 'number' &&
    obj(s.effect, ['color']) && typeof s.effect !== 'number' &&
    obj(s.icon, ['size', 'color', 'shape']) && typeof s.icon !== 'number'
}

const VISIBILITIES = ['Show', 'Hide', 'Minimal']

// An edit from a saved config or a share code has the fields its kind needs. A
// broken one would stop the whole filter from opening.
export function isValidEdit (e: unknown): e is FilterEdit {
  const x = e as Record<string, unknown> | null
  if (!x || typeof x !== 'object' || typeof x.id !== 'number' || typeof x.type !== 'string') return false
  const str = (...keys: string[]) => keys.every(k => typeof x[k] === 'string')
  switch (x.kind) {
    case 'move': return str('base', 'from', 'to') && Boolean(x.from || x.to)
    case 'style': return str('tier') && isPatch(x.patch)
    case 'visibility': return str('tier') && VISIBILITIES.includes(x.visibility as string)
    case 'group': return typeof x.hidden === 'boolean'
    case 'stack': return str('tier') && typeof x.size === 'number' && Number.isInteger(x.size) && x.size > 0 && x.size <= STACK_MAX
    case 'item': return str('tier', 'base') && VISIBILITIES.includes(x.visibility as string) && isPatch(x.patch)
    default: return false
  }
}

// ---- style helpers ----

function colour (args: string[]): Colour {
  const [r, g, b, a] = args.map(Number)
  const channel = (n: number) => Number.isFinite(n) ? n : 0
  return [channel(r), channel(g), channel(b), Number.isFinite(a) ? a : 255]
}

export function readStyle (actions: FilterAction[]): StylePatch {
  const style: StylePatch = {}
  for (const a of actions) {
    switch (a.key) {
      case 'SetFontSize':
        // A broken line in the source reads as no size, not as a NaN to save.
        if (Number.isFinite(Number(a.args[0]))) style.fontSize = Number(a.args[0])
        break
      case 'SetTextColor': style.text = colour(a.args); break
      case 'SetBorderColor': style.border = colour(a.args); break
      case 'SetBackgroundColor': style.background = colour(a.args); break
      case 'PlayAlertSound':
      case 'PlayAlertSoundPositional':
      case 'CustomAlertSound':
      case 'CustomAlertSoundOptional':
        // The game's own default volumes when the line gives none.
        style.sound = { id: a.args[0], volume: Number(a.args[1] ?? (a.key.startsWith('Custom') ? 100 : 50)) }
        break
      case 'PlayEffect': style.effect = { color: a.args[0], temp: a.args[1] === 'Temp' }; break
      case 'MinimapIcon':
        style.icon = Number(a.args[0]) < 0 ? null : { size: Number(a.args[0]), color: a.args[1], shape: a.args[2] }
        break
    }
  }
  return style
}

// The game's defaults when a block sets nothing (approximate, for previews).
export const DEFAULT_TEXT: Colour = [200, 200, 200, 255]
export const DEFAULT_BG: Colour = [0, 0, 0, 240]
export const DEFAULT_FONT = 32

function setAction (actions: FilterAction[], key: string, args: string[] | null, also: string[] = []): FilterAction[] {
  const keys = [key, ...also]
  const idx = actions.findIndex(a => keys.includes(a.key))
  const rest = actions.filter(a => !keys.includes(a.key))
  if (!args) return rest
  const next = { key, args }
  if (idx < 0) return [...rest, next]
  rest.splice(Math.min(idx, rest.length), 0, next)
  return rest
}

const rgba = (c: Colour) => c.map(n => String(Math.round(n)))

export function applyStyle (block: FilterBlock, patch: StylePatch): void {
  let actions = block.actions
  if (patch.fontSize !== undefined) actions = setAction(actions, 'SetFontSize', [String(patch.fontSize)])
  if (patch.text !== undefined) actions = setAction(actions, 'SetTextColor', rgba(patch.text))
  if (patch.border !== undefined) actions = setAction(actions, 'SetBorderColor', patch.border ? rgba(patch.border) : null)
  if (patch.background !== undefined) actions = setAction(actions, 'SetBackgroundColor', rgba(patch.background))
  if (patch.sound !== undefined) {
    const custom = patch.sound != null && /\.(mp3|wav|ogg)$/i.test(patch.sound.id)
    const all = ['PlayAlertSound', 'PlayAlertSoundPositional', 'CustomAlertSound', 'CustomAlertSoundOptional']
    // woke: Optional, because the game refuses a whole filter over a missing file.
    const key = custom ? 'CustomAlertSoundOptional' : 'PlayAlertSound'
    actions = setAction(actions, key, patch.sound ? [patch.sound.id, String(patch.sound.volume)] : null, all.filter(k => k !== key))
  }
  if (patch.effect !== undefined) {
    actions = setAction(actions, 'PlayEffect', patch.effect ? [patch.effect.color, ...(patch.effect.temp ? ['Temp'] : [])] : null)
  }
  if (patch.icon !== undefined) {
    actions = setAction(actions, 'MinimapIcon', patch.icon ? [String(patch.icon.size), patch.icon.color, patch.icon.shape] : null)
  }
  block.actions = actions
  block.dirty = true
}

// A hidden drop shouldn't still beam, ping or show on the minimap.
function silence (block: FilterBlock): void {
  block.actions = block.actions.filter(a => !['PlayAlertSound', 'PlayAlertSoundPositional', 'CustomAlertSound', 'CustomAlertSoundOptional', 'PlayEffect', 'MinimapIcon'].includes(a.key))
  if (!block.actions.some(a => a.key === 'DisableDropSound')) block.actions.push({ key: 'DisableDropSound', args: ['True'] })
}

function setVisibility (block: FilterBlock, visibility: Visibility): void {
  if (block.visibility === visibility) return
  block.visibility = visibility
  if (visibility === 'Hide') silence(block)
  block.dirty = true
}

// ---- lookups ----

export function blocksOf (doc: FilterDoc, type: string, tier?: string): FilterBlock[] {
  return doc.blocks.filter(b => b.type === type && (tier === undefined || b.tier === tier))
}

function baseTypeCondition (b: FilterBlock): FilterCondition | undefined {
  return b.conditions.find(c => c.key === 'BaseType' && c.op === '==')
}

export function blockHasBase (b: FilterBlock, base: string): boolean {
  return baseTypeCondition(b)?.values.includes(base) ?? false
}

// Tiers of a group that list base types, i.e. where an item can be moved to.
// That includes a tier this strictness level has commented out: moved there,
// an item goes wherever that tier's items go. Rules with no tags aren't tiers
// of anything, so items don't move between them.
export function moveTargets (doc: FilterDoc, type: string): string[] {
  const out: string[] = []
  for (const b of blocksOf(doc, type)) {
    if (b.tier && !b.tier.startsWith('#') && baseTypeCondition(b) && !out.includes(b.tier)) out.push(b.tier)
  }
  return out
}

// Identifies a block within its tier, leaving out the item list.
export function conditionSignature (b: FilterBlock): string {
  return JSON.stringify(b.conditions.filter(c => c.key !== 'BaseType').map(c => [c.key, c.op, c.count, c.values]))
}

export function slug (text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

// ---- applying ----

function applyOne (doc: FilterDoc, edit: FilterEdit): EditStatus {
  switch (edit.kind) {
    case 'group': {
      const blocks = doc.blocks.filter(b => b.type === edit.type || b.type?.startsWith(edit.type + '->'))
      if (!blocks.length) return { edit, ok: false, blocks: 0, message: 'Group not found in this filter' }
      if (edit.hidden) for (const b of blocks) if (b.visibility !== 'Hide') setVisibility(b, 'Hide')
      return { edit, ok: true, blocks: blocks.length }
    }
    case 'visibility': {
      const blocks = blocksOf(doc, edit.type, edit.tier)
      if (!blocks.length) return { edit, ok: false, blocks: 0, message: 'Tier not found in this filter' }
      for (const b of blocks) setVisibility(b, edit.visibility)
      return { edit, ok: true, blocks: blocks.length }
    }
    case 'style': {
      const blocks = blocksOf(doc, edit.type, edit.tier)
      if (!blocks.length) return { edit, ok: false, blocks: 0, message: 'Tier not found in this filter' }
      for (const b of blocks) applyStyle(b, edit.patch)
      return { edit, ok: true, blocks: blocks.length }
    }
    case 'stack': {
      const blocks = blocksOf(doc, edit.type, edit.tier)
      if (!blocks.length) return { edit, ok: false, blocks: 0, message: 'Tier not found in this filter' }
      const sized = blocks.filter(b => b.conditions.some(c => c.key === 'StackSize' && c.op === '>='))
      if (!sized.length) return { edit, ok: false, blocks: 0, message: 'This tier has no stack size in this filter' }
      for (const b of sized) {
        b.conditions = b.conditions.map(c => c.key === 'StackSize' && c.op === '>=' ? { ...c, values: [String(edit.size)] } : c)
        b.dirty = true
      }
      return { edit, ok: true, blocks: sized.length }
    }
    case 'move': {
      // Out of the tier it was moved from: stack tiers list one base many times,
      // and the others stay. If that tier no longer has it (a new version, new
      // prices), out of wherever it is now. An empty `from` adds it from outside
      // the group; an empty `to` takes it off the tier.
      const listed = blocksOf(doc, edit.type).filter(b => b.tier !== edit.to && blockHasBase(b, edit.base))
      const named = listed.filter(b => b.tier === edit.from)
      const sources = edit.from === '' ? [] : (named.length || edit.to === '' ? named : listed)
      if (edit.to === '') {
        // Already gone (a new version took it off): that's what you wanted.
        if (!sources.length) return { edit, ok: true, blocks: 0 }
        for (const b of sources) {
          const c = baseTypeCondition(b)!
          c.values = c.values.filter(v => v !== edit.base)
          b.dirty = true
          if (!c.values.length) b.disabled = true
        }
        return { edit, ok: true, blocks: sources.length }
      }
      const listing = blocksOf(doc, edit.type, edit.to).filter(b => baseTypeCondition(b))
      const live = listing.filter(b => !b.disabled)
      const targets = live.length ? live : listing
      if (!targets.length) return { edit, ok: false, blocks: 0, message: `Tier ${edit.to} not found` }
      if (edit.from !== '' && !sources.length && !targets.some(b => blockHasBase(b, edit.base))) {
        return { edit, ok: false, blocks: 0, message: `${edit.base} is no longer in this group` }
      }
      for (const b of sources) {
        const c = baseTypeCondition(b)!
        c.values = c.values.filter(v => v !== edit.base)
        b.dirty = true
        // An empty BaseType list is a syntax error in the game; drop the block.
        if (!c.values.length) b.disabled = true
      }
      for (const b of targets) {
        const c = baseTypeCondition(b)!
        // A tier commented out for being empty, or emptied by a move, is back now
        // it has an item. One the strictness level turned off stays off.
        if (b.disabled && !c.values.length && (!b.raw[0]?.trimStart().startsWith('#') || !b.raw.some(l => /BaseType\s*==\s*"/.test(l)))) {
          b.disabled = false
          b.dirty = true
        }
        if (!c.values.includes(edit.base)) {
          c.values = [...c.values, edit.base].sort((a, z) => a.localeCompare(z))
          b.dirty = true
        }
      }
      return { edit, ok: true, blocks: sources.length + targets.length }
    }
    case 'item': {
      const tierBlocks = blocksOf(doc, edit.type, edit.tier)
      const live = tierBlocks.filter(b => !b.disabled)
      // Where the item is listed now: a move or new prices may have taken it to
      // another tier of the group, and the rule has to go above that one.
      const anchored = live.find(b => conditionSignature(b) === edit.anchor)
      const listsBase = (b: FilterBlock) => blockHasBase(b, edit.base)
      const source = (anchored && (!baseTypeCondition(anchored) || listsBase(anchored)) ? anchored : undefined) ??
        live.find(listsBase) ??
        blocksOf(doc, edit.type).find(b => !b.disabled && listsBase(b)) ??
        anchored ?? live[0] ?? tierBlocks[0]
      if (!source) return { edit, ok: false, blocks: 0, message: 'Tier not found in this filter' }
      const conditions = source.conditions
        // Above everything it has to hold wherever you are, so only what says
        // which item it is stays.
        .filter(c => c.key !== 'BaseType' && (!edit.pin || c.key === 'Class' || c.key === 'Rarity'))
        .map(c => ({ ...c, values: [...c.values] }))
      conditions.push({ key: 'BaseType', op: '==', count: null, values: [edit.base] })
      const clone: FilterBlock = {
        ...source,
        index: -1,
        line: source.line,
        disabled: false,
        comment: `$type->${OWN_RULE_TYPE} $tier->${slug(edit.base)}-${edit.id} woke: own rule for ${edit.base} (from ${edit.type} ${edit.tier})`,
        type: OWN_RULE_TYPE,
        // Its own key: a rare and a magic of one base are two rules.
        tier: `${slug(edit.base)}-${edit.id}`,
        conditions,
        actions: source.actions.map(a => ({ ...a, args: [...a.args] })),
        continue: false,
        raw: [],
        dirty: true,
        added: true,
        inherited: true,
        editId: edit.id
      }
      applyStyle(clone, edit.patch)
      setVisibility(clone, edit.visibility)
      // Also over a look kept from when this rule showed the item.
      if (edit.visibility === 'Hide') silence(clone)
      const before = edit.pin ? doc.blocks[0] : source
      doc.chunks.splice(doc.chunks.indexOf(before), 0, clone)
      doc.blocks.splice(doc.blocks.indexOf(before), 0, clone)
      doc.blocks.forEach((b, i) => { b.index = i })
      return { edit, ok: true, blocks: 1 }
    }
  }
}

// Mutates `doc` (a fresh parse of the source filter).
// Moves go first, whatever order you made them in, so an own rule sits above
// wherever they left its item. The rest keep their order: an own rule keeps the
// look it had when you made it, even if you hide the tier afterwards.
export function applyEdits (doc: FilterDoc, edits: FilterEdit[]): EditStatus[] {
  const order = [...edits.filter(e => e.kind === 'move'), ...edits.filter(e => e.kind !== 'move')]
  const results = new Map(order.map(e => [e, applyOne(doc, e)]))
  return edits.map(e => results.get(e)!)
}

// ---- recording ----

let lastId = Date.now()
export function nextEditId (): number {
  lastId = Math.max(lastId + 1, Date.now())
  return lastId
}

// Adds an edit, folding it into an earlier one with the same target. A base
// listed in several tiers of its group (by stack size) has `separateMoves`: its
// moves don't chain, because the middle tier has that base of its own. Only
// moving straight back takes one out.
export function addEdit (list: FilterEdit[], edit: FilterEdit, opts: { separateMoves?: boolean } = {}): FilterEdit[] {
  const same = (e: FilterEdit): boolean => {
    if (e.kind !== edit.kind || e.type !== edit.type) return false
    switch (edit.kind) {
      // A chain of moves of one base is one move; a base listed in several
      // tiers (by stack size) can have a separate move for each.
      case 'move': return (e as typeof edit).base === edit.base && (e as typeof edit).to === edit.from &&
        (!opts.separateMoves || (e as typeof edit).from === edit.to)
      // One own rule per tier: a rare and a magic of one base can differ.
      case 'item': return (e as typeof edit).base === edit.base && (e as typeof edit).tier === edit.tier
      case 'style': return (e as typeof edit).tier === edit.tier
      case 'visibility': return (e as typeof edit).tier === edit.tier
      case 'stack': return (e as typeof edit).tier === edit.tier
      case 'group': return true
    }
    return false
  }
  const prev = list.find(same)
  if (!prev) {
    if (edit.kind === 'group' && !edit.hidden) return list
    return [...list, edit]
  }
  let merged: FilterEdit | null = edit
  if (edit.kind === 'style' && prev.kind === 'style') {
    merged = { ...edit, id: prev.id, patch: { ...prev.patch, ...edit.patch } }
  } else if (edit.kind === 'move' && prev.kind === 'move') {
    // Moving back to where it started undoes the move.
    merged = prev.from === edit.to ? null : { ...edit, id: prev.id, from: prev.from }
  } else if (edit.kind === 'item' && prev.kind === 'item') {
    merged = {
      ...edit,
      id: prev.id,
      patch: { ...prev.patch, ...edit.patch },
      anchor: edit.anchor ?? prev.anchor,
      pin: edit.pin ?? prev.pin
    }
  } else if (edit.kind === 'stack') {
    merged = { ...edit, id: prev.id }
  } else if (edit.kind === 'group' && !edit.hidden) {
    merged = null
  }
  return merged ? list.map(e => e === prev ? merged! : e) : list.filter(e => e !== prev)
}

export function describeEdit (e: FilterEdit): string {
  const group = ruleLabel(e.type, null)
  switch (e.kind) {
    case 'move':
      if (e.to === '') return `${e.base}: taken off ${ruleLabel(e.type, e.from)}`
      if (e.from === '') return `${e.base}: added to ${ruleLabel(e.type, e.to)}`
      return `${e.base}: ${group}, ${tierLabel(e.from)} → ${tierLabel(e.to)}`
    case 'style': return `Restyled ${ruleLabel(e.type, e.tier)}`
    case 'visibility': return `${e.visibility} ${ruleLabel(e.type, e.tier)}`
    case 'group': return `Hid the whole ${group} group`
    case 'stack': return `${ruleLabel(e.type, e.tier)}: stacks of ${e.size} or more`
    case 'item': return `Own rule for ${e.base} (${e.visibility === 'Hide' ? 'hidden' : 'restyled'})`
  }
}

// ---- re-homing edits that no longer fit ----

export interface RehomeOption {
  type: string
  tier?: string
  label: string
}

function tiersOf (doc: FilterDoc, type: string, withBases = false): string[] {
  const out: string[] = []
  for (const b of blocksOf(doc, type)) {
    if (b.tier && !b.disabled && (!withBases || baseTypeCondition(b)) && !out.includes(b.tier)) out.push(b.tier)
  }
  return out
}

// Groups whose last segment matches ("maps->influenced" ~ "influenced"), or
// that are a parent or child of it, for when NeverSink renames, moves or
// splits a group.
function similarTypes (doc: FilterDoc, type: string): string[] {
  const last = type.split('->').pop()!
  const out: string[] = []
  for (const b of doc.blocks) {
    if (!b.type || b.type === type || out.includes(b.type)) continue
    if (b.type.split('->').pop() === last || b.type.startsWith(type + '->') || type.startsWith(b.type + '->')) out.push(b.type)
  }
  return out
}

// Groups that list `base` in a BaseType condition now.
function typesWithBase (doc: FilterDoc, base: string): string[] {
  const out: string[] = []
  for (const b of doc.blocks) {
    if (b.type && !b.disabled && blockHasBase(b, base) && !out.includes(b.type)) out.push(b.type)
  }
  return out
}

const pretty = (type: string) => ruleLabel(type, null)

// Where a failed edit could go in this filter version, best guesses first.
export function rehomeOptions (doc: FilterDoc, edit: FilterEdit): RehomeOption[] {
  // Rules with no tags all read the same by group, so say what each one is.
  const place = (t: string, tier: string) => {
    if (!tier.startsWith('#')) return ruleLabel(t, tier)
    const b = blocksOf(doc, t, tier)[0]
    const what = b?.conditions.slice(0, 2).map(c => `${c.key} ${c.values.slice(0, 2).join(' ')}`).join(', ')
    return `${ruleLabel(t, tier)}: ${what || 'every item'}`
  }
  const types = (preferBase?: string) => {
    const list = [edit.type, ...similarTypes(doc, edit.type)]
    if (preferBase) list.unshift(...typesWithBase(doc, preferBase).filter(t => !list.includes(t)))
    return list.filter(t => blocksOf(doc, t).length)
  }
  const out: RehomeOption[] = []
  switch (edit.kind) {
    case 'group':
      for (const t of similarTypes(doc, edit.type)) out.push({ type: t, label: pretty(t) })
      break
    case 'style':
    case 'visibility':
      for (const t of types()) for (const tier of tiersOf(doc, t)) out.push({ type: t, tier, label: place(t, tier) })
      break
    case 'stack':
      for (const t of types()) {
        for (const tier of tiersOf(doc, t)) {
          if (blocksOf(doc, t, tier).some(b => b.conditions.some(c => c.key === 'StackSize' && c.op === '>='))) out.push({ type: t, tier, label: place(t, tier) })
        }
      }
      break
    case 'move':
      for (const t of types(edit.base)) for (const tier of tiersOf(doc, t, true)) if (!tier.startsWith('#')) out.push({ type: t, tier, label: ruleLabel(t, tier) })
      break
    case 'item':
      for (const t of types(edit.base)) for (const tier of tiersOf(doc, t)) out.push({ type: t, tier, label: place(t, tier) })
      break
  }
  return out
}

// The edit pointed at a new group/tier. A move keeps its base and uses the
// tier as its destination.
export function rehome (edit: FilterEdit, opt: RehomeOption): FilterEdit {
  switch (edit.kind) {
    case 'group': return { ...edit, type: opt.type }
    case 'move': return { ...edit, type: opt.type, to: opt.tier ?? edit.to }
    default: return { ...edit, type: opt.type, tier: opt.tier ?? edit.tier }
  }
}
