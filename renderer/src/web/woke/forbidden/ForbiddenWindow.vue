<template>
    <WPanel ref="panel" size-key="forbidden" title="Forbidden pair finder" :icon="itemArt({ name: FLAME }) ?? undefined" width="30rem" max-height="80vh">
      <div :class="$style.wrap" data-qa="forbidden">
        <!-- Where the class comes from -->
        <div :class="$style.row">
          <WSegmented v-model="config.source" :options="SOURCES" />
          <WSelect v-if="config.source === 'class' && !shownClass" :model-value="config.pickClass" @update:model-value="config.pickClass = $event as ClassName" :options="CLASS_OPTIONS" data-qa="forbidden-class" />
          <span v-else-if="shownClass" :class="$style.dim" data-qa="forbidden-class">{{ shownClass }} <WButton size="sm" variant="ghost" @click="shownClass = null">Back to {{ config.source === 'class' ? config.pickClass : 'yours' }}</WButton></span>
          <span v-else-if="cls" :class="$style.dim" class="w-trunc" data-qa="forbidden-source" :title="who.label">{{ who.label }}</span>
          <WButton v-if="otherPath" size="sm" variant="ghost" title="Use the PoB build other windows use" @click="config.pobPath = null">Use the build in use</WButton>
          <WInfo :class="$style.end" text="Both jewels must name the same notable, from your class: any of its three ascendancies, or the one notable only these jewels give.
- Each is **Limited to 1**, so a build has one pair.
- The **estimate** is poe.ninja's price of both jewels.
- **Price** runs two trade searches for the real cheapest pair.
- **Flame** and **Flesh** open the price check on that jewel." />
        </div>

        <div v-if="!all.length" :class="$style.dim">{{ loadNote }}</div>
        <div v-else-if="!cls" :class="$style.dim">{{ who.label }}</div>

        <section v-for="g in groups" :key="g.group" :class="$style.sec" data-qa="forbidden-group">
          <div :class="$style.head"><span>{{ g.group }}</span><span v-if="g.mine" :class="$style.mine">yours</span></div>
          <div v-for="n in g.rows" :key="n.node" :ref="el => rowRef(n.name, el)" :class="[$style.nrow, { [$style.have]: has(n), [$style.focus]: marked === n.name }]"
            data-qa="forbidden-row" data-no-item-tip="an ascendancy notable, not an item: its own tooltip says what it does"
            @mouseenter="tip($event, n)" @mouseleave="untip">
            <span :class="$style.name">{{ n.name }}<span v-if="has(n)" :class="$style.dim"> · you have it</span></span>
            <span v-if="answer(n)?.state === 'done'" :class="$style.pair" data-qa="forbidden-pair">
              <span v-item-tip="{ name: FLAME }" data-item-tip>Flame</span> {{ fmtOr(answer(n)!.flame) }} +
              <span v-item-tip="{ name: FLESH }" data-item-tip>Flesh</span> {{ fmtOr(answer(n)!.flesh) }}
              <b v-if="answer(n)!.total != null">= {{ fmt(answer(n)!.total!) }}</b>
            </span>
            <span v-else-if="answer(n)?.state === 'busy'" :class="$style.dim">Searching…</span>
            <span v-else-if="answer(n)?.state === 'error'" :class="$style.err" :title="answer(n)!.error">Search failed</span>
            <span v-else-if="estimate(n) != null" :class="$style.est" data-qa="forbidden-estimate" title="poe.ninja's price of both jewels">~{{ fmt(estimate(n)!) }}</span>
            <span :class="$style.btns" @mouseenter="untip" @mouseleave="(e: MouseEvent) => tip(e, n, (e.currentTarget as HTMLElement).parentElement!)">
              <WButton size="sm" variant="ghost" data-qa="forbidden-price" :disabled="answer(n)?.state === 'busy'" title="Two trade searches: the cheapest Forbidden Flame and Forbidden Flesh with this notable" @click="price(n)">Price</WButton>
              <WButton v-item-tip="{ name: FLAME }" data-item-tip size="sm" variant="ghost" data-qa="forbidden-check-flame" @click="check(n, 'flame', $event)">Flame</WButton>
              <WButton v-item-tip="{ name: FLESH }" data-item-tip size="sm" variant="ghost" data-qa="forbidden-check-flesh" @click="check(n, 'flesh', $event)">Flesh</WButton>
            </span>
          </div>
        </section>
      </div>
    </WPanel>
</template>

