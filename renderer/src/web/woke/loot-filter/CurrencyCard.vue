<template>
  <!-- Alt+F on an item the Loot tab prices (Guy's Final M4, 2026-11-28):
       first what a change covers (the rule path: click the section to go up
       a level, the item to come back; All loot only on the Loot tab) and
       Show it (By price estimate / Always show / Always hide); then where it
       lands, its price (click to type your own), the ruler (drag the needle
       for the bias), why, every unique the base can be, and what decides. -->
  <div v-if="it" :class="$style.card" :data-currency-card="it.name">
    <div :class="$style.box" data-currency-card-rule>
      <div :class="$style.crumb" role="group" aria-label="What your changes cover">
        <span class="w-dim">Rule:</span>
        <span :class="[$style.cr, $style.ro]" title="All loot: its steps and Strictness change on the Loot tab">Loot</span>
        <span class="w-faint">›</span>
        <button type="button" :class="[$style.cr, { [$style.on]: level === 'sec' }]" :aria-pressed="level === 'sec'" :title="`Change every item in ${catName}`" data-currency-card-level="sec" @click="level = 'sec'">{{ catName }}</button>
        <span class="w-faint">›</span>
        <button type="button" :class="[$style.cr, { [$style.on]: level === 'item' }]" :aria-pressed="level === 'item'" :title="`Change just ${it.name}`" data-currency-card-level="item" data-no-item-tip="the item the player is checking, which they are hovering in game" @click="level = 'item'">{{ it.name }}</button>
        <WInfo :text="LEVEL_HELP" />
      </div>
      <div :class="$style.line">
        <span class="w-dim">Show it</span>
        <WSegmented :model-value="levelMode" :options="MODES" data-currency-card-mode @update:model-value="setLevelMode" />
        <WInfo :text="MODE_HELP" />
      </div>
      <div v-if="level === 'item' && mode === 'always'" :class="$style.line" data-currency-card-at>
        <span class="w-dim">At</span>
        <WSegmented :model-value="atStep" :options="atOptions" @update:model-value="setAt" />
        <WInfo :text="AT_HELP" />
      </div>
      <div class="text-xs w-faint" data-currency-card-level-note>{{ levelNote }}</div>
    </div>

    <div :class="$style.verdict">
      <LabelPreview :text="it.name" :actions="[]" :style-override="currencyFullLook(shown === 0 ? 1 : shown, it.cat, cfg)" :visibility="shown === 0 ? 'Hide' : 'Show'" :extras="false" :scale="0.6" />
      <span :class="[$style.big, shown === 0 && verdict !== 'Faint' ? $style.down : $style.up]" data-currency-card-now>
        <template v-if="allHides"><button type="button" :class="$style.why" :title="`${decides}. Click to open it on the Loot tab.`" data-currency-card-all @click="emit('open-tab', it.cat, it.name)">{{ verdict }}</button> <WInfo :text="ALL_HELP" /></template>
        <template v-else>{{ verdict }}</template>
      </span>
      <span class="grow" />
      <span :class="$style.price" data-currency-card-price>
        <WPrice v-if="fixed != null" :chaos="null" none="No price: a filter can't see which implicit or mods a jewel has, so it shows at a set step" />
        <template v-else-if="typing">
          <input ref="priceEl" v-model="priceDraft" type="number" min="0" step="any" :class="$style.priceIn" aria-label="Your price, in chaos" data-currency-card-price-in
            @keydown.enter.prevent="savePrice" @keydown.esc.prevent="typing = false" @blur="savePrice">c
        </template>
        <template v-else>
          <button type="button" :class="$style.priceBtn" title="Click to type your own price" data-currency-card-price-edit @click="editPrice">~{{ chaosText(base) }} {{ it.uniques?.length ? 'avg' : 'each' }} <i class="fas fa-pen" aria-hidden="true" /></button>
          <small class="w-faint">{{ priceFrom }}</small>
          <button v-if="edit.price != null" type="button" :class="$style.link" data-currency-card-price-reset @click="put({ price: undefined })">↺ {{ raw?.est ? 'guess' : 'poe.ninja' }}</button>
        </template>
        <WInfo :text="PRICE_HELP" />
      </span>
    </div>

    <div v-if="mode !== 'off'" :class="$style.ruler" data-currency-card-ruler>
      <div v-if="markAt != null" :class="$style.markRow">
        <span :class="[$style.mark, markAt < 15 ? $style.markL : markAt > 85 ? $style.markR : '']" :style="{ left: `${markAt}%` }" data-currency-card-mark>{{ markLabel }}</span>
      </div>
      <div ref="barEl" :class="[$style.bar, { [$style.drag]: canDrag }]" :title="canDrag ? 'Drag the needle to set the bias' : undefined" data-currency-card-bar
        @pointerdown="dragStart" @pointermove="dragMove" @pointerup="dragEnd" @pointercancel="dragCancel">
        <span v-for="r in rows" :key="r.step" :class="[$style.seg, { [$style.off]: r.off, [$style.past]: !r.off && r.step < shown, [$style.cur]: r.step === shown }]" :style="r.css">{{ CSTEP_NAMES[r.step] }}</span>
        <i v-if="markAt != null" :class="[$style.needle, { [$style.grab]: canDrag }]" :style="{ left: `${markAt}%` }" aria-hidden="true" />
      </div>
      <div :class="$style.under">
        <span v-for="r in rows" :key="r.step" :class="{ [$style.cur]: r.step === shown }">
          <span :class="{ [$style.struck]: r.off }">{{ r.off ? 'turned off' : `from ${chaosText(r.at)}` }}</span>
          <span v-if="stackable && !r.off" class="w-faint">{{ r.from == null ? 'never' : r.from > 1 ? `stack ${r.from}+` : 'any stack' }}</span>
        </span>
      </div>
      <div v-if="overFull" class="text-xs w-faint" data-currency-card-stack>Drops stack to {{ it.full }}: a bigger pile counts as {{ it.full }}.</div>
      <div v-if="biasOn" :class="$style.biasRow" data-currency-card-bias>
        <span class="w-dim">Bias</span><b data-currency-card-pct>{{ livePct }}%</b><WInfo :text="BIAS_HELP" />
        <button v-if="livePct !== 100" type="button" :class="$style.link" data-currency-card-bias-reset @click="commitPct(100)">↺ reset</button>
        <span class="w-faint">· {{ level === 'item' ? it.name : `every item in ${catName}` }} · drag the needle</span>
      </div>
    </div>
    <div class="text-xs w-dim" data-currency-card-why>{{ whyLine }}</div>

    <div v-if="canBe.length" :class="$style.uq" data-currency-card-uniques>
      <div :class="$style.uqHead"><span>Can be</span><WInfo :text="UNIQUES_HELP" /></div>
      <template v-for="u in canBe" :key="u.key">
        <div v-if="u.avg" :class="[$style.uqRow, $style.avg]" data-currency-card-avg>
          <span />
          <span :class="$style.uqName">Average drop (what the filter uses)</span>
          <span :class="$style.uqNum" />
          <span :class="$style.uqNum">{{ chaosText(u.chaos) }}</span>
          <span :class="$style.uqStep">{{ CSTEP_NAMES[u.step] }}</span>
        </div>
        <div v-else-if="u.noDrop" :class="[$style.uqRow, $style.noDrop]" data-currency-card-no-drop>
          <span />
          <span v-item-tip="{ name: u.name, type: it.name }" :class="$style.uqName">{{ u.name }}</span>
          <span :class="$style.uqNum"><span :class="$style.chip" title="Drops only from a boss or a special source, never at random, so it's not in the average">can't drop</span></span>
          <span :class="$style.uqNum">{{ u.chaos > 0 ? chaosText(u.chaos) : '–' }}</span>
          <span :class="$style.uqStep" />
        </div>
        <label v-else :class="[$style.uqRow, { [$style.uqOut]: !u.counted }]">
          <input type="checkbox" :checked="!u.out" :disabled="u.chase && !u.out" :aria-label="`Count ${u.name} in the average`" data-loot-not-avg @change="cfg.notAvg = toggleNotAvg(cfg, u.name)">
          <span v-item-tip="{ name: u.name, type: it.name }" :class="$style.uqName">{{ u.name }}</span>
          <span :class="$style.uqNum">{{ u.chase ? 'chase' : u.out ? 'left out' : u.chance }}</span>
          <span :class="$style.uqNum">{{ chaosText(u.chaos) }}</span>
          <span :class="$style.uqStep">{{ CSTEP_NAMES[u.step] }}</span>
        </label>
      </template>
    </div>

    <div v-if="decides && layer !== 'all'" :class="$style.decides" data-currency-card-decides>
      <span :class="$style.tag">Decides</span><span class="grow">{{ decides }}</span>
      <button v-if="ownRuler" type="button" :class="$style.link" data-currency-card-ruler-open @click="emit('open-tab', it.cat, it.name)">Open on Loot tab ›</button>
    </div>
    <label v-if="kindOf(it.cat) === 'cards'" :class="$style.line" data-currency-card-collect>
      <input type="checkbox" :checked="!!edit.min" @change="toggleCollect"> <span class="text-xs">Collecting: every stack shows as at least Normal</span>
    </label>
    <label v-if="LV_KINDS.has(kindOf(it.cat))" :class="$style.line" data-currency-card-levelling>
      <input type="checkbox" :checked="!!lvCurrencyOf(cfg, it.name)" @change="setLvCurrency(cfg, it.name, !lvCurrencyOf(cfg, it.name))"> <span class="text-xs">Levelling: shows as at least Normal below maps</span>
    </label>
    <div v-if="floorLine" class="text-xs w-dim" data-currency-card-floor>{{ floorLine }}</div>
    <div :class="$style.fold">
      <WFoldHead fold="alt-f.currency-more" :class="$style.foldHead"><span>Own stack and look</span></WFoldHead>
      <CurrencyItemEditor v-if="open.more" :it="it" :edit="edit" :step="now" :base-price="base" :base-look="currencyFullLook(now === 0 ? 1 : now, it.cat, cfg)" no-avg slim @change="setEdit" />
    </div>
  </div>
  <div v-else class="flex items-center gap-2 text-xs w-dim" data-currency-card-place>
    <span class="grow">{{ placeLine }}</span>
    <WButton v-if="openTier" size="sm" data-currency-card-open @click="emit('open-rule', openTier)">Open</WButton>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useFold } from '../ui/fold'
