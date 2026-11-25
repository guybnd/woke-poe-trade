<template>
    <WPanel ref="panel" size-key="megalo" title="Megalomaniac searcher" icon="/images/art/o-eternal.png" width="34rem" max-height="80vh">
      <div :class="$style.wrap" data-qa="megalo">
        <!-- Where the build comes from -->
        <div :class="$style.row">
          <WSegmented v-model="config.source" :options="SOURCES" />
          <span :class="$style.dim" class="w-trunc" data-qa="megalo-source" :title="sourceLine">{{ sourceLine }}</span>
          <WButton v-if="otherPath" size="sm" variant="ghost" title="Score against the PoB build other windows use" @click="useActive">Use the build in use</WButton>
        </div>

        <!-- The build's tags -->
        <section :class="$style.sec">
          <div :class="$style.head">
            <span>Your build's tags</span>
            <WInfo text="Tags found in your build by itself are marked **•**. Main skill tags count most.
- Click a tag to drop it, or add any tag below.
- Your changes stay with this build." />
            <WButton size="sm" variant="ghost" :class="$style.end" data-qa="megalo-add-tags" @click="browse = !browse">{{ browse ? 'Done' : '+ Add tags' }}</WButton>
          </div>
          <div :class="$style.chips">
            <WChip v-for="t in activeTags" :key="t.id" clickable active :title="t.found ? 'Found in your build. Click to drop it.' : 'Added by you. Click to remove it.'"
              data-qa="megalo-tag" @click="toggleTag(t.id)">{{ t.id }}<span v-if="t.found" :class="$style.dot">•</span><span v-if="t.main" :class="$style.main">main</span></WChip>
            <span v-if="!activeTags.length" :class="$style.dim">No tags yet. Add the ones your build uses.</span>
          </div>
          <div v-if="browse" :class="$style.browse" data-qa="megalo-browser">
            <WField v-model="tagQuery" placeholder="Find a tag" icon="fas fa-search" />
            <div v-for="g in tagGroups" :key="g.group" :class="$style.tgroup">
              <span :class="$style.glabel">{{ g.group }}</span>
              <div :class="$style.chips">
                <WChip v-for="t in g.tags" :key="t.id" clickable :active="weights.has(t.id)" @click="toggleTag(t.id)">
                  {{ t.id }}<span :class="$style.n">{{ t.count }}</span>
                </WChip>
              </div>
            </div>
            <span v-if="!tagGroups.length" :class="$style.dim">No tag matches.</span>
          </div>
        </section>

        <!-- Notables, grouped by the build tag they fit best -->
        <section :class="$style.sec">
          <div :class="$style.head">
            <span>Notables</span>
            <WInfo text="Which notables count, and how much.
