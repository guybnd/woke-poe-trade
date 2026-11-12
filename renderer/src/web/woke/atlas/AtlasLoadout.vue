<template>
  <WPanel ref="panel" size-key="detail" :title="strategy.name || 'Untitled'" icon="map" width="23rem" max-height="80vh"
    :busy="!!treeUrl && !atlasData && !atlasDataError">
    <template #actions>
      <button class="w-icon-btn" :class="{ 'w-icon-btn--on': editing }" title="Edit the name, currency, map device and notes" @click="editing = !editing"><i class="fas fa-pen" /></button>
      <button class="w-icon-btn" :class="{ 'w-icon-btn--on': treeOpen }" :title="treeOpen ? 'Hide the tree' : 'Show the tree'" @click="emit('toggle-tree')"><i class="fas fa-project-diagram" /></button>
      <button class="w-icon-btn" :title="copied === 'code' ? 'Copied' : 'Copy a strategy code to share or back up'" @click="copyCode"><i :class="copied === 'code' ? 'fas fa-check' : 'fas fa-share-square'" /></button>
    </template>
    <template v-if="decodeError || (atlasDataError && !atlasData)" #banner>
      <WBanner>{{ decodeError ? `This atlas tree link can't be read: ${decodeError}` : `Atlas tree data didn't load: ${atlasDataError}` }}
        <template v-if="!decodeError" #actions><WButton size="sm" @click="emit('retry')">Retry</WButton></template>
      </WBanner>
    </template>

    <div class="flex flex-col gap-1 pb-2" style="padding-left: var(--w-pad); padding-right: var(--w-pad);">
      <template v-if="editing">
        <label :class="$style.heading">Name</label>
        <input :value="strategy.name" class="w-field" spellcheck="false" placeholder="Strategy name" @change="rename(($event.target as HTMLInputElement).value)">
      </template>

      <!-- Threads -->
      <div :class="$style.heading" class="flex items-center">
        <span>Threads per map</span>
        <span v-if="oneType" class="ml-auto normal-case tracking-normal w-dim" title="Unwavering Vision: one type, up to 10">One type, up to {{ cap }}</span>
      </div>
      <div :class="$style.slots">
        <div v-for="(t, i) in strategy.threads" :key="i" :class="$style.slot">
          <select :value="t.type" :class="$style.select" :title="`Thread type ${i + 1}`" @change="setType(i, ($event.target as HTMLSelectElement).value)">
            <option v-for="type in THREAD_TYPES" :key="type" :value="type" :disabled="type !== t.type && strategy.threads.some(o => o.type === type)">{{ type }}</option>
          </select>
          <div class="flex items-center gap-1">
            <button class="w-icon-btn" title="One fewer" :disabled="t.count <= 1" @click="setCount(i, t.count - 1)"><i class="fas fa-minus" /></button>
            <span class="w-num" :class="t.count > cap ? 'w-down' : ''">{{ t.count }}</span>
            <button class="w-icon-btn" title="One more" :disabled="t.count >= cap" @click="setCount(i, t.count + 1)"><i class="fas fa-plus" /></button>
          </div>
          <span class="w-num w-dim text-xs" :title="pricedThreads[i]?.item ? pricedThreads[i].item!.name : 'No price yet: poe.ninja lists Threads once the league has some'">
            {{ pricedThreads[i]?.item ? fmt(pricedThreads[i].item!.chaos * t.count) : 'no price' }}
          </span>
          <button class="w-icon-btn" :class="$style.drop" title="Take this slot out" @click="removeThread(i)"><i class="fas fa-times" /></button>
        </div>
        <button v-if="strategy.threads.length < slotCount" type="button" :class="[$style.slot, $style.empty]" class="w-focusable" @click="addThread">
          <i class="fas fa-plus" /> Add a Thread
        </button>
        <div v-else-if="oneType && strategy.threads.length >= 1" :class="[$style.slot, $style.empty]" title="Unwavering Vision allows one type">Locked by Unwavering Vision</div>
      </div>
      <div v-for="w in warnings" :key="w" class="text-xs w-down"><i class="fas fa-exclamation-triangle" /> {{ w }}</div>

      <!-- Currency per map -->
      <div :class="$style.heading" class="flex items-center">
        <span>Currency per map</span>
        <span v-if="mapCost != null" class="ml-auto normal-case tracking-normal w-accent">{{ fmt(mapCost) }} per map</span>
      </div>
      <textarea v-if="editing" :value="strategy.scarabs" rows="4" :class="$style.textarea" placeholder="One per line: 1x Orb of Alchemy, 1x Vaal Orb…"
        @change="strategy.scarabs = ($event.target as HTMLTextAreaElement).value" />
      <template v-else-if="pricedLines.length">
        <div v-for="(p, i) in pricedLines" :key="i" v-item-tip="p.item ?? { name: p.name }" class="flex items-center gap-2">
          <WIcon :src="p.item ? ninjaIcon(p.item.type, p.item.name) ?? undefined : undefined" fallback="fas fa-coins" />
          <span class="w-num w-dim">{{ p.qty }}×</span>
          <span class="w-trunc" :title="p.item ? undefined : 'No poe.ninja match'">{{ p.item?.name ?? p.name }}</span>
          <span class="ml-auto w-num w-dim">{{ p.item ? fmt(p.item.chaos * p.qty) : '?' }}</span>
        </div>
      </template>
      <button v-else type="button" class="w-faint text-left hover:underline" @click="editing = true">None yet. Add what each map takes.</button>
      <WButton v-if="farmingWidget && (pricedLines.some(p => p.item) || pricedThreads.some(p => p.item))" size="sm" class="self-start" @click="useInFarming">
        {{ usedInFarming ? 'Set in Farming' : 'Use in Farming' }}
      </WButton>
      <div v-if="earn" class="w-dim text-xs">
        Your results: <span class="w-num" :class="earn.perHour >= 0 ? 'w-up' : 'w-down'">{{ fmt(earn.perHour) }}/h</span>,
        <span class="w-num">{{ fmt(earn.perMap) }}</span>/map over {{ earn.maps }} maps
      </div>

      <!-- Regexes, kept in the Regex library -->
      <div :class="$style.heading" class="flex items-center">
        <span>Regex</span>
        <button v-if="libraryOn" class="ml-auto w-icon-btn" title="Add a regex" @click="adding = !adding"><i class="fas fa-plus" /></button>
      </div>
      <div v-for="r in regexes" :key="r.id" :class="$style.regex" @contextmenu="regexMenu($event, r)">
        <span class="w-trunc" :title="r.name">{{ r.name || 'Regex' }}</span>
        <code class="w-trunc" :class="$style.code" :title="r.text">{{ r.text }}</code>
        <button class="w-icon-btn" :title="copied === r.text ? 'Copied' : 'Copy'" @click="copy(r.text)"><i :class="copied === r.text ? 'fas fa-check' : 'far fa-copy'" /></button>
        <button class="w-icon-btn" title="Type it into the in-game search box" @click="emit('search', r.text)"><i class="fas fa-search" /></button>
      </div>
      <div v-if="strategy.regex" :class="$style.regex">
        <span class="w-trunc">Map mods</span>
        <code class="w-trunc" :class="$style.code" :title="strategy.regex">{{ strategy.regex }}</code>
        <button class="w-icon-btn" title="Copy" @click="copy(strategy.regex)"><i :class="copied === strategy.regex ? 'fas fa-check' : 'far fa-copy'" /></button>
        <button class="w-icon-btn" title="Type it into the in-game search box" @click="emit('search', strategy.regex)"><i class="fas fa-search" /></button>
      </div>
      <div v-if="adding" class="flex flex-col gap-1">
        <input v-model="newName" data-new-regex class="w-field" placeholder="Name, e.g. Map mods" spellcheck="false" @keydown.esc="adding = false">
        <div class="flex gap-1">
          <input v-model="newText" class="w-field grow" :class="$style.mono" placeholder='"!ref|mana|ele"' spellcheck="false" @keydown.enter="saveRegex" @keydown.esc="adding = false">
          <WButton size="sm" variant="primary" :disabled="!newText.trim()" @click="saveRegex">Add</WButton>
        </div>
      </div>
      <div v-if="!libraryOn && !strategy.regex" class="w-faint text-xs">Turn on the Regex library in Settings → Modules to keep regexes here.</div>
      <div v-else-if="!regexes.length && !strategy.regex && !adding" class="w-faint text-xs">None yet.</div>
      <div v-if="libraryOn" class="w-faint text-xs">In the Regex library under {{ folderLabel }}</div>

      <!-- Map device and notes -->
      <template v-if="editing || strategy.device.trim()">
        <div :class="$style.heading">Map device and crafting</div>
        <textarea v-if="editing" :value="strategy.device" rows="3" :class="$style.textarea" placeholder="Scour, alch, reroll on the regex…"
          @change="strategy.device = ($event.target as HTMLTextAreaElement).value" />
        <div v-else class="whitespace-pre-wrap">{{ strategy.device }}</div>
      </template>
      <template v-if="editing || strategy.notes.trim()">
        <div :class="$style.heading">Notes</div>
        <textarea v-if="editing" :value="strategy.notes" rows="3" :class="$style.textarea" placeholder="Notes"
          @change="strategy.notes = ($event.target as HTMLTextAreaElement).value" />
        <div v-else class="whitespace-pre-wrap w-dim">{{ strategy.notes }}</div>
      </template>

      <!-- The tree, read -->
      <div :class="$style.heading" class="flex items-center">
        <span>Tree</span>
        <span v-if="view" class="ml-auto normal-case tracking-normal w-dim w-num">{{ view.total }} points · {{ notableCount }} notables</span>
      </div>
      <div v-if="!treeUrl" class="w-faint">
        Nothing taken yet. <button type="button" class="w-accent hover:underline" @click="emit('show-tree')">Open the tree</button> and click passives, or paste a link:
      </div>
      <input v-if="editing || !treeUrl" :value="strategy.treeUrl" class="w-field" spellcheck="false" placeholder="pathofexile.com atlas tree link"
        @change="pasteLink(($event.target as HTMLInputElement).value)">
      <WSkeleton v-else-if="!atlasData && !decodeError && !atlasDataError" :rows="3" :value="false" />
      <template v-else-if="view">
        <div v-for="g in view.groups" :key="g.mechanic" :class="$style.group">
          <div class="w-accent text-xs flex items-center gap-1"><WIcon :mechanic="g.mechanic.toLowerCase()" fallback="fas fa-circle" />{{ g.mechanic }} <span class="w-faint w-num">{{ g.nodes.length }}</span></div>
          <div class="flex flex-wrap gap-x-2">
            <span v-for="n in g.nodes" :key="n.id" :title="nodeText(n)" :class="n.kind === 'keystone' ? 'font-semibold' : ''">{{ n.name }}<span v-if="pickOf(n.id)" class="w-dim"> ({{ pickOf(n.id) }})</span></span>
          </div>
        </div>
        <div v-if="view.unknown" class="w-faint text-xs">{{ view.unknown }} not in the tree data (an old link, or old data)</div>
      </template>

      <template v-if="otherStrategies.length && view">
        <div :class="$style.heading">Compare with</div>
        <select v-model="compareId" :class="$style.select">
          <option :value="null">Choose a strategy…</option>
          <option v-for="s in otherStrategies" :key="s.id" :value="s.id">{{ s.name || 'Untitled' }}</option>
        </select>
        <div v-if="compareError" class="w-down">{{ compareError }}</div>
        <template v-else-if="diff">
          <div v-if="diff.added.length"><span class="w-up">Also take:</span> {{ diff.added.join(', ') }}</div>
          <div v-if="diff.removed.length"><span class="w-down">Refund:</span> {{ diff.removed.join(', ') }}</div>
          <div v-if="!diff.added.length && !diff.removed.length" class="w-faint">Same notables.</div>
        </template>
      </template>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