<script setup lang="ts">
// The Forbidden pair finder: the notables a Forbidden Flame and Flesh pair
// can give your class, poe.ninja's price of each pair, and on a click the
// real cheapest pair from trade.
import { computed, nextTick, onBeforeUnmount, shallowRef, watch } from 'vue'
import { ITEM_BY_REF, STATS_ITERATOR } from '@/assets/data'
import { AppConfig, poeWebApi } from '@/web/Config'
import { useLeagues } from '@/web/background/Leagues'
import { usePoeninja } from '@/web/background/Prices'
import { elementPoint, openPriceCheck } from '../ui/tooltip/item-price-check'
import type { TradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { WButton, WInfo, WPanel, WSegmented, WSelect, formatChaos, itemArt, vItemTip } from '../ui'
import { hideHelp, showHelp } from '../ui/help-tip'
import { priceCheckTradeStatus } from '../shared/trade-status'
import { askOnce, keptAnswer } from '../shared/on-demand'
import { usePriceIndex } from '../market/price-index'
import { useActiveBuild } from '../pob-builds/active'
import { character } from '../pob-builds/character'
import { loadPassiveTree } from '../pob-builds/passive-tree'
import { loadoutOf } from '../pob-builds/build-model'
import { onSharedDataChange } from '../app/live-data'
import { POB_BUILDS_TYPE, pobApi } from '../pob-builds/widget'
import type { PobBuildsWidget, PobDetails } from '../pob-builds/widget'
import { CLASSES, FLAME, FLESH, FLAME_BASE, FLESH_BASE, ascendancyShown, cheapest, classOf, forbiddenNotables, groupsFor, jewelQuery, jewelText, pairEstimate, ONLY_HERE } from './notables'
import type { CheapestOf, ClassName, ForbiddenNotable } from './notables'
import type { ForbiddenWidget } from './widget'

const props = defineProps<{ config: ForbiddenWidget }>()
const config = props.config

const SOURCES = [{ value: 'pob', label: 'PoB build' }, { value: 'character', label: 'Character' }, { value: 'class', label: 'Pick a class' }]
const CLASS_OPTIONS = CLASSES.map(c => ({ value: c, label: c }))

const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)
const leagues = useLeagues()
const active = useActiveBuild()
const ninja = usePoeninja()
const index = usePriceIndex()

// ---- the notable list ----
const all = shallowRef<ForbiddenNotable[]>([])
const loadNote = shallowRef('Reading the notable list…')
let loaded = false
let loads = 0
async function load () {
  if (loaded) return
  loaded = true
  // A read started before a data update is dropped.
  const mine = ++loads
  try {
    const tree = await loadPassiveTree()
    if (mine !== loads) return
    all.value = forbiddenNotables(STATS_ITERATOR('matching modifier on Forbidden'), id => tree.get(id))
  } catch { /* No tree data: said below. */ }
  if (mine === loads && !all.value.length) {
    loaded = false
    loadNote.value = "Couldn't read the notable list. Open the PoB builds window once to download the tree data."
  }
}
watch(() => config.wmWants, (w) => { if (w === 'show') load().catch(() => {}) }, { immediate: true })
onBeforeUnmount(onSharedDataChange(() => {
  loaded = false
  loads++
  if (config.wmWants === 'show') setTimeout(() => { load().catch(() => {}) }, 0)
}))

// ---- whose class ----
const otherPath = computed(() => config.source === 'pob' && config.pobPath && config.pobPath !== active.relPath.value ? config.pobPath : null)
const other = shallowRef<PobDetails | null>(null)
const otherFailed = shallowRef(false)
let otherRead = 0
watch([otherPath, () => config.wmWants], async ([path, wants], old) => {
  if (!path || (wants !== 'show' && path === old?.[0])) return
  const read = ++otherRead
  if (path !== old?.[0]) { other.value = null; otherFailed.value = false }
  const pob = AppConfig().widgets.find(w => w.wmType === POB_BUILDS_TYPE) as PobBuildsWidget | undefined
  try {
    if (!pob) throw new Error('no PoB builds window')
    const d = await pobApi.read(pob, path)
    if (read === otherRead) { other.value = d; otherFailed.value = false }
  } catch {
    if (read === otherRead) { other.value = null; otherFailed.value = true }
  }
}, { immediate: true })

// The tree in use: for the build in use, the loadout every window shows
// (your level and act, or the set you picked); for another build, PoB's own.
function activeNodes (d: PobDetails, inUse: boolean): Set<number> {
  const t = inUse
    ? loadoutOf(d, active.level.value, active.act.value, active.loadout.value).tree
    : d.trees.find(t => t.isActive && !t.divider) ?? d.trees.find(t => !t.divider)
  return new Set(t?.nodes ?? [])
}