- [[Click]] a notable to tick or untick it.
- [[Right-click]] makes it a must-have (up to 3): every result has it.
- The **number** is its weight; the best fit is 100. Click it to change it, **↺** goes back to the suggestion.
- Hover a notable to see what it does." />
            <WField v-model="filter" :class="$style.end" :style="{ width: '11rem' }" placeholder="Filter notables or tags" icon="fas fa-filter" data-qa="megalo-filter" />
          </div>
          <div v-if="!pool.length" :class="$style.dim">The notable list loads when the window opens…</div>
          <div v-for="g in shownGroups" :key="g.tag" :class="$style.ngroup">
            <span :class="$style.glabel">{{ g.tag }}</span>
            <div :class="$style.chips">
              <span v-for="r in g.rows" :key="r.name" :class="[$style.nchip, { [$style.on]: isOn(r.name), [$style.must]: isMust(r.name) }]" data-qa="megalo-notable"
                role="checkbox" :aria-checked="isOn(r.name)" tabindex="0"
                @click="toggleOn(r.name)" @keydown.enter.space.prevent="toggleOn(r.name)" @contextmenu.prevent="toggleMust(r.name)"
                @mouseenter="tip($event, r)" @mouseleave="untip" @focus="tip($event, r)" @blur="untip">
                <i v-if="isMust(r.name)" class="fas fa-lock" :class="$style.lock" title="Must have: every result has it" />
                <span>{{ r.name }}</span>
                <input :class="[$style.wt, { [$style.edited]: edited(r.name) }]" type="number" min="0" max="100" step="5"
                  :value="weightOf(r)" :aria-label="`Weight for ${r.name}`" data-qa="megalo-weight"
                  @click.stop @keydown.stop @change="setWeight(r, ($event.target as HTMLInputElement).value)">
                <button v-if="edited(r.name)" :class="$style.reset" :title="`Back to the suggested ${r.weight}`" @click.stop="resetWeight(r.name)">↺</button>
              </span>
            </div>
          </div>
          <WButton v-if="otherRows.length" size="sm" variant="ghost" :class="$style.more" @click="showOther = !showOther">
            {{ showOther ? 'Hide' : 'Show' }} {{ otherRows.length }} notables that fit none of your tags
          </WButton>
          <span v-if="pool.length && !shownGroups.length" :class="$style.dim">No notable matches that filter.</span>
          <span v-if="unknown" :class="$style.dim" data-qa="megalo-unknown">{{ unknown }} new {{ unknown === 1 ? 'notable isn\'t' : 'notables aren\'t' }} in the trade data yet, so {{ unknown === 1 ? 'it\'s' : 'they\'re' }} left out.</span>
        </section>

        <!-- The search -->
        <div :class="$style.foot">
          <WSegmented v-model="config.mode" :options="MODES" />
          <template v-if="config.mode === 'count'">
            <span :class="$style.dim">Need</span>
            <WSegmented :model-value="String(config.need)" :options="NEEDS" @update:model-value="config.need = Number($event)" />
            <span :class="$style.dim">of {{ ticked.length }}</span>
          </template>
          <template v-else>
            <span :class="$style.dim">Min total</span>
            <input :class="$style.num" type="number" min="0" step="10" :placeholder="String(minSuggested)" :value="config.minWeight ?? ''"
              aria-label="Minimum total weight" data-qa="megalo-min" @keydown.stop @change="setMin(($event.target as HTMLInputElement).value)">
          </template>
          <span :class="$style.dim">max</span>
          <input :class="$style.num" type="number" min="0" step="0.5" placeholder="any" :value="config.maxDiv ?? ''"
            aria-label="Highest price in divines" data-qa="megalo-max" @keydown.stop @change="setMax(($event.target as HTMLInputElement).value)">
          <span :class="$style.dim">div</span>
          <span :class="$style.end" data-qa="megalo-save"><SaveSearchButton :get-link="searchLink" :suggest-name="saveName" /></span>
          <WButton size="sm" variant="primary" data-qa="megalo-search" :disabled="!ticked.length" @click="search">Search</WButton>
        </div>
        <div :class="$style.dim" data-qa="megalo-summary">{{ summary }}</div>
      </div>
    </WPanel>
</template>

<script setup lang="ts">
// The Megalomaniac searcher: reads your build's tags, scores every notable
// Megalomaniac can roll, and searches trade for jewels with the ones you tick.
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { STAT_BY_REF_V2, ITEM_BY_REF } from '@/assets/data'
import { AppConfig, poeWebApi } from '@/web/Config'
import { useLeagues } from '@/web/background/Leagues'
import { getTradeEndpoint } from '@/web/price-check/trade/common'
import { WButton, WChip, WField, WInfo, WPanel, WSegmented, toast } from '../ui'
import { hideHelp, showHelp } from '../ui/help-tip'
import { tradeUrl } from '../search/search'
import { priceCheckTradeStatus } from '../shared/trade-status'
import SaveSearchButton from '../trade-searches/SaveSearchButton.vue'
import { useActiveBuild } from '../pob-builds/active'
import { character } from '../pob-builds/character'
import { mainGroupOf } from '../pob-builds/build-model'
import { loadPassiveTree, passiveTreeClusters } from '../pob-builds/passive-tree'
import { onSharedDataChange } from '../app/live-data'
import { POB_BUILDS_TYPE, pobApi } from '../pob-builds/widget'
import type { PobBuildsWidget, PobDetails } from '../pob-builds/widget'
import { TAGS, TAG_GROUPS } from './tags'
import { MAX_TRADE_FILTERS, MEGALO_BASE, MEGALO_NAME, buildTags, defaultOn, megaloQuery, notablePool, scoreNotables, suggestedMinWeight, tagWeights } from './score'
import type { BuildSource, FoundTags, Notable, Scored, TagEdits } from './score'
import { buildKey } from './widget'
import type { MegaloWidget, NotablePick } from './widget'