// The strategy on the right of the Atlas window: what each map takes (Threads,
// currency), its regexes (kept in the Regex library), notes, and the tree read
// as notables by mechanic.
import { computed, nextTick, shallowRef, watch } from 'vue'
import { AppConfig } from '@/web/Config'
import { WButton, WPanel, WBanner, WIcon, WSkeleton, openMenu, toast, useCopy, vItemTip } from '../ui'
import { ninjaIcon } from '../ui/game-icons'
import { formatChaos } from '../ui/format'
import { usePriceIndex } from '../market/price-index'
import { FARMING_TYPE, strategyStats, withScarabCosts } from '../farming/farming'
import type { FarmingWidget } from '../farming/farming'
import { SAVE_MESSAGE } from '../regex-library/save'
import { addRegex, libraryOn as isLibraryOn, regexesIn, removeRegex } from '../regex-library/folders'
import { refileRegexes } from './strategy-ops'
import type { RegexEntry } from '../regex-library/widget'
import { decodeTree, diffTrees, overview } from './tree'
import type { AtlasNode, DecodedTree } from './tree'
import type { AtlasTreeModel } from './atlas-tree'
import { hasOneTypeKeystone, parseCostLines, priceLines, priceThreads, threadCap, treeWarnings } from './loadout'
import { MAX_THREAD_SLOTS, THREAD_TYPES, dropDraft, regexFolderOf } from './widget'
import { strategyCode } from './strategy-code'
import type { AtlasStrategy, AtlasWidget } from './widget'

