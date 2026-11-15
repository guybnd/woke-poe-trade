// The Character tab's resistances, attributes and requirements: your
// character as read, and with the build's gear in its place.
import { computed, shallowRef } from 'vue'
import type { Ref } from 'vue'
import { loadTipBases, loadTipGems } from '../ui/tooltip/item-tip'
import type { TipPack } from '../ui/tooltip/tip-content'
import { isGearSlot, itemBase, loadoutOf, orderedGems } from './build-model'
import { character, characterTreeNodes } from './character'
import { ATTRIBUTES, resPenalty, sumDefences } from './char-defences'
import type { Attribute, Defences } from './char-defences'
import { withMasteries } from './passive-tree'
import type { LoadoutPick, PobDetails, PobItem } from './widget'

const bases = shallowRef<TipPack['bases'] | null>(null)
const gems = shallowRef<TipPack['gems'] | null>(null)
let asked = false
function loadData () {
  if (asked) return
  asked = true
  // A failed load is tried again the next time the tab asks.
  loadTipBases().then((b) => { bases.value = b }, () => { asked = false })
  loadTipGems().then((g) => { gems.value = g }, () => { asked = false })
}

// PoB names supports without " Support"; the gem file keeps it.
function gemOf (name: string) {
  const g = gems.value
  return g?.[name] ?? g?.[`${name} Support`] ?? g?.[gemKeyOf(name)] ?? null
}

// A level the data doesn't reach (22, 23) reads as its highest.
function atLevel<T> (lv: Record<string, T> | undefined, level: number | null): T | undefined {
  if (!lv) return undefined
  const want = level ?? 1
  if (lv[String(want)]) return lv[String(want)]
  const top = Math.max(...Object.keys(lv).map(Number).filter(n => n <= want))
  return Number.isFinite(top) ? lv[String(top)] : lv['1']
}

// An item's base: a magic item carries it inside its name.
function baseOf (item: PobItem) {
  const b = bases.value
  if (!b) return undefined
  const named = itemBase(item)
  if (named && b[named]) return b[named]
  let best: string | null = null
  for (const key of Object.keys(b)) if (item.name.includes(key) && (!best || key.length > best.length)) best = key
  return best ? b[best] : undefined
}

// Worn gear that counts: no swap weapons, no flasks (their mods only last while used).
const counts = (slot: string) => isGearSlot(slot) && !/^Flask/.test(slot)
const itemLines = (item: PobItem) => [...item.implicits, ...item.mods]
const gemKeyOf = (name: string) => name.replace(/ Support$/i, '')

// An aura's lines at a level: Purity of Elements' "You and nearby allies gain ...".
function auraLines (name: string, level: number | null): string[] {
  const g = gemOf(name)
  if (!g || !g.t?.includes('Aura')) return []
  const lv = atLevel(g.lv, level)
  return [...(g.st ?? []), ...(lv?.x ?? [])]
}

export interface Requirement {
  key: string
  what: string
  kind: 'item' | 'gem'
  short: string[]
}

export interface DefencesView {
  now: Defences
  // With the build's gear in each slot where it differs (null: no build gear).
  withBuild: Defences | null
  needs: Requirement[]
}

function itemNeeds (item: PobItem, base: { l?: number, s?: number, d?: number, i?: number } | undefined): { level: number, attr: Record<Attribute, number> } {
  let inc = 0
  const flat: Record<Attribute, number> = { Strength: base?.s ?? 0, Dexterity: base?.d ?? 0, Intelligence: base?.i ?? 0 }
  let none = false
  for (const m of itemLines(item)) {
    if (m === 'Has no Attribute Requirements') none = true
    const f = /^\+?(\d+) (Strength|Dexterity|Intelligence) Requirement$/.exec(m)
    if (f) flat[f[2] as Attribute] += Number(f[1])
    const p = /^(\d+)% (increased|reduced) Attribute Requirements$/.exec(m)
    if (p) inc += Number(p[1]) * (p[2] === 'reduced' ? -1 : 1)
  }
  const attr = Object.fromEntries(ATTRIBUTES.map(a => [a, none ? 0 : Math.floor(flat[a] * (1 + inc / 100))])) as Record<Attribute, number>
  return { level: item.levelReq ?? base?.l ?? 0, attr }
}

export function useCharacterDefences (details: Ref<PobDetails | null>, level: Ref<number | null>, act: Ref<number | null>, pick: Ref<LoadoutPick | undefined>) {
  return computed<DefencesView | null>(() => {
    const s = character.value
    if (!s) return null
    loadData()
    const nodes = characterTreeNodes()
    if (!nodes || !gems.value || !bases.value) return null
    const node = withMasteries(nodes, s.tree.masteries)
    const treeLines = s.tree.nodes.flatMap(id => node(id)?.stats ?? [])
    const jewelLines = s.tree.jewels.flatMap(j => itemLines(j.item))
    // Auras on the swap weapon aren't up.
    const auras = s.gems.filter(g => counts(g.slot)).flatMap(g => g.gems.flatMap(x => auraLines(x.name, x.level)))
    const penalty = resPenalty(act.value, s.character.level)
    const worn = s.gear.filter(x => counts(x.slot))
    const shared = [...treeLines, ...jewelLines, ...auras]
    const now = sumDefences(s.character.class, [...worn.flatMap(x => itemLines(x.item)), ...shared], penalty)

    const d = details.value
    const l = d ? loadoutOf(d, level.value, act.value, pick.value) : null
    const buildGear = (l?.itemSet?.item.slots ?? []).filter(x => counts(x.slot))
    let withBuild: Defences | null = null
    if (buildGear.length) {
      const bySlot = new Map(worn.map(x => [x.slot, x.item]))
      for (const b of buildGear) bySlot.set(b.slot, b.item)
      withBuild = sumDefences(s.character.class, [...[...bySlot.values()].flatMap(itemLines), ...shared], penalty)
    }

    // What of the build you can't use yet: its gear by your level and
    // attributes, its gems at their levels.
    const needs: Requirement[] = []
    const have = now.attr
    const lvl = s.character.level ?? 0
    for (const b of buildGear) {
      const need = itemNeeds(b.item, baseOf(b.item))
      const short: string[] = []
      if (need.level > lvl) short.push(`level ${need.level}`)
      for (const a of ATTRIBUTES) if (need.attr[a] > have[a]) short.push(`${need.attr[a]} ${a.slice(0, 3)} (you ${have[a]})`)
      if (short.length) needs.push({ what: b.item.name || itemBase(b.item), kind: 'item', short, key: b.slot })
    }
    const seen = new Set<string>()
    for (const g of l?.skillSet?.item.groups ?? []) {
      if (!g.enabled) continue
      for (const x of orderedGems(g)) {
        const key = gemKeyOf(x.name)
        if (!x.name || seen.has(key)) continue
        seen.add(key)
        const lv = atLevel(gemOf(x.name)?.lv, x.level)
        if (!lv) continue
        const short: string[] = []
        if ((lv.r ?? 0) > lvl) short.push(`level ${lv.r}`)
        const a = lv.a ?? {}
        const want: Record<Attribute, number> = { Strength: a.s ?? 0, Dexterity: a.d ?? 0, Intelligence: a.i ?? 0 }
        for (const k of ATTRIBUTES) if (want[k] > have[k]) short.push(`${want[k]} ${k.slice(0, 3)} (you ${have[k]})`)
        if (short.length) needs.push({ what: `${key} ${x.level ?? 1}`, kind: 'gem', short, key: `gem:${key}` })
      }
    }
    return { now, withBuild, needs }
  })
}