const props = defineProps<{ config: MegaloWidget }>()
const config = props.config

const SOURCES = [{ value: 'pob', label: 'PoB build' }, { value: 'character', label: 'Character' }, { value: 'none', label: 'Tags only' }]
const MODES = [{ value: 'count', label: 'Count' }, { value: 'weight', label: 'Weighted sum' }]
const NEEDS = [{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }]

const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)
const leagues = useLeagues()
const active = useActiveBuild()

// ---- the notable list ----
const pool = shallowRef<Notable[]>([])
const unknown = shallowRef(0)
let loaded = false
async function loadPool () {
  if (loaded) return
  loaded = true
  try {
    await loadPassiveTree()
    // A notable the trade data doesn't know yet (a new league's) can't be searched.
    const all = notablePool(passiveTreeClusters()?.named)
    pool.value = all.filter(n => statId(n.name))
    unknown.value = all.length - pool.value.length
  } catch { /* No tree data yet: the list says it's loading. */ }
  if (!pool.value.length) {
    // Tried again the next time the window opens (the toast says how to fix it).
    loaded = false
    toast("Couldn't read the notable list. Open the PoB builds window once to download the tree data.", { anchor: panel.value?.el })
  }
}
watch(() => config.wmWants, (w) => { if (w === 'show') loadPool().catch(() => {}) }, { immediate: true })
// Newer tree or trade data (a league's new notables): read the list again.
onBeforeUnmount(onSharedDataChange(() => {
  loaded = false
  if (config.wmWants === 'show') setTimeout(() => { loadPool().catch(() => {}) }, 0)
}))

// ---- the build ----
// No build to read yet: show the list, save no changes.
const WAITING = ''
// A build opened from its own page, when it isn't the one in use.
const otherPath = computed(() => config.source === 'pob' && config.pobPath && config.pobPath !== active.relPath.value ? config.pobPath : null)
const other = shallowRef<PobDetails | null>(null)
const otherFailed = shallowRef(false)
// PoB may have saved it since: read it again each time the window opens.
const shown = computed(() => config.wmWants === 'show')
let otherRead = 0
watch([otherPath, shown], async ([path, open], old) => {
  const was = old?.[0]
  if (!path || (!open && path === was)) return
  const read = ++otherRead
  if (path !== was) { other.value = null; otherFailed.value = false }
  const pob = AppConfig().widgets.find(w => w.wmType === POB_BUILDS_TYPE) as PobBuildsWidget | undefined
  try {
    if (!pob) throw new Error('no PoB builds window')
    const d = await pobApi.read(pob, path)
    if (read === otherRead) { other.value = d; otherFailed.value = false }
  } catch {
    if (read === otherRead) { other.value = null; otherFailed.value = true }
  }
}, { immediate: true })
function useActive () { config.pobPath = null }

const source = computed<{ key: string, label: string, build: BuildSource | null }>(() => {
  if (config.source === 'pob') {
    const path = otherPath.value ?? active.relPath.value
    const d = otherPath.value ? other.value : active.details.value
    const name = path?.replace(/\.xml$/i, '')
    if (!path) return { key: WAITING, label: 'No PoB build in use. Pick one in PoB builds.', build: null }
    if (!d) return { key: WAITING, label: otherPath.value && otherFailed.value ? `Couldn't read ${name}. It may have moved.` : `Reading ${name}…`, build: null }
    const main = mainGroupOf(d.skills)
    const gems = d.skills.filter(g => g.enabled).flatMap(g => g.gems.filter(x => x.enabled).map(x => x.name))
    return {
      key: buildKey('pob', path),
      label: `${path.replace(/\.xml$/i, '')}${d.mainSkill ? ` · ${d.mainSkill}` : ''}`,
      build: { mainGems: main?.gems.filter(x => x.enabled).map(x => x.name) ?? [], gems, stats: d.stats }
    }
  }
  if (config.source === 'character') {
    const c = character.value
    if (!c) return { key: WAITING, label: 'No character read yet. Read it in PoB builds › Character.', build: null }
    const groups = c.gems.filter(g => g.gems.length)
    const main = [...groups].sort((a, b) => b.gems.length - a.gems.length)[0]
    return {
      key: buildKey('character', c.character.name),
      label: `${c.character.name} · level ${c.character.level ?? '?'} ${c.character.class}`,
      build: { mainGems: main?.gems.map(g => g.name) ?? [], gems: groups.flatMap(g => g.gems.map(x => x.name)) }
    }
  }
  return { key: buildKey('none', ''), label: 'Pick the tags yourself.', build: null }
})

