// Your character as pathofexile.com last read it (main/src/woke/personal/
// character-sync.ts), kept apart from every PoB build, and how it compares
// with one. Main reads in the background; this only shows the result. Off
// unless the stash reader is on.
import { computed, effectScope, shallowRef, watch } from 'vue'
import type { InjectionKey, Ref } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { personalOn } from '../personal'
import { hostRequest } from '../shared/host'
import { gearOrder, isGearSlot, itemBase, loadoutOf, orderedGems } from './build-model'
import type { LivePoints } from './build-model'
import { loadPassiveTree, treeDiff } from './passive-tree'
import type { TreeDiff, TreeNode } from './passive-tree'
import type { LoadoutPick, PobDetails, PobItem, PobSkillGroup, PobTreeSpec } from './widget'

export interface CharacterGem { name: string, level: number | null, quality: number | null, support: boolean, colour: string }
export interface CharacterGemGroup { slot: string, gems: CharacterGem[] }
export interface CharacterSnapshot {
  version: number
  account: string
  readAt: number
  character: { name: string, league: string, class: string, level: number | null }
  gear: Array<{ slot: string, item: PobItem }>
  gems: CharacterGemGroup[]
  tree: { nodes: number[], clusterNodes: number[], masteries: Record<number, number>, jewels: Array<{ x: number, item: PobItem }> }
}
export interface CharacterStatus {
  snapshot: CharacterSnapshot | null
  error: string | null
  pending: boolean
  auto: boolean
  nextAutoAt: number
}

const EMPTY: CharacterStatus = { snapshot: null, error: null, pending: false, auto: false, nextAutoAt: 0 }
export const characterStatus = shallowRef<CharacterStatus>(EMPTY)
export const character = computed(() => characterStatus.value.snapshot)

function take (s: unknown) {
  // A reply landing after the stash reader was turned off.
  if (!personalOn.value || !s || typeof s !== 'object') return
  const next = { ...EMPTY, ...(s as Partial<CharacterStatus>) }
  // Same read as before: keep the object, so nothing recalculates.
  const prev = characterStatus.value.snapshot
  if (prev && next.snapshot && prev.readAt === next.snapshot.readAt && prev.character.name === next.snapshot.character.name) next.snapshot = prev
  characterStatus.value = next
}

let started = false

// Once, from the PoB builds widget. hint: the character Client.txt names;
// auto: also read on entering an area (at most every 5 minutes).
export function startCharacterSync (hint: () => string, auto: () => boolean) {
  if (started) return
  started = true
  MainProcess.onEvent('MAIN->CLIENT::woke-event', ({ topic, data }) => {
    if (topic === 'character-sync') take(data)
  })
  // Not the widget's scope: it outlives the widget that started it.
  effectScope(true).run(() => {
    watch([personalOn, hint, auto], ([on, character, a]) => {
      if (!on) { characterStatus.value = EMPTY; return }
      hostRequest('character-sync', { character, auto: a }, 10_000).then(take).catch(() => {})
    }, { immediate: true })
  })
}

export function readCharacterNow (hint: string) {
  if (!personalOn.value) return
  characterStatus.value = { ...characterStatus.value, pending: true }
  hostRequest('character-sync', { character: hint, read: 'now' }, 60_000).then(take)
    .catch((e: Error) => { characterStatus.value = { ...characterStatus.value, pending: false, error: e.message } })
}

// The best level and quality of each gem your character sockets, by gemKey.
export const characterGems = computed(() => {
  const out = new Map<string, { level: number | null, quality: number | null }>()
  for (const g of character.value?.gems ?? []) {
    for (const x of g.gems) {
      const k = gemKey(x.name)
      const was = out.get(k)
      if (!was || (x.level ?? 0) > (was.level ?? 0) || ((x.level ?? 0) === (was.level ?? 0) && (x.quality ?? 0) > (was.quality ?? 0))) {
        out.set(k, { level: x.level, quality: x.quality })
      }
    }
  }
  return out
})