const props = defineProps<{
  config: AtlasWidget
  strategy: AtlasStrategy
  atlasData: Map<number, AtlasNode> | null
  atlasTree: AtlasTreeModel | null
  atlasDataError: string
  treeOpen: boolean
  // The tree being worked on, saved or not.
  treeUrl: string
}>()
const emit = defineEmits<{
  (e: 'toggle-tree' | 'show-tree' | 'retry'): void
  (e: 'search', text: string): void
}>()

const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)
const editing = shallowRef(false)
const { copied, copy } = useCopy()
const prices = usePriceIndex()
function fmt (chaos: number) { return formatChaos(chaos, prices.snapshot.value?.divine ?? null) }

watch(() => props.strategy.id, () => { editing.value = false; adding.value = false; compareId.value = null })

// ---- the tree link ----

function tryDecode (url: string): { tree: DecodedTree | null, error: string } {
  try {
    return { tree: decodeTree(url), error: '' }
  } catch (err) {
    return { tree: null, error: (err as Error).message }
  }
}
const decoded = computed(() => props.treeUrl ? tryDecode(props.treeUrl) : null)
const decodeError = computed(() => decoded.value?.error ?? '')
const taken = computed(() => new Set(decoded.value?.tree?.nodes ?? []))
const view = computed(() => {
  const t = decoded.value?.tree
  if (!t || !props.atlasData) return null
  // The start is free, not a point.
  const start = props.atlasTree?.start
  return overview(start != null ? { ...t, nodes: t.nodes.filter(id => id !== start) } : t, props.atlasData)
})
const notableCount = computed(() => view.value?.groups.reduce((n, g) => n + g.nodes.length, 0) ?? 0)
const picks = computed(() => new Map((decoded.value?.tree?.masteries ?? []).map(m => [m.node, m.effect])))
function pickOf (id: number): string {
  const effect = picks.value.get(id)
  const choices = props.atlasTree?.variants.get(id)
  if (!choices) return ''
  return (choices.find(c => c.effect === effect) ?? choices[0]).text
}
function nodeText (n: AtlasNode): string {
  const pick = pickOf(n.id)
  return n.stats.map(s => pick ? `${s}: ${pick}` : s).join('\n')
}