const waiting = computed(() => source.value.key === WAITING)
const found = computed<FoundTags>(() => source.value.build ? buildTags(source.value.build) : { found: [], main: [] })
const edits = computed<TagEdits>(() => config.edits[source.value.key] ?? { add: [], drop: [] })
const weights = computed(() => tagWeights(found.value, edits.value))

const activeTags = computed(() => [...weights.value.keys()]
  .sort((a, b) => (weights.value.get(b)! - weights.value.get(a)!) || TAGS.findIndex(t => t.id === a) - TAGS.findIndex(t => t.id === b))
  .map(id => ({ id, found: found.value.found.includes(id), main: found.value.main.includes(id) })))

function toggleTag (id: string) {
  if (waiting.value) return
  const e: TagEdits = { add: [...edits.value.add], drop: [...edits.value.drop] }
  if (weights.value.has(id)) {
    e.add = e.add.filter(x => x !== id)
    if (found.value.found.includes(id) && !e.drop.includes(id)) e.drop.push(id)
  } else {
    e.drop = e.drop.filter(x => x !== id)
    if (!found.value.found.includes(id) && !e.add.includes(id)) e.add.push(id)
  }
  config.edits = { ...config.edits, [source.value.key]: e }
}

// ---- tag browser ----
const browse = shallowRef(false)
const tagQuery = shallowRef<string | number>('')
// How many notables each tag lights; tags that light none aren't offered.
const tagCounts = computed(() => {
  const n = new Map<string, number>()
  for (const r of scoredAll.value) for (const t of r.tags) n.set(t, (n.get(t) ?? 0) + 1)
  return n
})
const tagGroups = computed(() => {
  const q = String(tagQuery.value).trim().toLowerCase()
  return TAG_GROUPS.map(group => ({
    group,
    tags: TAGS.filter(t => t.group === group && tagCounts.value.get(t.id) && (!q || t.id.toLowerCase().includes(q)))
      .map(t => ({ id: t.id, count: tagCounts.value.get(t.id) ?? 0 }))
  })).filter(g => g.tags.length)
})

// ---- scoring ----
const scoredAll = computed<Scored[]>(() => scoreNotables(pool.value, weights.value))
const defaults = computed(() => defaultOn(scoredAll.value))
const picks = computed<Record<string, NotablePick>>(() => config.picks[source.value.key] ?? {})

function setPick (name: string, change: NotablePick) {
  if (waiting.value) return
  const mine = { ...picks.value, [name]: { ...picks.value[name], ...change } }
  config.picks = { ...config.picks, [source.value.key]: mine }
}
function isOn (name: string): boolean { return isMust(name) || (picks.value[name]?.on ?? defaults.value.has(name)) }
// Unticking a must-have drops the must too.
function toggleOn (name: string) { setPick(name, isOn(name) ? { on: false, must: undefined } : { on: true }) }
function isMust (name: string): boolean { return picks.value[name]?.must === true }
function toggleMust (name: string) {
  if (!isMust(name) && mustCount.value >= 3) { toast('Up to 3 must-haves: a Megalomaniac has 3 notables', { anchor: panel.value?.el }); return }
  setPick(name, isMust(name) ? { must: undefined } : { must: true, on: true })
}
function edited (name: string): boolean { return picks.value[name]?.weight != null }
function weightOf (r: Scored): number { return picks.value[r.name]?.weight ?? r.weight }
function setWeight (r: Scored, raw: string) {
  if (raw.trim() === '') { resetWeight(r.name); return }
  const v = Math.max(0, Math.min(100, Math.round(Number(raw) || 0)))
  setPick(r.name, { weight: v === r.weight ? undefined : v })
}
function resetWeight (name: string) { setPick(name, { weight: undefined }) }