// Provided by a build window while your character is read: gem names there
// mark what you socket, and at what level.
export const CHARACTER_GEMS_ON = Symbol('character gems on') as InjectionKey<Ref<boolean>>

export interface GemHave {
  have: boolean
  // Behind the build: "18 → 20", "q5 → 20".
  behind: string
}

// level, quality: what the build asks for (null: not set, as on the leveling list).
export function gemHave (name: string, level: number | null | undefined, quality: number | null | undefined): GemHave {
  const h = characterGems.value.get(gemKey(name))
  if (!h) return { have: false, behind: '' }
  const parts: string[] = []
  if (level != null && h.level != null && h.level < level) parts.push(`${h.level} → ${level}`)
  if (quality != null && quality > 0 && (h.quality ?? 0) < quality) parts.push(`q${h.quality ?? 0} → ${quality}`)
  return { have: true, behind: parts.join(' · ') }
}

// The passive points you really spent, for the leveling guide's stage: only
// when the read is of the character Client.txt says you play, at the level it
// says, and once the tree data has loaded to tell points from start and
// ascendancy nodes. Otherwise null: the guide guesses by level.
const CLUSTER_ID_START = 0x10000
const NOT_POINTS = ['asc', 'ascstart', 'start']
export function livePointsFor (name: string, level: number | null): LivePoints | null {
  const s = personalOn.value ? character.value : null
  if (!s || !name || name !== s.character.name) return null
  if (level == null || s.character.level == null || s.character.level < level) return null
  const nodes = treeNodes.value
  if (!nodes) { loadTreeNodes(); return null }
  const points = (ids: number[]) => ids.filter(id => id < CLUSTER_ID_START && !NOT_POINTS.includes(nodes.get(id)?.kind ?? '')).length
  return { have: points(s.tree.nodes), points }
}

export const CHARACTER_TREE = 'Your character'
const CLUSTER_IDS = 0x10000

// The character's tree as a PoB tree, for the tree window's compare.
export function characterTreeSpec (s: CharacterSnapshot): PobTreeSpec {
  return {
    title: CHARACTER_TREE,
    url: '',
    isActive: false,
    // Cluster passives aren't drawn: see characterDiff.
    nodes: s.tree.nodes.filter(id => id < CLUSTER_IDS),
    masteries: s.tree.masteries
  }
}

// ---- Compare ----

export type GearState = 'match' | 'base' | 'differs' | 'missing' | 'extra'
export interface GearRowDiff { slot: string, build: PobItem | null, worn: PobItem | null, state: GearState }

function sameName (a: PobItem, b: PobItem) {
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase()
}

// match: the same unique, or the same item named the same. base: a rare or
// magic item on the build's base (its mods aren't weighed). Flasks and swap
// weapons only when the build has one there.
export function gearDiff (build: Array<{ slot: string, item: PobItem }>, worn: Array<{ slot: string, item: PobItem }>): GearRowDiff[] {
  const b = new Map(build.filter(s => isGearSlot(s.slot) || /^Flask/.test(s.slot)).map(s => [s.slot, s.item]))
  const w = new Map(worn.map(s => [s.slot, s.item]))
  const slots = [...new Set([...b.keys(), ...[...w.keys()].filter(s => isGearSlot(s) && !/^Flask/.test(s))])]
  const rows: GearRowDiff[] = slots.map((slot) => {
    const want = b.get(slot) ?? null
    const have = w.get(slot) ?? null
    let state: GearState
    if (!want) state = 'extra'
    else if (!have) state = 'missing'
    else if (want.rarity === 'UNIQUE' || want.rarity === 'RELIC' || have.rarity === 'UNIQUE' || have.rarity === 'RELIC') state = sameName(want, have) ? 'match' : 'differs'
    else {
      const wb = itemBase(want).toLowerCase()
      const hb = itemBase(have).toLowerCase()
      state = wb && wb === hb ? (sameName(want, have) ? 'match' : 'base') : 'differs'
    }
    return { slot, build: want, worn: have, state }
  })
  return rows.sort((x, y) => gearOrder(x.slot) - gearOrder(y.slot))
}