// ---- Threads ----

const oneType = computed(() => hasOneTypeKeystone(props.atlasTree, taken.value))
const cap = computed(() => threadCap(oneType.value))
const slotCount = computed(() => oneType.value ? 1 : MAX_THREAD_SLOTS)
const warnings = computed(() => treeWarnings(props.atlasTree, taken.value, props.strategy.threads))

function addThread () {
  const used = new Set(props.strategy.threads.map(t => t.type))
  const type = THREAD_TYPES.find(t => !used.has(t))
  if (!type) return
  props.strategy.threads = [...props.strategy.threads, { type, count: Math.min(cap.value, 8) }]
}
function setType (i: number, type: string) {
  props.strategy.threads = props.strategy.threads.map((t, j) => j === i ? { ...t, type } : t)
}
function setCount (i: number, count: number) {
  props.strategy.threads = props.strategy.threads.map((t, j) => j === i ? { ...t, count: Math.max(1, Math.min(cap.value, count)) } : t)
}
function removeThread (i: number) {
  props.strategy.threads = props.strategy.threads.filter((_, j) => j !== i)
}

// ---- prices ----

const items = computed(() => prices.snapshot.value?.items ?? null)
const pricedLines = computed(() => items.value ? priceLines(parseCostLines(props.strategy.scarabs), items.value) : parseCostLines(props.strategy.scarabs).map(l => ({ ...l, item: null })))
const pricedThreads = computed(() => items.value ? priceThreads(props.strategy.threads, items.value) : props.strategy.threads.map(t => ({ ...t, item: null })))
const mapCost = computed(() => {
  const parts = [
    ...pricedLines.value.filter(p => p.item).map(p => p.item!.chaos * p.qty),
    ...pricedThreads.value.filter(p => p.item).map(p => p.item!.chaos * p.count)
  ]
  return parts.length ? parts.reduce((a, b) => a + b, 0) : null
})