// ---- grouping and filter ----
const filter = shallowRef<string | number>('')
const showOther = shallowRef(false)
function matches (r: Scored, q: string): boolean {
  return !q || r.name.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q)) ||
    r.stats.some(s => s.toLowerCase().includes(q))
}
const otherRows = computed(() => scoredAll.value.filter(r => !r.matched.length))
const shownGroups = computed(() => {
  const q = String(filter.value).trim().toLowerCase()
  const order = activeTags.value.map(t => t.id)
  const groups = new Map<string, Scored[]>(order.map(id => [id, []]))
  const other: Scored[] = []
  for (const r of [...scoredAll.value].sort((a, b) => weightOf(b) - weightOf(a) || a.name.localeCompare(b.name))) {
    if (!matches(r, q)) continue
    // Under the tag it fits best, by tag weight then tag order.
    const home = order.find(id => r.matched.includes(id) && !r.weak.includes(id)) ?? order.find(id => r.matched.includes(id))
    if (home) groups.get(home)!.push(r)
    else if (showOther.value || q) other.push(r)
  }
  const out = [...groups].filter(([, rows]) => rows.length).map(([tag, rows]) => ({ tag, rows }))
  if (other.length) out.push({ tag: q ? 'Other matches (outside your tags)' : 'Fits none of your tags', rows: other })
  return out
})

// ---- tooltip ----
const tipOwner = {}
function tip (e: Event, r: Scored) {
  const hits = r.matched.map(id => r.weak.includes(id) ? `${id} (yours, not your minions')` : id)
  const parts = [
    r.name,
    r.stats.join('\n'),
    `Tags: ${r.tags.length ? r.tags.join(', ') : 'none'}`,
    hits.length ? `Suggested ${r.weight}: fits ${hits.join(', ')}.` : 'Fits none of your tags.',
    ...(edited(r.name) ? [`Your weight: ${weightOf(r)}.`] : []),
    isMust(r.name) ? 'Must have: every result has it. Right-click to undo.' : 'Right-click: must have it.',
    isOn(r.name) ? 'Click to leave it out of the search.' : 'Click to add it to the search.'
  ]
  showHelp(tipOwner, e.currentTarget as HTMLElement, parts.join('\n\n'), undefined, { lines: true })
}
function untip () { hideHelp(tipOwner) }
onBeforeUnmount(untip)

// ---- search ----
const ticked = computed(() => scoredAll.value.filter(r => isOn(r.name)).sort((a, b) => Number(isMust(b.name)) - Number(isMust(a.name)) || weightOf(b) - weightOf(a)))
const mustCount = computed(() => ticked.value.filter(r => isMust(r.name)).length)
const minSuggested = computed(() => suggestedMinWeight(ticked.value.map(weightOf)))
const minWeight = computed(() => config.minWeight ?? minSuggested.value)

function setMin (raw: string) { config.minWeight = raw.trim() === '' ? null : Math.max(0, Math.round(Number(raw) || 0)) }
function setMax (raw: string) { const v = Number(raw); config.maxDiv = raw.trim() === '' || !(v > 0) ? null : v }

const summary = computed(() => {
  const n = ticked.value.length
  if (!n) return 'Tick at least one notable to search.'
  const over = n > MAX_TRADE_FILTERS ? ` Only the top ${MAX_TRADE_FILTERS} go in: the trade site takes no more.` : ''
  const must = ticked.value.filter(r => isMust(r.name)).map(r => r.name)
  const has = must.length ? `Jewels with ${must.join(' and ')}` : 'Jewels'
  if (config.mode === 'count') {
    const need = Math.min(config.need, n)
    const left = Math.min(Math.max(0, need - must.length), n - must.length)
    if (must.length) return left > 0 ? `${has}, and ${left} more of the other ${n - must.length}.${over}` : `${has}.${over}`
    return `Jewels with at least ${need} of these ${n} notables.${over}`
  }
  return `${has}${must.length ? ',' : ''} whose ticked notables add up to ${minWeight.value} or more, out of ${n}.${over}`
})

function statId (name: string): string | null {
  const s = STAT_BY_REF_V2(`1 Added Passive Skill is ${name}`)
  if (!s || !('trade' in s)) return null
  return s.trade.ids.explicit?.[0] ?? null
}