export interface GemGroupDiff {
  slot: string
  label: string
  // In the build's link order: have = socketed on the character.
  gems: Array<{ name: string, support: boolean, have: boolean }>
  // Socketed with these but not in the build's group.
  extra: string[]
}

export const gemKey = (name: string) => name.replace(/ Support$/i, '').trim().toLowerCase()

// Each enabled build group against the character's group in the same slot
// that shares most gems with it (any slot when none shares).
export function gemDiff (groups: PobSkillGroup[], worn: CharacterGemGroup[]): GemGroupDiff[] {
  const out: GemGroupDiff[] = []
  for (const g of groups) {
    if (!g.enabled) continue
    const gems = orderedGems(g).filter(x => x.name)
    if (!gems.length) continue
    const want = new Set(gems.map(x => gemKey(x.name)))
    const overlap = (c: CharacterGemGroup) => c.gems.filter(x => want.has(gemKey(x.name))).length
    const candidates = worn.filter(c => overlap(c) > 0)
    const best = candidates.sort((a, b) => (overlap(b) + (b.slot === g.slot ? 0.5 : 0)) - (overlap(a) + (a.slot === g.slot ? 0.5 : 0)))[0]
    const have = new Set((best?.gems ?? []).map(x => gemKey(x.name)))
    out.push({
      slot: g.slot,
      label: g.label || gems.find(x => !x.support)?.name || g.slot,
      gems: gems.map(x => ({ name: x.name, support: x.support === true, have: have.has(gemKey(x.name)) })),
      extra: (best?.gems ?? []).filter(x => !want.has(gemKey(x.name))).map(x => x.name)
    })
  }
  return out
}

export interface CharacterDiff {
  gear: GearRowDiff[]
  gearOff: number
  gems: GemGroupDiff[]
  gemsMissing: number
  // from: the character, to: the build. added = to take, removed = to refund.
  tree: TreeDiff | null
  treeTitle: string | null
}

export function characterDiff (s: CharacterSnapshot, d: PobDetails, nodes: Map<number, TreeNode> | null, level: number | null, act: number | null, pick?: LoadoutPick): CharacterDiff {
  const l = loadoutOf(d, level, act, pick)
  const gear = gearDiff(l.itemSet?.item.slots ?? [], s.gear)
  const gems = gemDiff(l.skillSet?.item.groups ?? d.skills, s.gems)
  const treeSpec = l.tree ?? d.trees.find(t => t.isActive) ?? null
  // Cluster jewel passives are left out: the site and PoB number them
  // differently (PoB makes its own ids from 65536 up).
  const mine = s.tree.nodes.filter(id => id < CLUSTER_IDS)
  const theirs = treeSpec?.nodes?.filter(id => id < CLUSTER_IDS)
  return {
    gear,
    gearOff: gear.filter(r => r.state === 'differs' || r.state === 'missing').length,
    gems,
    gemsMissing: gems.reduce((n, g) => n + g.gems.filter(x => !x.have).length, 0),
    tree: theirs ? treeDiff(nodes, mine, theirs) : null,
    treeTitle: treeSpec?.title ?? null
  }
}

export function readAgo (readAt: number, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - readAt) / 60_000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.round(mins / 60)
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`
}

// Loaded once something compares; shared by the card and the tab.
const treeNodes = shallowRef<Map<number, TreeNode> | null>(null)
let treeLoading = false
function loadTreeNodes () {
  if (treeNodes.value || treeLoading) return
  treeLoading = true
  loadPassiveTree().then((n) => { treeNodes.value = n }, () => {}).finally(() => { treeLoading = false })
}

export function useCharacterDiff (details: Ref<PobDetails | null>, level: Ref<number | null>, act: Ref<number | null>, pick: Ref<LoadoutPick | undefined>) {
  watch(character, (s) => { if (s) loadTreeNodes() }, { immediate: true })
  return computed(() => character.value && details.value
    ? characterDiff(character.value, details.value, treeNodes.value, level.value, act.value, pick.value)
    : null)
}