const farmingWidget = computed(() => AppConfig<FarmingWidget>(FARMING_TYPE))
const usedInFarming = shallowRef(false)
function useInFarming () {
  const farm = farmingWidget.value
  if (!farm) return
  farm.strategy = props.strategy.name
  const lines = [
    ...pricedLines.value.filter(p => p.item).map(p => ({ type: p.item!.type, name: p.item!.name, variant: p.item!.variant, qty: p.qty })),
    ...pricedThreads.value.filter(p => p.item).map(p => ({ type: p.item!.type, name: p.item!.name, variant: p.item!.variant, qty: p.count }))
  ]
  farm.costs = withScarabCosts(farm.costs, lines)
  usedInFarming.value = true
  setTimeout(() => { usedInFarming.value = false }, 1500)
}
const earn = computed(() => {
  const history = AppConfig().widgets.filter(w => w.wmType === FARMING_TYPE).flatMap(w => (w as FarmingWidget).history ?? [])
  return strategyStats(history).find(r => r.strategy === props.strategy.name) ?? null
})

// ---- regexes ----

const libraryOn = computed(() => isLibraryOn())
const folder = computed(() => regexFolderOf(props.strategy))
const folderLabel = computed(() => folder.value.split('/').join(' › '))
// Read through the config, so an edit in the library shows here at once.
const regexes = computed<RegexEntry[]>(() => regexesIn(folder.value))
const adding = shallowRef(false)
const newName = shallowRef('')
const newText = shallowRef('')
watch(adding, (on) => { if (on) nextTick(() => panel.value?.el?.querySelector<HTMLInputElement>('[data-new-regex]')?.focus()) })