import WFoldHead from '../ui/WFoldHead.vue'
import { WButton, WInfo, WPrice, WSegmented } from '../ui'
import LabelPreview from './LabelPreview.vue'
import { MODE_WORDS } from './section-modes'
import CurrencyItemEditor from './CurrencyItemEditor.vue'
import { CSTEP_NAMES, ALL_CATEGORIES, kindOf, CURRENCY_TYPE, currencyFullLook, currencyItems, faintOn, fixedOf, forcedHidden, minStack, offSteps, pileWorth, rowForBase, scaled, sectionMode, sizeCutNow, stacksFor, stepOfPile, stepStarts, withEdit } from './currency-weights'
import { clusterPricesFor } from './cluster-ninja'
import { BIAS_MAX, BIAS_MIN, toggleNotAvg } from './currency-settings'
import { lvCurrencyOf, setLvCurrency } from './levelling'
import { DEFAULT_BG, DEFAULT_TEXT } from './edits'
import { cssColour } from './label-style'
import { DROP_WEIGHT } from './economy'
import { cardFacts, loadCardFacts } from './card-facts'
import { loadOwnTables, ownTables } from './own-lists'
import { gemLinesOf } from './gem-classes'
import { LEAGUE_SECTIONS } from './league-classes'
import { gemItemFor, itemFor, lootFocus, notItsRarity } from './loot-focus'
import { evalCondition } from './match'
import type { ItemFacts } from './item-facts'
import type { CStep, CurrencyItem, ItemEdit, SectionMode } from './currency-weights'
import type { FilterCondition } from './parse'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  name: string
  stack: number
  // A gem's level, quality and corruption: which of its poe.ninja bands it is.
  gem?: { level: number, quality: number, corrupted: boolean } | null
  // The rule that caught it (a gem's band rule says which band it is).
  rule?: FilterCondition[] | null
  // That rule's tier and comment: which Loot tab rule it is (the Maps
  // slider, a League section, a gem floor, a unique special).
  tier?: string | null
  note?: string | null
  // The item itself: finds a row named for its kind, not its base (gold by
  // pile size, a special map, a blighted tier).
  facts?: ItemFacts | null
}>()
// The item's category and the name its row has on the Loot tab.
// `uniques`: the card lists what the base can be, so the card above drops its own list.
const emit = defineEmits<{ 'open-tab': [cat: string, name: string], 'open-rule': [tier: string], 'place': [p: { cat: string, catName: string, name: string } | null], 'uniques': [listed: boolean], 'row': [has: boolean] }>()