// The trade site link for what's ticked, or '' (and a note why) when there's none.
function searchLink (quiet = false): string {
  const say = (text: string) => { if (!quiet) toast(text, { anchor: panel.value?.el }) }
  const league = leagues.selectedId.value
  if (!league) { say('Pick a league in the settings first'); return '' }
  const picksForTrade = ticked.value.flatMap(r => { const id = statId(r.name); return id ? [{ statId: id, weight: weightOf(r), must: isMust(r.name) }] : [] })
  if (!picksForTrade.length) { say('Tick at least one notable first'); return '' }
  const q = megaloQuery(picksForTrade, { mode: config.mode, need: Math.min(config.need, picksForTrade.length), minWeight: minWeight.value, maxDiv: config.maxDiv })
  // The international site takes English names, a regional one its own.
  if (poeWebApi() !== 'www.pathofexile.com') {
    q.name = ITEM_BY_REF('UNIQUE', MEGALO_NAME)?.[0]?.name ?? MEGALO_NAME
    q.type = ITEM_BY_REF('ITEM', MEGALO_BASE)?.[0]?.name ?? MEGALO_BASE
  }
  // The same listings as the price check.
  const full = { ...q, status: priceCheckTradeStatus() }
  return tradeUrl(league, full, getTradeEndpoint())
}

function search () {
  const link = searchLink()
  if (link) window.open(link)
}

// "Megalomaniac: Feasting Fiends, Renewal +3 (2 of 5)" for the save box.
function saveName (): string {
  const names = ticked.value.map(r => r.name)
  const head = names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : '')
  const rule = config.mode === 'count' ? `${Math.min(config.need, names.length)} of ${names.length}` : `weight ${minWeight.value}+`
  return `Megalomaniac: ${head} (${rule})`
}

const sourceLine = computed(() => source.value.label)
</script>

<style module>
.wrap { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; font-size: var(--w-fs-sm); }
.row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.sec { display: grid; gap: 5px; }
.head { display: flex; align-items: center; gap: 6px; color: var(--w-label); border-bottom: 1px solid var(--w-line); padding-bottom: 2px; }
.end { margin-left: auto; }
.dim { color: var(--w-dim); }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.dot { color: var(--w-gold-hi); margin-left: 2px; }
.main { color: var(--w-gold-hi); font-size: 0.85em; margin-left: 4px; }
.n { color: var(--w-gold); margin-left: 4px; font-size: 0.9em; }
.browse { display: grid; gap: 6px; padding: 6px; background: var(--w-well); border: 1px solid var(--w-well-line); }
.tgroup, .ngroup { display: grid; grid-template-columns: 8.5rem minmax(0, 1fr); gap: 8px; align-items: start; }
.glabel { color: var(--w-dim); font-size: 0.9em; padding-top: 2px; }
.nchip {
  display: inline-flex; align-items: center; gap: 4px; padding: 1px 4px 1px 7px; cursor: pointer;
  border: 1px solid var(--w-line); color: var(--w-dim); border-radius: var(--w-r-sm); background: none;
}
.nchip:hover, .nchip:focus-visible { color: var(--w-fg); outline: none; border-color: var(--w-line-strong); }
.nchip.on { color: var(--w-fg); border-color: var(--w-accent); background: var(--w-accent-soft); }
.nchip.must { border-color: var(--w-gold-hi); box-shadow: inset 0 0 0 1px var(--w-gold-hi); }
.lock { color: var(--w-gold-hi); font-size: 0.8em; }
.wt {
  width: 3.1em; background: transparent; border: 1px solid transparent; color: var(--w-gold-hi);
  font: inherit; font-variant-numeric: tabular-nums; text-align: right; padding: 0 2px;
  -moz-appearance: textfield;
}
.wt::-webkit-inner-spin-button, .wt::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.wt:hover, .wt:focus { border-color: var(--w-line-strong); background: var(--w-well); outline: none; }
.wt.edited { color: var(--w-r-magic); }
.reset { background: none; border: 0; padding: 0 2px; color: var(--w-r-magic); cursor: pointer; }
.more { justify-self: start; }
.foot { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; border-top: 1px solid var(--w-line); padding-top: 6px; }
.num {
  width: 4.5em; background: var(--w-well); border: 1px solid var(--w-well-line); color: var(--w-fg);
  font: inherit; font-variant-numeric: tabular-nums; padding: 1px 4px;
}
</style>
