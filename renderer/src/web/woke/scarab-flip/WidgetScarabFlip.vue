<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- The best flip on hover, so a quick check doesn't open the panel. -->
    <DockItem :menu="dockMenu" id="scarab-flip" title="Flips" :show="dockShow" :wm-id="config.wmId" :game-click="runOutlines">
      <template #card>
        <div v-if="best" class="flex flex-col gap-0.5" style="padding: 2px var(--w-pad) 6px;">
          <span class="w-num">Best supply: <span v-item-tip="{ name: best.item, type: best.family.ninjaType }">{{ shortName(best.name) }}</span></span>
          <span class="w-dim w-num">{{ best.family.label }}, {{ best.method.label.toLowerCase() }}, +{{ fmt(best.profitEach) }} each<template v-if="best.profitPerDay != null">, up to {{ fmt(best.profitPerDay) }} a day</template></span>
        </div>
        <div v-else class="w-dim" style="padding: 2px var(--w-pad) 6px;">Nothing worth flipping right now</div>
        <div v-if="clickHint" class="w-dim" style="padding: 0 var(--w-pad) 6px;">Click to outline flips in the open stash tab</div>
      </template>
    </DockItem>
    <WPanel :title="config.wmTitle || 'Flips'" :icon="panelIcon" :updated="snapshot?.ts ?? null" :fresh-min="40" :stale-min="180" width="34rem">
      <template #tabs>
        <WTabs :model-value="family.id" :options="families.map(f => ({ value: f.id, label: f.label }))"
          @update:model-value="config.family = $event" />
      </template>
      <template #toolbar>
        <WSegmented v-if="family.methods.length > 1" :model-value="method.id"
          :options="family.methods.map(m => ({ value: m.id, label: m.label }))"
          @update:model-value="pickMethod($event)" />
        <WSegmented v-if="views.length > 1" :model-value="view" :options="views"
          @update:model-value="pickView($event)" />
      </template>
      <template v-if="!snapshot" #meta>
        <span>Waiting for poe.ninja prices.</span>
      </template>

      <div v-if="flip?.kind === 'pool' || flip?.kind === 'upgrade'" :class="$style.verdict" class="w-num w-verdict">
        <b>{{ verdict }}</b>
        <span class="w-dim">{{ verdictSub }}</span>
      </div>
      <div v-if="warning" :class="[$style.note, $style.warning]">{{ warning }}</div>

      <WSkeleton v-if="!snapshot" :rows="8" />
      <WEmpty v-else-if="!flip" icon="fas fa-recycle">poe.ninja has no {{ family.noun }} prices yet.</WEmpty>
      <WEmpty v-else-if="flip.kind === 'no-pool'" icon="fas fa-recycle">poe.ninja has {{ family.noun }} prices, but none this method can use yet.</WEmpty>
      <WEmpty v-else-if="flip.kind === 'no-cost'" icon="fas fa-recycle">No {{ method.lifeforce }} Crystallised Lifeforce price yet, so the cost of a reroll is unknown.</WEmpty>

      <template v-else-if="view === 'buy'">
        <WEmpty v-if="!buy.length" icon="fas fa-recycle">No {{ family.noun }} is worth flipping this way right now.</WEmpty>
        <template v-else>
          <div class="w-row w-row--head" :class="$style.buyGrid">
            <span v-for="c in buyColumns" :key="c.key" :class="c.key === 'item' ? '' : 'text-right'">
              <button type="button" :class="[$style.sortHead, { [$style.sorted]: sort.key === c.key }]" :title="c.title" :aria-label="sortLabel(c)" @click="pickSort(c.key)">
                <i v-if="sort.key === c.key && c.key !== 'item'" :class="sortArrow" aria-hidden="true" />
                {{ c.label }}
                <i v-if="sort.key === c.key && c.key === 'item'" :class="sortArrow" aria-hidden="true" />
              </button>
            </span>
          </div>
          <div v-for="r in buy" :key="r.name" class="w-row" :class="$style.buyGrid" @contextmenu="rowMenu($event, itemName(r))">
            <FlipName :name="r.name" :item="itemName(r)" :rare-cheap="'rareCheap' in r && r.rareCheap" :source="'weightSource' in r ? r.weightSource : undefined" />
            <WPrice :chaos="r.chaos" :divine="snapshot?.divine" class="text-right" />
            <span class="text-right w-up w-num">+{{ amount(r.profitEach) }}c</span>
            <span v-if="hasVolume" class="text-right">{{ supplyLevel(r.supplyPerDay) ?? '' }}</span>
          </div>
        </template>
      </template>

      <template v-else-if="view === 'odds' && odds">
        <div :class="$style.note" class="w-num">
          <template v-if="odds.medianResult != null">Half return {{ fmt(odds.medianResult) }} or less. </template>
          Average sale before rerolls: {{ fmt(odds.saleValue) }}.
        </div>
        <div :class="$style.legend">
          <span><i :class="[$style.key, $style.chance]" />Chance of this result</span>
          <span><i :class="[$style.key, $style.value]" />Share of the value</span>
        </div>
        <div v-for="b in odds.buckets" :key="b.label" :class="$style.bucket" class="w-num">
          <span>{{ b.label }}</span>
          <div :class="$style.track">
            <div :class="[$style.fill, $style.chance]" :style="{ width: `${b.chance / oddsScale * 100}%` }" />
            <div :class="[$style.fill, $style.value]" :style="{ width: `${b.valueShare / oddsScale * 100}%` }" />
          </div>
          <span class="w-dim text-right">{{ pct(b.chance) }}</span>
          <span class="text-right" :style="{ color: 'var(--w-accent)' }">{{ pct(b.valueShare) }}</span>
        </div>
        <div class="w-group-label">Biggest sources of value</div>
        <div v-for="s in odds.sources" :key="s.name" class="w-row" :class="$style.sourceGrid" @contextmenu="rowMenu($event, s.name)">
          <span v-item-tip="{ name: s.name, type: family.ninjaType }" class="w-trunc">{{ shortName(s.name) }}</span>
          <WPrice :chaos="s.chaos" :divine="snapshot?.divine" class="text-right" />
          <span class="text-right w-num w-dim">{{ pct(s.valueShare) }}</span>
        </div>
        <div v-if="odds.jackpotOneIn && pool" :class="$style.note" class="w-num">
          A {{ JACKPOT_CHAOS }}c+ result comes about 1 in {{ Math.round(odds.jackpotOneIn) }} {{ flipWord }}s. Without those, a {{ flipWord }} sells for {{ fmt(odds.withoutJackpot) }}, so {{ fmt((odds.withoutJackpot - pool.recipe.cost) / pool.recipe.inputs) }} each is the safer buy line.
        </div>
      </template>

      <template v-else-if="pool">
        <div :class="$style.note" class="w-num">
          Rare but cheap, so they may rise later. Hold them rather than flipping them.
          <WInfo :text="`These drop under ${pct(family.rareShare ?? 0)} of the time but cost less than a third of a typical rare ${family.noun}${pool.typicalRare != null ? ` (${fmt(pool.typicalRare)})` : ''}.`" />
        </div>
        <WEmpty v-if="!rareCheap.length" icon="fas fa-star">No exceptionally rare {{ family.noun }} is cheap right now.</WEmpty>
        <template v-else>
          <div class="w-row w-row--head" :class="$style.rareGrid">
            <span>{{ capitalize(family.noun) }}</span><span class="text-right">Price</span><span class="text-right" title="Chance per flip or drop, from the weights">Drops</span>
            <span v-if="hasVolume" class="text-right" :title="SUPPLY_TITLE">Supply</span>
          </div>
          <div v-for="r in rareCheap" :key="r.name" class="w-row" :class="$style.rareGrid" @contextmenu="rowMenu($event, r.name)">
            <FlipName :name="r.name" :item="r.name" :rare-cheap="r.rareCheap" :source="r.weightSource" />
            <WPrice :chaos="r.chaos" :divine="snapshot?.divine" class="text-right" />
            <span class="text-right w-dim w-num">1 in {{ Math.round(1 / r.share).toLocaleString('en-US') }}</span>
            <span v-if="hasVolume" class="text-right">{{ supplyLevel(r.supplyPerDay) ?? '' }}</span>
          </div>
        </template>
      </template>

      <template #footer>
        <span>{{ footerText }}</span> <button v-if="pool" type="button" :class="$style.weightsLink" @click="openWeights">Weights</button> <WInfo :text="footerTitle" />
      </template>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { SCARAB_FLIP_TYPE } from './widget'