const open = reactive({ more: useFold('alt-f.currency-more') })
// What a Change for level sets: Always hide, By price estimate, Always show
// (Guy 2026-11-28: plain words, the same on the Loot tab's chips).
const MODES = (['auto', 'always', 'off'] as const).map(v => ({ value: v, label: MODE_WORDS[v], attrs: { [`data-currency-card-mode-${v}`]: '' } }))
const MODE_HELP = `What this level does with the item:
- **By price estimate**: its price picks the step on the ruler.
- **Always show**: at least Small, whatever the price.
- **Always hide**: never shows in maps.`
const AT_HELP = `The step it always shows at.
- Its price: the step its price lands on, at least Small.
- Small to Tink: always that step, whatever the price.`
const LEVEL_HELP = `The highlighted step is what your changes cover.
- Click the section to change every item in it, and the item to come back down.
- Loot (All loot: its steps and Strictness) changes only on the Loot tab.`
const BIAS_HELP = `Drag the needle on the ruler: the item then counts as that price, so it shows louder or quieter.
- The % is how far above or below its real price that is (20% to 300%). 100% is none.
- It applies to the highlighted step of the rule path. The item's and its section's biases add up.`
const PRICE_HELP = `The price the filter uses: poe.ninja's, yours if you set one, or a guess when nobody lists it.
- A stack counts for more than one, up to a full stack.
- Click it to type your own; ↺ goes back.
- The bias changes what it counts as.`
const ALL_HELP = 'Its worth lands on a step All loot turns off. Turn that step on in the Loot tab, or set this item to Always show.'
const UNIQUES_HELP = `Every unique this base can drop as, with its chance, price and the step that price gets.
- The base is priced by the average drop.
- Untick a unique to leave it out of the average (a special drop you never see).
- A chase unique is never in the average: the base shows in Chase uniques.`