function saveRegex () {
  const text = newText.value.trim()
  if (!text) return
  const res = addRegex(folder.value, newName.value.trim() || 'Regex', text)
  if (res !== 'saved') toast(SAVE_MESSAGE[res], { anchor: panel.value?.el })
  newName.value = ''
  newText.value = ''
  adding.value = false
}

function regexMenu (e: MouseEvent, r: RegexEntry) {
  openMenu(e, [
    { label: 'Copy', icon: 'far fa-copy', action: () => { copy(r.text).catch(() => {}) } },
    { label: 'Search with it', icon: 'fas fa-search', action: () => emit('search', r.text) },
    { separator: true },
    {
      label: 'Remove',
      icon: 'fas fa-trash',
      danger: true,
      action: () => {
        const undo = removeRegex(r.id, folder.value)
        toast(`Removed "${r.name || r.text}" from the Regex library`, { anchor: panel.value?.el, undo })
      }
    }
  ])
}

// A rename takes the strategy's regex folder with it.
// A link pasted here replaces the tree, and any unsaved edit of it.
function pasteLink (text: string) {
  props.strategy.treeUrl = text.trim()
  dropDraft(props.config, props.strategy)
}

function rename (name: string) {
  const next = name.trim()
  if (next === props.strategy.name) return
  props.strategy.name = next
  refileRegexes(props.strategy, props.config.strategies)
}

function copyCode () {
  const regexesOut = regexes.value.map(r => ({ name: r.name, text: r.text }))
  // The tree on screen, saved or not.
  copy(strategyCode([{ ...props.strategy, treeUrl: props.treeUrl, regexes: regexesOut }]), 'code').catch(() => {})
}

// ---- compare ----

const compareId = shallowRef<number | null>(null)
const otherStrategies = computed(() => props.config.strategies.filter(s => s.id !== props.strategy.id && s.treeUrl))
const compare = computed(() => {
  const other = props.config.strategies.find(s => s.id === compareId.value)
  return other ? tryDecode(other.treeUrl) : null
})
const compareError = computed(() => compare.value?.error ?? '')
const diff = computed(() => {
  const a = decoded.value?.tree
  const b = compare.value?.tree
  const data = props.atlasData
  if (!a || !b || !data) return null
  const d = diffTrees(a, b)
  const names = (ids: number[]) => ids
    .map(id => data.get(id))
    .filter(n => n && (n.kind === 'notable' || n.kind === 'keystone'))
    .map(n => n!.name)
    .sort()
  return { added: names(d.added), removed: names(d.removed) }
})
</script>

<style module>
.heading {
  padding: 8px 0 2px;
  font-size: var(--w-fs-caps);
  text-transform: var(--w-caps-case);
  letter-spacing: 0.08em;
  color: var(--w-faint);
  font-family: var(--w-caps-face);
}
.slots {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}
.slot {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  background: var(--w-panel-2);
  text-align: center;
}
.empty {
  justify-content: center;
  border-style: dashed;
  color: var(--w-faint);
  font-size: var(--w-fs-sm);
}
button.empty:hover { color: var(--w-fg); }
.drop {
  position: absolute;
  top: 0;
  right: 0;
  visibility: hidden;
}
.slot:hover .drop, .slot:focus-within .drop { visibility: visible; }
.select {
  width: 100%;
  height: 24px;
  padding: 0 4px;
  font-size: var(--w-fs-md);
  color: var(--w-fg);
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
}
.regex {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr) auto auto;
  align-items: center;
  gap: 4px;
}
.code, .mono { font-family: var(--w-num); font-size: var(--w-fs-sm); }
.code { color: var(--w-dim); }
.group {
  padding: 3px 0;
  border-bottom: 1px solid var(--w-line-soft);
}
.textarea {
  width: 100%;
  padding: 4px 8px;
  font-size: var(--w-fs-md);
  color: var(--w-fg);
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  resize: vertical;
}
</style>