export default {
  widget: {
    type: SCARAB_FLIP_TYPE,
    instances: 'multi',
    trNameKey: 'Flips'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { computed, defineComponent, h, inject, onUnmounted, shallowRef, watch } from 'vue'
import type { PropType } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { Host, MainProcess } from '@/web/background/IPC'
import { useLeagues } from '@/web/background/Leagues'
import { WInfo, WPanel, WTabs, WSegmented, WPrice, WEmpty, WSkeleton, toast, vItemTip } from '../ui'
import { openItemMenu } from '../ui/tooltip/item-menu'
import { copyText } from '../ui/copy'
import { formatAmount, formatChaos } from '../ui/format'
import { gameIcon, moduleIcon } from '../ui/game-icons'
import { useMarketCollector } from '../market/collector'
import { latestSnapshots } from '../market/db'
import type { Snapshot } from '../market/types'
import DockItem from '../dock/DockItem.vue'
import { dockConfig, dockIconEl, openSettingsPage } from '../dock/dock'
import type { DockMenuAction } from '../dock/dock'
import { useZone } from '../shared/zone'
import { DEFAULT_FLIP_SORT, JACKPOT_CHAOS, SUPPLY_HIGH, SUPPLY_MEDIUM, buyList, firstSortDir, isTraded, flipOdds, parseExchange, rareCheapList, sortFlips, supplyLevel } from './calc'
import type { FlipRow, FlipSortKey, UpgradeRow, WeightSource } from './calc'
import { DEFAULT_LIFEFORCE_PER_ITEM, FAMILIES, bestFlip, familyById, parseLifeforce, priceFlip, pricedFamilies, shortName, shownFamily, unpricedShare } from './families'
import type { Exchanges, FlipMethodId } from './families'
import { stashHotkeyTarget } from './widget'
import type { ScarabFlipWidget } from './widget'
import { hostRequest } from '../shared/host'
import { buildMarks, clearStashMarks, justCleared, stashClearCount, stashMarks } from './stash-marks'
import type { StashRead } from './stash-marks'

const props = defineProps<{
  config: ScarabFlipWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Flips'
  props.config.anchor = popupAnchor()
  props.config.tab = 'buy'
  props.config.sellDiscount = 0
  props.config.reroll = false
  props.config.hideUntraded = true
  wm.show(props.config.wmId)
}
// Placed back when the panel only did scarabs.
if (props.config.wmTitle === 'Scarab flip') props.config.wmTitle = 'Flips'

const collector = useMarketCollector({ poll: true })
// Town and hideout only, like the other economy icons: in a map it would sit
// on screen and keep a hover timer running.
const zone = useZone()
const leagues = useLeagues()
const league = computed(() => leagues.selectedId.value)

const snapshot = shallowRef<Snapshot | null>(null)
const exchanges = shallowRef<Exchanges>(new Map())

// A slow read for the previous league must not land after a newer one.
let loadSeq = 0
async function load () {
  const seq = ++loadSeq
  const id = league.value
  if (!id) { snapshot.value = null; return }
  try {
    const [snap] = await latestSnapshots(id, 1)
    if (seq === loadSeq) snapshot.value = snap ?? null
  } catch {
    if (seq === loadSeq) snapshot.value = null
  }
  loadExchanges(id)
}

// The dense prices have no volume, so each family's exchange feed is fetched
// alongside them, and tracked by itself: a failed feed only costs that family
// its volume, and only it is asked for again, after a longer wait than a good
// one gets if it might be rate limited.
const EXCHANGE_MAX_AGE_MS = 20 * 60 * 1000
const EXCHANGE_RETRY_MS = 5 * 60 * 1000
const EXCHANGE_TYPES = [...new Set(FAMILIES.map(f => f.ninjaType))]
let feedLeague: string | undefined
const nextFetch = new Map<string, number>()
const fetching = new Set<string>()

function loadExchanges (id: string) {
  if (feedLeague !== id) {
    feedLeague = id
    nextFetch.clear()
    fetching.clear()
    exchanges.value = new Map()
  }
  const now = Date.now()
  for (const type of EXCHANGE_TYPES) {
    if (fetching.has(type) || now < (nextFetch.get(type) ?? 0)) continue
    fetching.add(type)
    fetchExchange(id, type).catch(() => null).then(parsed => {
      // The league changed while this was in flight: it isn't this league's data.
      if (feedLeague !== id) return
      fetching.delete(type)
      nextFetch.set(type, Date.now() + (parsed ? EXCHANGE_MAX_AGE_MS : EXCHANGE_RETRY_MS))
      // A failure keeps the last good feed; a stale price beats no volume.
      const previous = exchanges.value.get(type) ?? null
      exchanges.value = new Map(exchanges.value).set(type, parsed ?? previous)
    })
  }
}

async function fetchExchange (id: string, type: string) {
  const response = await Host.proxy(`poe.ninja/poe1/api/economy/exchange/current/overview?league=${encodeURIComponent(id)}&type=${type}`)
  return response.ok ? parseExchange(await response.json()) : null
}
watch([league, collector.revision], load, { immediate: true })

const dockShow = computed(() => Boolean(snapshot.value) && (zone.kind === 'town' || zone.kind === 'hideout'))
const families = computed(() => pricedFamilies(snapshot.value?.items))
const family = computed(() => shownFamily(props.config.family, families.value))
const method = computed(() => {
  const picked = props.config.methods?.[family.value.id]
  return family.value.methods.find(m => m.id === picked) ?? family.value.methods[0]
})
function pickMethod (id: string) {
  props.config.methods = { ...props.config.methods, [family.value.id]: id as FlipMethodId }
}
function pickView (id: string) {
  props.config.tab = id as ScarabFlipWidget['tab']
}
const lifeforcePerItem = computed(() => parseLifeforce(props.config.lifeforcePerItem ?? '') ?? DEFAULT_LIFEFORCE_PER_ITEM)
const options = computed(() => ({ sellDiscount: props.config.sellDiscount / 100, reroll: props.config.reroll }))

const flip = computed(() => snapshot.value
  ? priceFlip(family.value, method.value, snapshot.value.items, exchanges.value, options.value, lifeforcePerItem.value, props.config.weights)
  : null)
const pool = computed(() => flip.value?.kind === 'pool' ? flip.value.model : null)
const rows = computed<Array<FlipRow | UpgradeRow>>(() => {
  if (flip.value?.kind === 'pool') return flip.value.model.rows
  return flip.value?.kind === 'upgrade' ? flip.value.rows : []
})
// Only for the icon, which is off in maps, so maps don't pay for the ranking.
const best = computed(() => snapshot.value && dockShow.value
  ? bestFlip(snapshot.value.items, exchanges.value, options.value, lifeforcePerItem.value, props.config.weights)
  : null)

// Odds and rarity need weights, so a known-result flip only has its list.
const views = computed(() => {
  if (!pool.value) return []
  const list = [{ value: 'buy', label: 'Buy list' }, { value: 'odds', label: 'Odds' }]
  if (family.value.rareShare != null) list.push({ value: 'rare', label: `Rare & cheap ${rareCheap.value.length}` })
  return list
})
const view = computed(() => views.value.some(v => v.value === props.config.tab) ? props.config.tab : 'buy')

const SUPPLY_TITLE = `How much of this item trades a day on the in-game currency exchange, from poe.ninja: High is ${SUPPLY_HIGH} or more, Medium ${SUPPLY_MEDIUM} or more. Trade site sales aren't counted.`
const supplyTitle = computed(() => flip.value?.kind === 'upgrade'
  ? `${SUPPLY_TITLE} A recipe needs buyers for the next tier too, so the thinner side counts.`
  : SUPPLY_TITLE)
const panelIcon = moduleIcon('scarab-flip').art ?? undefined
const hasVolume = computed(() => rows.value.some(r => r.tradedChaos != null))
const SORT_KEYS: FlipSortKey[] = ['item', 'price', 'profit', 'supply']
// Saved configs can be edited by hand, and a tab with no volume has no Supply column.
const sort = computed(() => {
  const saved = props.config.sort
  if (!saved || !SORT_KEYS.includes(saved.key) || (saved.dir !== 'asc' && saved.dir !== 'desc')) return DEFAULT_FLIP_SORT
  return saved.key === 'supply' && !hasVolume.value ? DEFAULT_FLIP_SORT : saved
})
function pickSort (key: FlipSortKey) {
  const { key: current, dir } = sort.value
  props.config.sort = { key, dir: current !== key ? firstSortDir(key) : dir === 'asc' ? 'desc' : 'asc' }
}
const sortArrow = computed(() => sort.value.dir === 'asc' ? 'fas fa-caret-up' : 'fas fa-caret-down')
const buyColumns = computed(() => {
  const list: Array<{ key: FlipSortKey, label: string, title?: string }> = [
    { key: 'item', label: capitalize(family.value.noun) },
    { key: 'price', label: 'Price' },
    { key: 'profit', label: 'Profit each', title: profitTitle.value }
  ]
  if (hasVolume.value) list.push({ key: 'supply', label: 'Supply', title: supplyTitle.value })
  return list
})
function sortLabel (c: { key: FlipSortKey, label: string }) {
  if (sort.value.key !== c.key) return `Sort by ${c.label}`
  return `${c.label}, sorted ${sort.value.dir === 'asc' ? 'ascending' : 'descending'}`
}
const buy = computed(() => sortFlips<FlipRow | UpgradeRow>(buyList(rows.value, props.config.hideUntraded), sort.value, shortName))
const rareCheap = computed(() => pool.value ? rareCheapList(pool.value) : [])
const odds = computed(() => pool.value ? flipOdds(pool.value) : null)
// Both bars use one scale, so a long value bar means more than a long chance bar.
const oddsScale = computed(() => Math.max(...(odds.value?.buckets ?? []).flatMap(b => [b.chance, b.valueShare]), 0.0001))

const flipWord = computed(() => method.value.id === 'harvest' ? 'reroll' : 'recipe')
const verdict = computed(() => {
  // Each row's break-even leaves its own type out of the pool, so one
  // pool-wide "buy under" price would disagree with the list below.
  const n = buy.value.length
  if (!n) return 'Nothing worth flipping right now'
  const verb = method.value.id === 'harvest' ? 'rerolling' : method.value.id === 'upgrade' ? 'upgrading' : 'vendoring'
  return `${n} ${family.value.noun}${n === 1 ? '' : 's'} worth ${verb}`
})
const verdictSub = computed(() => {
  if (flip.value?.kind === 'upgrade') return '3 of a tier give 1 of the next, so there are no odds to weigh'
  if (flip.value?.kind !== 'pool') return ''
  const value = `A ${flipWord.value} returns ${fmt(flip.value.model.recipeValue)} on average`
  return method.value.lifeforce ? `${value}, for ${fmt(flip.value.cost)} of ${method.value.lifeforce} lifeforce` : value
})
const profitTitle = computed(() => {
  const { inputs } = method.value
  if (method.value.id === 'upgrade') return `What each item you put in makes: the price of the next tier after your sell discount, minus ${inputs} of this one, divided by ${inputs}.`
  if (method.value.lifeforce) return 'What each item makes: the return of a reroll, minus the item and the lifeforce. Lifeforce per item is in Settings, under Market & investments.'
  return `What each item you put in makes: the return of a recipe, minus its ${inputs} items, divided by ${inputs}.`
})

const unpriced = computed(() => flip.value?.kind === 'pool' ? unpricedShare(family.value, flip.value.quotes) : 0)
const warning = computed(() => {
  if (!pool.value) return ''
  if (family.value.lowConfidence) return family.value.lowConfidence
  return unpriced.value >= 0.1
    ? `${pct(unpriced.value)} of the sampled weight is on ${family.value.noun}s poe.ninja doesn't price. They are left out, so if they still drop the average is too high.`
    : ''
})

const feedNote = computed(() => {
  const feed = exchanges.value.get(family.value.ninjaType)
  if (feed) return 'Prices and volume: poe.ninja exchange.'
  return feed === undefined ? 'Prices: poe.ninja. Volume is still loading.' : "Prices: poe.ninja. Volume is missing because the exchange feed didn't load."
})

const countOf = (source: WeightSource) => pool.value?.rows.filter(r => r.weightSource === source).length ?? 0

const footerText = computed(() => {
  const left = pool.value?.unrated.length
  const short = family.value.source.split('. ')[0].replace(/\.$/, '') + '.'
  const marks = [
    countOf('estimate') ? `${countOf('estimate')} estimated` : '',
    countOf('yours') ? `${countOf('yours')} yours` : '',
    left ? `${left} with no weight left out` : ''
  ].filter(Boolean)
  return marks.length ? `${short} ${marks.join(', ')}.` : short
})

// The page opens at its top, with Market and Investments above these.
function openWeights () {
  openSettingsPage(wm, 'market')
  const scroll = (tries: number) => {
    const list = document.querySelector('[data-flip-weights]')
    if (list) list.scrollIntoView({ block: 'start' })
    else if (tries > 0) setTimeout(() => { scroll(tries - 1) }, 50)
  }
  scroll(20)
}

const footerTitle = computed(() => {
  const estimated = countOf('estimate')
  const left = pool.value?.unrated.join(', ')
  return [
    family.value.source,
    estimated ? `${estimated} with no measured weight use the average. EV leans on those guesses: check them in Settings.` : '',
    left ? `No weight, left out: ${left}.` : '',
    feedNote.value
  ].filter(Boolean).join('\n\n')
})

const WEIGHT_CHIP = 'flex: none; padding: 0 3px; border: 1px solid currentColor; border-radius: var(--w-r-sm); font-size: var(--w-fs-xs); font-weight: 600; line-height: 1.3;'

const FlipName = defineComponent({
  props: {
    name: { type: String, required: true },
    item: { type: String, required: true },
    rareCheap: { type: Boolean, default: false },
    source: { type: String as PropType<WeightSource>, default: undefined }
  },
  setup (p) {
    return () => {
      const icon = gameIcon(p.item)
      return h('span', { class: 'flex items-center gap-1 min-w-0', title: p.item }, [
        icon ? h('img', { src: icon, style: 'width: 20px; height: 20px; object-fit: contain; flex: none;', alt: '', loading: 'lazy', decoding: 'async', draggable: 'false' }) : null,
        h('span', { class: 'w-trunc' }, shortName(p.name)),
        p.rareCheap
          ? h('i', { class: 'fas fa-star w-warn', style: 'flex: none; font-size: calc(11px * var(--w-text-scale, 1));', title: 'Exceptionally rare and cheap: it may rise later, so think before flipping it' })
          : null,
        p.source === 'estimate'
          ? h('span', { class: 'w-num', style: WEIGHT_CHIP + 'color: var(--w-warn);', title: 'No measured weight: uses the average of the others. Change it in Settings.' }, 'EST')
          : null,
        p.source === 'yours'
          ? h('span', { class: 'w-num', style: WEIGHT_CHIP + 'color: var(--w-info);', title: 'Your own weight, from Settings.' }, 'YOURS')
          : null
      ])
    }
  }
})

// The shortcut and the icon click: outlines on the open stash tab, or clears them.
const clickHint = computed(() => Host.isElectron && !wm.active.value && dockConfig().hoverOpens !== false)

function stashNote (text: string) {
  toast(text, { anchor: dockIconEl('scarab-flip'), dock: true, ms: 2500 })
}

let readingStash = false

async function toggleOutlines () {
  if (readingStash || justCleared()) return
  if (stashMarks.value.length) { clearStashMarks(); return }
  // Held here, as a league change during the read clears it.
  const prices = snapshot.value
  if (!prices) { stashNote('No prices yet, so nothing to outline'); return }
  const clearsBefore = stashClearCount()
  readingStash = true
  let read: StashRead
  try {
    read = await hostRequest<StashRead>('stash-read', null)
  } finally {
    readingStash = false
  }
  if (!read.found) {
    stashNote("Can't read this tab. Outlines work on Scarab, Delirium, Delve, Essence and Blight tabs, mouse off them. All but Scarab need a game window 1080p or taller.")
    hostRequest('stash-watch-stop', null).catch(() => {})
    return
  }
  // The method the panel has picked for this family, and the same advice as the
  // panel: no untraded prices, and hold rare and cheap ones.
  const tabFamily = familyById(read.family)
  const picked = props.config.methods?.[tabFamily.id]
  const tabMethod = tabFamily.methods.find(m => m.id === picked) ?? tabFamily.methods[0]
  const priced = priceFlip(tabFamily, tabMethod, prices.items, exchanges.value, options.value, lifeforcePerItem.value, props.config.weights)
  if (priced?.kind !== 'pool' && priced?.kind !== 'upgrade') {
    hostRequest('stash-watch-stop', null).catch(() => {})
    stashNote(priced?.kind === 'no-cost'
      ? `No ${tabMethod.lifeforce ?? ''} lifeforce price yet, so nothing to outline`
      : `No ${tabFamily.noun} prices yet, so nothing to outline`)
    return
  }
  const profits = new Map<string, number>()
  if (priced.kind === 'pool') {
    for (const r of priced.model.rows) {
      if (!r.rareCheap && (!props.config.hideUntraded || isTraded(r))) profits.set(r.name, r.profitEach)
    }
  } else {
    for (const r of priced.rows) {
      if (!props.config.hideUntraded || isTraded(r)) profits.set(r.from, r.profitEach)
    }
  }
  const marks = buildMarks(read.slots, profits, props.config.stashTotals === true ? tabMethod.inputs : 0)
  // A zone change or the like while reading: these would have no click watcher.
  if (!marks.length || clearsBefore !== stashClearCount()) {
    hostRequest('stash-watch-stop', null).catch(() => {})
    if (!marks.length) stashNote('Nothing here is worth flipping right now')
    return
  }
  stashMarks.value = marks
}

function runOutlines () {
  toggleOutlines().catch(() => { stashNote("Couldn't read the screen") })
}

const stashHotkey = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  if (e.target === stashHotkeyTarget(props.config.wmId)) runOutlines()
})
onUnmounted(() => { stashHotkey.abort() })