const cfg = computed(() => props.config.presets.currency)
// Kinds the levelling floor covers (levelling.ts): the main currency compile.
const LV_KINDS = new Set(['currency', 'fragments', 'cards'])
const eff = computed(() => scaled(cfg.value, props.store.doc.value?.strictness ?? null))
// The item as the filter lists it, with poe.ninja's price (none of yours).
const raw = computed<CurrencyItem | null>(() => {
  const doc = props.store.doc.value
  const lookup = props.store.prices.lootLookup.value
  if (!doc || !lookup) return null
  loadCardFacts()
  loadOwnTables()
  const all = currencyItems({ ...doc, blocks: doc.blocks.filter(b => b.type !== CURRENCY_TYPE) }, lookup, {}, cardFacts.value, props.gem ? gemLinesOf(props.store.prices.items.value) : null, ownTables.value, clusterPricesFor(props.store.prices.currentLeague.value))
  if (!props.gem) {
    const hit = itemFor(all, props.name, props.rule)
    const row = (hit && !wrongRarity(hit) ? hit : null) ?? rowFor(all) ?? null
    return row && props.facts?.baseType ? rowForBase(row, props.facts.baseType, cfg.value) : row
  }
  return gemItemFor(all, props.name, props.gem, props.rule)
})
const wrongRarity = (i: CurrencyItem) => notItsRarity(i, props.facts?.rarity)
// A row whose BaseTypes and conditions fit the item; the dearest first, as
// the rules go loudest first.
function rowFor (all: CurrencyItem[]): CurrencyItem | undefined {
  const f = props.facts
  if (!f) return undefined
  return all
    // A row for a whole class (Sanctum research, charts) has no BaseTypes.
    .filter(i => !wrongRarity(i) && (i.bts?.length === 0 ? i.cls === f.itemClass : (i.bts ?? [i.bt ?? i.name]).includes(props.name)) && (i.conds ?? []).every(x => evalCondition(x, f) !== false))
    .sort((a, b) => b.chaos - a.chaos)[0]
}
// The row's name on the Loot tab ("Arc 20/20" for a gem band).
const itemName = computed(() => raw.value?.name ?? props.name)
const edit = computed<ItemEdit>(() => cfg.value.items[itemName.value] ?? {})
const it = computed(() => raw.value && withEdit(raw.value, edit.value))
const base = computed(() => edit.value.price ?? raw.value?.chaos ?? 0)
// The level the card changes (Guy's M4): this item, or its whole section,
// picked on the rule path.
const level = ref<'item' | 'sec'>('item')
const itemPct = computed(() => Math.round((edit.value.mult ?? 1) * 100))
const secPct = computed(() => cfg.value.bias[it.value?.cat ?? ''] ?? 100)
const ownRuler = computed(() => !!cfg.value.rulers[it.value?.cat ?? ''])
const dragItem = ref<number | null>(null)
const dragSec = ref<number | null>(null)
const dragging = computed(() => dragItem.value != null || dragSec.value != null)
// What the price counts for: the item's bias, and while the section's drags,
// the change from where its steps are now (a bias moves them the other way).
const liveMult = computed(() => (dragItem.value ?? itemPct.value) / 100 * (dragSec.value != null ? dragSec.value / secPct.value : 1))
// The layer that decides this item (the Decides line): the item when it has
// its own say, else its section when that has, else All loot.
const layer = computed(() => {
  const cat = it.value?.cat ?? ''
  const e = edit.value
  if (e.mult != null || e.price != null || e.look || e.step != null || mode.value === 'always' || e.min) return 'item'
  const c = cfg.value
  if (c.catMode[cat] != null || sectionMode(c, cat) !== 'auto' || c.rulers[cat] || c.bias[cat] != null || c.offBy[cat] != null) return 'sec'
  return 'all'
})

const catName = computed(() => ALL_CATEGORIES.find(x => x.id === it.value?.cat)?.name ?? 'Other')
// Tells the card above which section and row this is (its Go to rule and
// rule name follow it).
const SECTION_NAMES: Record<string, string> = { gemexc: 'Exceptional gems', gemawk: 'Awakened gems', gemtrans: 'Transfigured gems', gemvaal: 'Vaal gems', gemsup: 'Supports', gemskill: 'Skill gems' }
// A gem section's own Always / Hide rule has no row: its section still is the place.
const secRule = computed(() => /: (gem[a-z]+), (always|off)\b/.exec(props.note ?? ''))
watch(() => !!it.value, v => emit('row', v), { immediate: true })
onBeforeUnmount(() => emit('row', false))
watch(() => it.value ? [it.value.cat, catName.value, it.value.name] as const : secRule.value ? [secRule.value[1], SECTION_NAMES[secRule.value[1]] ?? secRule.value[1], props.name] as const : null,
  p => emit('place', p ? { cat: p[0], catName: p[1], name: p[2] } : null), { immediate: true })
onBeforeUnmount(() => emit('place', null))

// Its section's mode, its default included (boss-only uniques, Exceptional
// gems: Always), as the Loot tab shows it.
const secMode = computed(() => it.value ? sectionMode(cfg.value, it.value.cat) : 'auto')
function setSecMode (v: string) {
  const cat = it.value?.cat
  if (!cat) return
  const next = Object.fromEntries(Object.entries(cfg.value.catMode).filter(([k]) => k !== cat))
  // Kept when it differs from the section's default, so By price sticks on an Always-by-default section.
  if (v !== sectionMode({ catMode: {} }, cat)) next[cat] = v as SectionMode
  cfg.value.catMode = next
}
// A jewel row's fixed step (no price) reads as Always, or Off for step 0.
const fixed = computed(() => it.value ? fixedOf(it.value, edit.value, secMode.value as SectionMode) : undefined)
// A step set by hand (1 to 5) is Always show at that step (Guy 2026-11-28:
// the step chips sit under Always show, not in the fold).
const mode = computed(() => edit.value.step === 0 || fixed.value === 0 ? 'off' : (edit.value.supply === 1 && edit.value.step == null) || (edit.value.step ?? 0) > 0 || fixed.value != null ? 'always' : 'auto')
// Always show at: its price's step (at least Small), or a step you pick.
const atStep = computed(() => (edit.value.step ?? 0) > 0 ? String(edit.value.step) : 'price')
const atOptions = computed(() => [
  { value: 'price', label: it.value?.fixed != null ? 'Its set step' : 'Its price', attrs: { 'data-currency-card-at-price': '' } },
  ...([1, 2, 3, 4, 5] as const).map(n => ({ value: String(n), label: CSTEP_NAMES[n], attrs: { [`data-currency-card-at-${n}`]: '' } }))
])
function setAt (v: string) {
  if (v !== 'price') put({ step: Number(v) as CStep, supply: undefined, priced: undefined })
  else if (it.value?.fixed != null) put({ step: undefined, supply: undefined, priced: undefined })
  else put({ step: undefined, supply: 1, priced: undefined })
}
const stacks = computed(() => it.value ? stacksFor(it.value, eff.value) : [null, null, null, null, null])
const off = computed(() => it.value ? offSteps(it.value, cfg.value) : [])
const now = computed<CStep>(() => stepOfPile(stacks.value, props.stack, off.value))
const starts = computed(() => stepStarts(eff.value, it.value?.cat ?? ''))