// A notable of another class asked for from the search palette: that class
// shows until you pick a source or class yourself. Your saved choice stays.
const shownClass = shallowRef<ClassName | null>(null)
watch(() => [config.source, config.pickClass], () => { shownClass.value = null })

const who = computed<{ label: string, cls: ClassName | null, asc: string | null, nodes: Set<number> }>(() => {
  const none = (label: string) => ({ label, cls: null, asc: null, nodes: new Set<number>() })
  if (shownClass.value) return { label: shownClass.value, cls: shownClass.value, asc: null, nodes: new Set() }
  if (config.source === 'class') return { label: config.pickClass, cls: config.pickClass, asc: null, nodes: new Set() }
  if (config.source === 'character') {
    const c = character.value
    if (!c) return none('No character read yet. Read it in PoB builds › Character, or pick a class.')
    const cls = classOf(c.character.class)
    if (!cls) return none(`Can't tell the class of ${c.character.name}. Pick a class instead.`)
    return { label: `${c.character.name} · ${c.character.class}`, cls, asc: ascendancyShown(c.character.class), nodes: new Set(c.tree.nodes) }
  }
  const path = otherPath.value ?? active.relPath.value
  const d = otherPath.value ? other.value : active.details.value
  const name = path?.replace(/\.xml$/i, '')
  if (!path) return none('No PoB build in use. Pick one in PoB builds, or pick a class.')
  if (!d) return none(otherPath.value && otherFailed.value ? `Couldn't read ${name}. It may have moved.` : `Reading ${name}…`)
  const asc = d.ascendClassName && d.ascendClassName !== 'None' ? d.ascendClassName : ''
  const cls = classOf(asc) ?? classOf(d.className)
  if (!cls) return none(`Can't tell the class of ${name}. Pick a class instead.`)
  return { label: `${name} · ${asc || d.className}`, cls, asc: ascendancyShown(asc), nodes: activeNodes(d, !otherPath.value) }
})
const cls = computed(() => who.value.cls)
const groups = computed(() => cls.value ? groupsFor(all.value, cls.value, who.value.asc) : [])
function has (n: ForbiddenNotable): boolean { return who.value.nodes.has(n.node) }

// ---- the row the search palette asked for ----
const rows = new Map<string, HTMLElement>()
function rowRef (name: string, el: unknown) { if (el instanceof HTMLElement) rows.set(name, el); else rows.delete(name) }
// Taken once: the request is cleared, so later opens and your own picks
// aren't pulled back to it. Waits for the list and for your class to be known.
const marked = shallowRef<string | null>(null)
watch([() => config.focus, all, () => who.value.label], async ([focus]) => {
  if (!focus || !all.value.length) return
  const n = all.value.find(n => n.name === focus)
  if (!n) { config.focus = null; return }
  if (!cls.value && config.source !== 'class' && who.value.label.startsWith('Reading')) return
  if (n.cls !== cls.value) shownClass.value = n.cls
  config.focus = null
  marked.value = focus
  await nextTick()
  rows.get(focus)?.scrollIntoView({ block: 'center' })
}, { immediate: true })

// ---- prices ----
const divine = computed(() => ninja.xchgRate.value ?? null)
function fmt (chaos: number): string { return formatChaos(chaos, divine.value) }
function fmtOr (c: CheapestOf): string { return c.chaos == null ? (c.listings ? `${c.listings} listed, no price` : 'none listed') : fmt(c.chaos) }

// poe.ninja's two Forbidden jewel rows for this notable, from the Market's saved prices.
const ninjaRows = computed(() => {
  const by = new Map<string, Array<{ chaos: number }>>()
  for (const i of index.snapshot.value?.items ?? []) if (i.type === 'ForbiddenJewel') by.set(i.name, [...(by.get(i.name) ?? []), i])
  return by
})
function estimate (n: ForbiddenNotable): number | null { return pairEstimate(ninjaRows.value.get(n.name) ?? []) }

interface Answer { state: 'busy' | 'done' | 'error', flame: CheapestOf, flesh: CheapestOf, total: number | null, error?: string }
const busy = shallowRef<Record<string, Answer>>({})
const NONE: CheapestOf = { chaos: null, listings: 0 }
function key (n: ForbiddenNotable): string { return `forbidden:${leagues.selectedId.value}:${priceCheckTradeStatus().option}:${n.node}` }
function answer (n: ForbiddenNotable): Answer | undefined {
  const kept = keptAnswer<{ flame: CheapestOf, flesh: CheapestOf }>(key(n))
  if (kept) return { state: 'done', ...kept, total: kept.flame.chaos != null && kept.flesh.chaos != null ? kept.flame.chaos + kept.flesh.chaos : null }
  return busy.value[key(n)]
}