function itemName (r: FlipRow | UpgradeRow) { return 'from' in r ? r.from : r.name }

// The item menu: price check, trade, wiki, copy, stash.
function rowMenu (e: MouseEvent, name: string) {
  openItemMenu(e, { name })
}

function capitalize (s: string) { return s[0].toUpperCase() + s.slice(1) }
function fmt (chaos: number) { return formatChaos(chaos, snapshot.value?.divine ?? null) }
function amount (chaos: number) { return formatAmount(chaos) }
function pct (p: number) {
  const v = p * 100
  return `${v < 1 ? Number(v.toFixed(2)) : Math.round(v)}%`
}

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => [{
  label: best.value ? `Copy best supply: ${shortName(best.value.name)}` : 'Copy best supply',
  icon: 'far fa-copy',
  disabled: !best.value,
  action: () => {
    const name = best.value?.item
    const el = dockIconEl('scarab-flip')
    if (name) copyText(name).then(ok => { if (ok) toast(`Copied ${name}`, { anchor: el, dock: true, ms: 1800 }) }).catch(() => {})
  }
}])
</script>

<style module>
.verdict { display: flex; flex-direction: column; gap: 2px; padding: 8px var(--w-pad); background: var(--w-accent-soft); border-bottom: 1px solid var(--w-line); }
.verdict b { font-size: var(--w-fs-lg); font-weight: 600; }
.buyGrid { grid-template-columns: minmax(0, 1fr) 62px calc(96px * var(--w-text-scale, 1)) calc(64px * var(--w-text-scale, 1)); }
.weightsLink { all: unset; cursor: pointer; color: var(--w-accent); }
.weightsLink:hover, .weightsLink:focus-visible { text-decoration: underline; }
.sortHead { all: unset; cursor: pointer; white-space: nowrap; }
.sortHead:hover, .sortHead:focus-visible { color: var(--w-fg); }
.sorted { color: var(--w-accent); }
.rareGrid { grid-template-columns: minmax(0, 1fr) 62px 76px calc(64px * var(--w-text-scale, 1)); }
.sourceGrid { grid-template-columns: minmax(0, 1fr) 76px 44px; }
.note { padding: 8px var(--w-pad); color: var(--w-dim); font-size: var(--w-fs-sm); white-space: normal; overflow-wrap: anywhere; }
.warning { color: var(--w-warn); }
.legend { display: flex; flex-wrap: wrap; gap: 4px 16px; padding: 0 var(--w-pad) 6px; color: var(--w-dim); font-size: var(--w-fs-sm); }
.key { display: inline-block; width: 10px; height: 7px; border-radius: var(--w-r-sm); margin-right: 4px; }
.bucket { display: grid; grid-template-columns: 58px minmax(0, 1fr) 40px 40px; gap: 8px; align-items: center; padding: 3px var(--w-pad); }
.track { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fill { height: 7px; border-radius: var(--w-r-sm); min-width: 1px; }
.chance { background: var(--w-dim); }
.value { background: var(--w-accent); }
</style>