// Rules the Loot tab writes that aren't an item's price step (Guy's picks
// alt-f-hides and alt-f-floors, 2026-11-28): say which one caught it.
const floorLine = computed(() => {
  const note = props.note ?? ''
  const sec = /: (gem[a-z]+), (always|off)\b/.exec(note)
  if (sec) return sec[2] === 'always' ? `Shown: ${SECTION_NAMES[sec[1]] ?? sec[1]} is set to Always show, which also shows gems poe.ninja doesn't list.` : `Hidden: ${SECTION_NAMES[sec[1]] ?? sec[1]} is set to Always hide.`
  if (/20% quality$/.test(note)) return 'Shown at Small by the 20% quality floor: a Gemcutter\'s Prism at the vendor.'
  return ''
})
const placeLine = computed(() => {
  const t = props.tier ?? ''
  if (t === 'mapfloor') {
    const from = cfg.value.mapFrom
    return from > 16 ? 'Maps: every normal map hides. Special maps still show.' : `Maps: shown from tier ${from}. Lower normal maps hide.`
  }
  const league = LEAGUE_SECTIONS.find(x => x.id === t)
  if (league) return `League: ${league.name} is set to Always hide.`
  const rec = /: recipe: (.+)$/.exec(props.note ?? '')
  if (rec) return `Recipes: ${rec[1]} shows at this step in maps (Loot › Recipes).`
  if (t.startsWith('u-')) return `Uniques: NeverSink's ${t.slice(2)} rule, kept above the priced uniques.`
  return floorLine.value || 'The Loot tab writes this rule; open it to see its items.'
})

// Where Open goes: the rule's own section, or Recipes for a recipe rule.
const openTier = computed(() => /: recipe: /.test(props.note ?? '') ? 'recipes' : secRule.value ? `cat:${secRule.value[1]}:${props.name}` : props.tier && lootFocus(props.tier) ? props.tier : null)

// The step a worth gets by price alone (a step turned off hides it).
function stepAt (v: number): CStep {
  for (let s = 5; s >= 1; s--) if (v >= starts.value[s - 1]) return off.value.includes(s) ? 0 : s as CStep
  return 0
}
// What this pile counts for, with the bias being dragged.
const liveWorth = computed(() => {
  const i = it.value
  if (!i) return 0
  const cut = sizeCutNow(i, cfg.value)
  return pileWorth({ chaos: base.value * liveMult.value * cut, full: i.full }, pile.value, eff.value.from[1])
})
// Drops never stack past a full stack; a stash pile can, and the rules
// count it as a full stack.
const pile = computed(() => Math.max(1, Math.min(props.stack, it.value?.full ?? 1)))
const overFull = computed(() => !!it.value && props.stack > it.value.full)
const stackable = computed(() => (it.value?.full ?? 1) > 1 && edit.value.step == null)
// What the mark is: this pile's worth, after the bias.
const markLabel = computed(() => {
  const v = chaosText(liveWorth.value)
  if (!stackable.value) return it.value?.uniques?.length ? `${v} avg` : v
  return props.stack > 1 ? `Stack of ${props.stack} · ${v}` : `One · ${v}`
})
// While the bias drags, the step its price would get; else what the rules give it.
const shown = computed<CStep>(() => dragging.value && mode.value === 'auto' && secMode.value !== 'off' && edit.value.step == null ? stepAt(liveWorth.value) : now.value)