function body (n: ForbiddenNotable, jewel: 'flame' | 'flesh') {
  const q = jewelQuery(n, jewel, priceCheckTradeStatus().option)
  // The international site takes English names, a regional one its own.
  if (poeWebApi() !== 'www.pathofexile.com') {
    const name = jewel === 'flame' ? FLAME : FLESH
    const base = jewel === 'flame' ? FLAME_BASE : FLESH_BASE
    q.query.name = ITEM_BY_REF('UNIQUE', name)?.[0]?.name ?? name
    q.query.type = ITEM_BY_REF('ITEM', base)?.[0]?.name ?? base
  }
  return q
}

async function cheapestOf (n: ForbiddenNotable, jewel: 'flame' | 'flesh', league: string): Promise<CheapestOf> {
  const { requestResults, requestTradeResultList } = await import('@/web/price-check/trade/pathofexile-trade')
  const search = await requestTradeResultList(body(n, jewel) as unknown as TradeRequest, league)
  if (!search.result.length) return NONE
  const listings = await requestResults(search.id, search.result.slice(0, 5), { accountName: '' })
  if (!divine.value) throw new Error('Waiting for the divine rate from poe.ninja. Try again in a moment.')
  return cheapest(listings, search.total, divine.value)
}

function price (n: ForbiddenNotable) {
  const league = leagues.selectedId.value
  if (!league) return
  const k = key(n)
  busy.value = { ...busy.value, [k]: { state: 'busy', flame: NONE, flesh: NONE, total: null } }
  askOnce(k, async () => ({ flame: await cheapestOf(n, 'flame', league), flesh: await cheapestOf(n, 'flesh', league) }))
    .then(() => { const rest = { ...busy.value }; delete rest[k]; busy.value = rest }) // eslint-disable-line @typescript-eslint/no-dynamic-delete
    .catch((e: unknown) => {
      busy.value = { ...busy.value, [k]: { state: 'error', flame: NONE, flesh: NONE, total: null, error: e instanceof Error ? e.message : String(e) } }
    })
}

// Opens the price check on one jewel with this notable, as if copied in game.
function check (n: ForbiddenNotable, jewel: 'flame' | 'flesh', e: MouseEvent) {
  openPriceCheck({ name: jewel === 'flame' ? FLAME : FLESH, text: jewelText(n, jewel) }, elementPoint(e)).catch(() => {})
}

// ---- tooltip ----
const tipOwner = {}
function tip (e: Event, n: ForbiddenNotable, at?: HTMLElement) {
  const parts = [
    n.name,
    n.stats.length ? n.stats.join('\n') : n.group === 'Ascendant' ? `The Ascendant's ${n.name} node.` : 'No stats in the tree data.',
    `${n.group === ONLY_HERE ? 'Only Forbidden jewels give it' : `${n.group} notable`}. ${n.cls} jewels only.`,
    ...(has(n) ? ['Your tree already has it.'] : [])
  ]
  showHelp(tipOwner, at ?? e.currentTarget as HTMLElement, parts.join('\n\n'), undefined, { lines: true })
}
function untip () { hideHelp(tipOwner) }
onBeforeUnmount(untip)
</script>

<style module>
.wrap { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; font-size: var(--w-fs-sm); }
.row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.end { margin-left: auto; }
.sec { display: grid; gap: 2px; }
.head { display: flex; align-items: center; gap: 6px; color: var(--w-label); border-bottom: 1px solid var(--w-line); padding-bottom: 2px; }
.mine { color: var(--w-gold-hi); font-size: 0.85em; }
.dim { color: var(--w-dim); }
.err { color: var(--w-err, var(--w-r-unique)); }
.nrow { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 8px; min-height: 26px; padding: 0 4px; border-bottom: 1px solid var(--w-line-soft); }
.nrow:hover { background: var(--w-well); }
.nrow.have .name { opacity: 0.6; }
.nrow.focus { box-shadow: inset 2px 0 0 var(--w-gold-hi); }
.name { flex: 1 1 8rem; min-width: 8rem; color: var(--w-fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.est { color: var(--w-gold-hi); font-variant-numeric: tabular-nums; white-space: nowrap; }
.pair { color: var(--w-dim); font-variant-numeric: tabular-nums; white-space: nowrap; }
.pair b { color: var(--w-gold-hi); font-weight: normal; }
.btns { display: inline-flex; gap: 2px; }
</style>