interface Row { step: CStep, at: number, off: boolean, from: number | null, css: Record<string, string> }
const rows = computed<Row[]>(() => {
  const i = it.value
  if (!i) return []
  // The stack each step starts at; while the bias drags, at the dragged price.
  const live = dragging.value ? { chaos: base.value * liveMult.value * sizeCutNow(i, cfg.value), full: i.full } : null
  return ([1, 2, 3, 4, 5] as CStep[]).map(s => {
    const look = currencyFullLook(s, i.cat, cfg.value)
    return {
      step: s,
      at: starts.value[s - 1],
      off: off.value.includes(s),
      from: live ? minStack(live, starts.value[s - 1], eff.value.from[1]) : stacks.value[s - 1],
      css: { color: cssColour(look.text ?? DEFAULT_TEXT), background: cssColour(look.background ?? DEFAULT_BG), borderColor: look.border ? cssColour(look.border) : 'transparent' }
    }
  })
})
// Where the worth sits on the ruler, in %: each step a fifth, spaced by
// price ratio inside it. None when its step is set by hand.
const markAt = computed(() => {
  if (edit.value.step != null || !it.value) return null
  const v = liveWorth.value
  const st = starts.value
  if (v <= 0) return 1
  for (let s = 1; s <= 5; s++) {
    const lo = st[s - 1]
    const hi = s < 5 ? st[s] : st[4] * 4
    if (v < lo) return Math.max(1, (s - 1) * 20 - 2)
    if (v < hi && hi > lo) return Math.min(99, ((s - 1) + Math.log(v / lo) / Math.log(hi / lo)) * 20)
  }
  return 99
})
// The answer: where it lands. Why is the line under the ruler.
const isFaint = computed(() => !!it.value && faintOn(cfg.value, props.store.doc.value?.strictness ?? null) && !forcedHidden(it.value, cfg.value))
const secHides = computed(() => secMode.value === 'off' && stacks.value.every(k => k == null))
const verdict = computed(() => {
  const s = shown.value
  if (mode.value === 'off' || secHides.value) return 'Hidden'
  if (s !== 0) return `Shows · ${CSTEP_NAMES[s]}`
  return pileStep.value === 0 && isFaint.value ? 'Faint' : 'Hidden'
})
// The step its worth reaches, turned off or not.
function rawStepAt (v: number): CStep {
  for (let s = 5; s >= 1; s--) if (v >= starts.value[s - 1]) return s as CStep
  return 0
}
const pileStep = computed<CStep>(() => dragging.value ? rawStepAt(liveWorth.value) : stepOfPile(stacks.value, props.stack))
const names = (xs: number[]) => xs.map(n => CSTEP_NAMES[n]).join(xs.length === 2 ? ' and ' : ', ')
const biased = computed(() => liveMult.value !== 1 || secPct.value !== 100)
const whyLine = computed(() => {
  const i = it.value
  if (!i) return ''
  if (mode.value === 'off') return `Always hide: ${i.name} never shows in maps.`
  if (secHides.value) return `${catName.value} is set to Always hide.`
  const s = shown.value
  if (fixed.value != null) return s ? `A set step, ${CSTEP_NAMES[s]}: a filter can't see what it would be worth.` : ''
  const w = `Counts ${chaosText(liveWorth.value)}${biased.value ? ' with your bias' : ''}`
  if (s !== 0) return rawStepAt(liveWorth.value) === 0 || off.value.includes(rawStepAt(liveWorth.value)) ? `Always show: at least ${CSTEP_NAMES[s]}, whatever the price.` : `${w}, which lands on ${CSTEP_NAMES[s]}.`
  const p = pileStep.value
  if (p !== 0) return `${w}, which lands on ${CSTEP_NAMES[p]}, and ${layer.value === 'sec' && cfg.value.offBy[i.cat] ? catName.value : 'All loot'} turns ${CSTEP_NAMES[p]} off.`
  return `${w}, under where Small starts (${chaosText(starts.value[0])})${isFaint.value ? ', so it shows faint' : ''}.`
})
// What decides it (the gold line): the item's own say, its section's, or All loot.
const decides = computed(() => {
  const i = it.value
  if (!i) return ''
  const e = edit.value
  if (layer.value === 'item') {
    const bits = [mode.value === 'always' && e.supply === 1 ? 'Always show' : '', e.price != null ? `your ${chaosText(e.price)} price` : '', e.mult != null ? `your ${itemPct.value}% bias` : '',
      e.step != null && e.step !== 0 ? `set to ${CSTEP_NAMES[e.step]}` : '', e.step === 0 ? 'Always hide' : '', e.min ? 'Collecting' : '', e.supply != null && e.supply > 1 ? `always from a stack of ${e.supply}` : '', e.look ? 'its own look' : '']
    return `${i.name}: ${bits.filter(Boolean).join(', ') || 'your settings'}`
  }
  if (layer.value === 'sec') {
    const c = cfg.value
    const offBy = c.offBy[i.cat] ?? []
    const bits = [secMode.value !== 'auto' ? MODE_WORDS[secMode.value as keyof typeof MODE_WORDS] : '', ownRuler.value ? 'its own ruler' : '', c.bias[i.cat] != null ? `a ${secPct.value}% bias` : '', offBy.length ? `${names(offBy)} off` : '']
    return `${catName.value}: ${bits.filter(Boolean).join(', ') || 'its own settings'}`
  }
  const offs = off.value.filter(x => x > 0)
  return shown.value === 0 && offs.length ? `All loot: ${names(offs)} ${offs.length > 1 ? 'are' : 'is'} off` : 'All loot: its steps and Strictness'
})
// What the rule path's level shows on Show it: its own say, or (the item)
// its section's while it has none.
// All loot hides it: "Hidden" says why on hover and opens the Loot tab
// (Guy 2026-11-28: no separate All loot line).
const allHides = computed(() => layer.value === 'all' && shown.value === 0 && verdict.value === 'Hidden')
const levelMode = computed(() => level.value === 'sec' || mode.value === 'auto' ? secMode.value : mode.value)
function setLevelMode (v: string) {
  if (level.value === 'sec') setSecMode(v)
  else setMode(v)
}
const levelNote = computed(() => {
  const i = it.value
  if (!i) return ''
  if (level.value === 'sec') return `Changes every item in ${catName.value}. Click ${i.name} to come back down.${ownRuler.value ? ' Its steps are its own ruler, on the Loot tab.' : ''}`
  return mode.value === 'auto' && secMode.value !== 'auto' ? `Follows ${catName.value} (${MODE_WORDS[secMode.value as keyof typeof MODE_WORDS]}) until you change it.` : `Changes ${i.name} only.`
})
const priceFrom = computed(() => {
  if (edit.value.price != null) return 'yours'
  const n = it.value?.uniques?.filter(u => u.counted).length ?? 0
  if (n) return `of ${n} unique${n === 1 ? '' : 's'}`
  return raw.value?.est ? 'a guess' : 'poe.ninja'
})
// Your own price, typed where the price is (Guy 2026-11-28).
const typing = ref(false)
const priceDraft = ref('')
const priceEl = ref<HTMLInputElement | null>(null)
function editPrice () {
  priceDraft.value = String(Number(base.value.toPrecision(3)))
  typing.value = true
  nextTick(() => { priceEl.value?.focus(); priceEl.value?.select() })
}
function savePrice () {
  if (!typing.value) return
  typing.value = false
  const v = Number(priceDraft.value)
  if (!(v > 0) || v === base.value) return
  put({ price: v === raw.value?.chaos ? undefined : v })
}

// The bias, set by dragging the needle (Guy's M4): for the item, or its
// section when the rule path is on it. 20% to 300%, in 5s, on release.
const biasOn = computed(() => markAt.value != null && fixed.value == null && edit.value.step == null && secMode.value !== 'off' &&
  (level.value === 'item' ? mode.value === 'auto' : !ownRuler.value))
const canDrag = biasOn
const livePct = computed(() => level.value === 'item' ? dragItem.value ?? itemPct.value : dragSec.value ?? secPct.value)
// The worth at a spot on the ruler: markAt the other way round.
function worthAt (p: number): number {
  const st = starts.value
  const x = Math.min(99.9, Math.max(0, p)) / 20
  const s = Math.min(4, Math.floor(x))
  const lo = st[s]
  const hi = s < 4 ? st[s + 1] : st[4] * 4
  return lo * (hi / lo) ** (x - s)
}
const barEl = ref<HTMLElement | null>(null)
const held = ref(false)
function dragAt (e: PointerEvent) {
  const el = barEl.value
  const i = it.value
  if (!el || !i) return
  const box = el.getBoundingClientRect()
  const now = pileWorth({ chaos: base.value * itemPct.value / 100 * sizeCutNow(i, cfg.value), full: i.full }, pile.value, eff.value.from[1])
  if (!(now > 0) || !box.width) return
  const from = level.value === 'item' ? itemPct.value : secPct.value
  const pct = Math.min(BIAS_MAX, Math.max(BIAS_MIN, Math.round(from * worthAt((e.clientX - box.left) / box.width * 100) / now / 5) * 5))
  if (level.value === 'item') dragItem.value = pct
  else dragSec.value = pct
}
function dragStart (e: PointerEvent) {
  if (!canDrag.value || e.button !== 0) return
  held.value = true;
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  dragAt(e)
}
function dragMove (e: PointerEvent) { if (held.value) dragAt(e) }
function dragEnd () {
  if (!held.value) return
  held.value = false
  const v = level.value === 'item' ? dragItem.value : dragSec.value
  if (v != null) commitPct(v)
}
function dragCancel () {
  held.value = false
  dragItem.value = null
  dragSec.value = null
}
function commitPct (v: number) {
  if (level.value === 'item') setItemPct(v)
  else setSecPct(v)
}

// What the base can be (Guy 2026-11-28: every unique with its price and
// step, and the average the filter prices it by, between them by price).
interface CanBe { key: string, avg?: boolean, name: string, chaos: number, step: CStep, chance: string, counted: boolean, chase: boolean, out: boolean, noDrop?: boolean }
const canBe = computed<CanBe[]>(() => {
  const list = it.value?.uniques ?? []
  if (!list.some(u => !u.noDrop)) return []
  const w = (t: number | null) => t == null ? 45 : DROP_WEIGHT[t] ?? 45
  const sum = list.filter(u => u.counted).reduce((a, u) => a + w(u.tier), 0)
  const m = liveMult.value
  const out: CanBe[] = list.map(u => {
    const p = sum && u.counted ? w(u.tier) / sum * 100 : 0
    return { key: u.name, name: u.name, chaos: u.chaos * m, step: stepAt(u.chaos * m), chance: p >= 10 ? `${Math.round(p)}%` : `${Number(p.toPrecision(1))}%`, counted: u.counted, chase: u.chase, out: u.out, noDrop: u.noDrop }
  }).sort((a, b) => b.chaos - a.chaos)
  const avg = base.value * m
  const at = out.findIndex(u => u.chaos < avg)
  out.splice(at < 0 ? out.length : at, 0, { key: '~avg', avg: true, name: '', chaos: avg, step: stepAt(avg), chance: '', counted: true, chase: false, out: false })
  return out
})
watch(() => canBe.value.length > 0, v => emit('uniques', v), { immediate: true })
onBeforeUnmount(() => emit('uniques', false))

// Collecting (Guy's star N): at least Normal at any stack.
function toggleCollect () {
  const { min, ...rest } = edit.value
  setEdit(min ? rest : { ...rest, min: 2 })
}
function setEdit (e: ItemEdit | null) {
  const name = itemName.value
  const items = Object.fromEntries(Object.entries(cfg.value.items).filter(([n]) => n !== name))
  if (e && Object.keys(e).length) items[name] = e
  cfg.value.items = items
}
function put (patch: Partial<ItemEdit>) {
  setEdit(Object.fromEntries(Object.entries({ ...edit.value, ...patch }).filter(([, v]) => v !== undefined)) as ItemEdit)
}
function setMode (v: string) {
  const fx = it.value?.fixed
  // A row with a fixed step (no price): Always, or Shows back on, returns
  // to it; By price leaves it.
  if (fx && (v === 'always' || (v === 'auto' && mode.value === 'off'))) put({ step: undefined, supply: undefined, priced: undefined })
  else if (v === 'off') put({ step: 0, supply: undefined, priced: undefined })
  else if (v === 'always') put({ step: undefined, supply: 1, priced: undefined })
  else put({ step: undefined, supply: edit.value.supply === 1 ? undefined : edit.value.supply, priced: fx != null ? true : undefined })
}
// Both apply on release (Guy: sliders apply when you let go).
function setItemPct (v: number) {
  dragItem.value = null
  put({ mult: v === 100 ? undefined : v / 100 })
}
function setSecPct (v: number) {
  dragSec.value = null
  const cat = it.value?.cat
  if (!cat) return
  const next = Object.fromEntries(Object.entries(cfg.value.bias).filter(([k]) => k !== cat))
  if (v !== 100) next[cat] = v
  cfg.value.bias = next
}

function chaosText (v: number): string {
  if (v >= 100) return `${Math.round(v).toLocaleString()}c`
  if (v >= 10) return `${Math.round(v)}c`
  if (v >= 1) return `${Number(v.toFixed(1))}c`
  return `${Number(v.toPrecision(2))}c`
}
</script>

<style module>
.card { display: flex; flex-direction: column; gap: 8px; }
.box { display: flex; flex-direction: column; gap: 6px; padding: 6px 8px; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); background: var(--w-panel-2); }
.crumb { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; font-size: var(--w-fs-sm); }
.cr { padding: 1px 7px; border: 1px solid transparent; border-radius: var(--w-r-sm); background: none; color: var(--w-gold); font: inherit; cursor: pointer; max-width: 16rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cr:hover { border-color: var(--w-gold); }
.cr.on { border-color: var(--w-gold); background: color-mix(in srgb, var(--w-gold) 18%, transparent); color: var(--w-fg); font-weight: 600; cursor: default; }
.cr.ro { color: var(--w-dim); border: 1px dashed var(--w-line); cursor: help; }
.line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: var(--w-fs-sm); }
.verdict { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.big { font-family: var(--w-head); font-size: var(--w-fs-lg); }
.up { color: var(--w-up); }
.down { color: var(--w-down); }
.price { display: inline-flex; align-items: center; gap: 5px; font-size: var(--w-fs-sm); color: var(--w-fg); font-variant-numeric: tabular-nums; }
.priceBtn { background: none; border: none; border-bottom: 1px dashed var(--w-gold); padding: 0; color: inherit; font: inherit; cursor: text; }
.priceBtn i { color: var(--w-gold); font-size: .8em; margin-left: 2px; }
.priceIn { width: 5em; background: var(--w-panel-2); color: var(--w-fg); border: 1px solid var(--w-gold); border-radius: var(--w-r-sm); font-size: var(--w-fs-sm); padding: 1px 4px; }
.link { background: none; border: none; padding: 0; color: var(--w-gold); font-size: var(--w-fs-xs); cursor: pointer; white-space: nowrap; }
.link:hover { text-decoration: underline; }
.biasRow { display: flex; align-items: center; justify-content: flex-end; gap: 5px; flex-wrap: wrap; font-size: var(--w-fs-sm); }
.decides { display: flex; align-items: center; gap: 8px; padding: 3px 8px; border-left: 3px solid var(--w-gold); background: color-mix(in srgb, var(--w-gold) 10%, transparent); font-size: var(--w-fs-sm); }
.tag { font-size: var(--w-fs-xs); text-transform: uppercase; letter-spacing: .06em; color: #000; background: var(--w-gold); padding: 0 5px; border-radius: 2px; }
.drag { cursor: ew-resize; touch-action: none; user-select: none; }
.grab { width: 4px !important; margin-left: -2px !important; }
.ruler { display: flex; flex-direction: column; gap: 3px; }
.markRow { position: relative; height: 18px; }
.mark { position: absolute; bottom: 0; transform: translateX(-50%); font-size: var(--w-fs-sm); color: var(--w-fg); white-space: nowrap; font-variant-numeric: tabular-nums; transition: left .12s; }
.markL { transform: translateX(-6px); }
.markR { transform: translateX(calc(-100% + 6px)); }
.bar { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px; }
.seg {
  height: 26px; display: flex; align-items: center; justify-content: center; padding: 0 6px;
  border: 1px solid transparent; font-size: var(--w-fs-md); font-family: var(--w-head); letter-spacing: .02em;
  white-space: nowrap; overflow: hidden;
}
.seg.off { opacity: .3; background-image: repeating-linear-gradient(135deg, transparent 0 4px, rgba(0, 0, 0, .45) 4px 6px); }
.seg.past { opacity: .55; }
.seg.cur { box-shadow: 0 0 0 1px var(--w-fg); }
.needle { position: absolute; top: -3px; bottom: -3px; width: 2px; margin-left: -1px; background: var(--w-fg); box-shadow: 0 0 0 1px rgba(0, 0, 0, .6); transition: left .12s; pointer-events: none; }
.under { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px; font-size: var(--w-fs-sm); color: var(--w-dim); font-variant-numeric: tabular-nums; }
.under > span { display: flex; flex-direction: column; padding-left: 2px; min-width: 0; }
.under .cur { color: var(--w-fg); }
.struck { text-decoration: line-through; color: var(--w-faint); }
.uq { display: flex; flex-direction: column; gap: 1px; font-size: var(--w-fs-sm); }
.uqHead { display: flex; align-items: center; gap: 4px; color: var(--w-dim); font-size: var(--w-fs-xs); }
.uqRow { display: grid; grid-template-columns: 16px 1fr auto 3.6em 3.6em; align-items: center; gap: 6px; padding: 1px 0; cursor: pointer; }
.uqRow input { accent-color: #c8a565; margin: 0; }
.uqName { color: #af6025; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.uqNum { text-align: right; color: var(--w-dim); font-variant-numeric: tabular-nums; font-size: var(--w-fs-xs); }
.uqStep { color: var(--w-fg); font-size: var(--w-fs-xs); }
.uqOut .uqName { color: var(--w-faint); text-decoration: line-through; }
.noDrop .uqName { color: var(--w-dim); }
.chip { padding: 0 5px; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); color: var(--w-faint); white-space: nowrap; }
.why { background: none; border: 0; padding: 0; font: inherit; color: inherit; cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; }
.avg { cursor: default; border-top: 1px dashed var(--w-line); border-bottom: 1px dashed var(--w-line); }
.avg .uqName { color: var(--w-fg); }
.fold { border-top: 1px solid var(--w-line); padding-top: 6px; }
.foldHead { font-size: var(--w-fs-xs); }
</style>
