<template>
  <!-- Alt+F on an item the Loot tab prices (Guy's picks A and Y,
       2026-11-28): the answer first (its look and step), a Shows switch, a
       ruler of the five steps with a mark at its worth, a Price bias, every
       unique the base can be, then its section and its own state. -->
  <div v-if="it" :class="$style.card" :data-currency-card="it.name">
    <div :class="$style.verdict">
      <LabelPreview :text="it.name" :actions="[]" :style-override="currencyFullLook(shown === 0 ? 1 : shown, it.cat, cfg)" :visibility="shown === 0 ? 'Hide' : 'Show'" :extras="false" :scale="0.6" />
      <span :class="$style.big" data-currency-card-now>{{ verdict }}</span>
      <span class="grow" />
      <span class="text-xs w-dim" :title="edit.price != null ? 'Your price' : it.est ? 'A guess from NeverSink\'s tiers' : 'poe.ninja'"><WPrice v-if="fixed != null" :chaos="null" none="No price: a filter can't see which implicit or mods a jewel has, so it shows at a set step" /><template v-else>{{ chaosText(base) }} {{ it.uniques?.length ? 'avg' : 'each' }}<template v-if="edit.price != null"> · yours</template><template v-else-if="it.est"> · guess</template><template v-if="liveMult !== 1"> · counts {{ chaosText(base * liveMult) }} with bias</template></template></span>
      <WToggle :model-value="mode !== 'off'" data-currency-card-shows @update:model-value="v => setMode(v ? 'auto' : 'off')">Shows</WToggle>
    </div>

    <div v-if="mode !== 'off'" :class="$style.ruler" data-currency-card-ruler>
      <div v-if="markAt != null" :class="$style.markRow">
        <span :class="[$style.mark, markAt < 15 ? $style.markL : markAt > 85 ? $style.markR : '']" :style="{ left: `${markAt}%` }" data-currency-card-mark>{{ markLabel }}</span>
      </div>
      <div :class="$style.bar">
        <span v-for="r in rows" :key="r.step" :class="[$style.seg, { [$style.off]: r.off, [$style.past]: !r.off && r.step < shown, [$style.cur]: r.step === shown }]" :style="r.css">{{ CSTEP_NAMES[r.step] }}</span>
        <i v-if="markAt != null" :class="$style.needle" :style="{ left: `${markAt}%` }" aria-hidden="true" />
      </div>
      <div :class="$style.under">
        <span v-for="r in rows" :key="r.step" :class="{ [$style.cur]: r.step === shown }">
          <span :class="{ [$style.struck]: r.off }">{{ r.off ? 'turned off' : `from ${chaosText(r.at)}` }}</span>
          <span v-if="stackable && !r.off" class="w-faint">{{ r.from == null ? 'never' : r.from > 1 ? `stack ${r.from}+` : 'any stack' }}</span>
        </span>
      </div>
      <div v-if="overFull" class="text-xs w-faint" data-currency-card-stack>Drops stack to {{ it.full }}: a bigger pile counts as {{ it.full }}.</div>
    </div>

    <div v-if="mode !== 'off'" :class="$style.row">
      <span :class="$style.lab">Price bias<WInfo :text="BIAS_HELP" /></span>
      <span class="text-xs w-faint">Penalty</span>
      <input type="range" :min="-NUDGE_MAX" :max="NUDGE_MAX" step="1" :value="dragNotch ?? notch" :class="$style.range" :disabled="mode !== 'auto' || secMode === 'off'"
        aria-label="Price bias for this item" data-currency-card-mult
        @input="dragNotch = Number(($event.target as HTMLInputElement).value)" @change="commitNotch(Number(($event.target as HTMLInputElement).value))">
      <span class="text-xs w-faint">Bonus</span>
      <b :class="$style.mx">{{ pctText(liveMult) }}</b>
      <button v-if="mult !== 1" type="button" class="w-icon-btn" title="No bias" aria-label="No price bias" @click="commitNotch(0)"><i aria-hidden="true" class="fas fa-undo" /></button>
    </div>

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
        <label v-else :class="[$style.uqRow, { [$style.uqOut]: !u.counted }]">
          <input type="checkbox" :checked="!u.out" :disabled="u.chase && !u.out" :aria-label="`Count ${u.name} in the average`" data-loot-not-avg @change="cfg.notAvg = toggleNotAvg(cfg, u.name)">
          <span v-item-tip="{ name: u.name, type: it.name }" :class="$style.uqName">{{ u.name }}</span>
          <span :class="$style.uqNum">{{ u.chase ? 'chase' : u.out ? 'left out' : u.chance }}</span>
          <span :class="$style.uqNum">{{ chaosText(u.chaos) }}</span>
          <span :class="$style.uqStep">{{ CSTEP_NAMES[u.step] }}</span>
        </label>
      </template>
    </div>

    <div :class="$style.row" data-currency-card-section>
      <span :class="$style.lab">Section</span>
      <button type="button" :class="$style.cat" class="w-focusable" :style="{ '--c': catCss }" :title="`Open ${catName} on the Loot tab`" data-currency-card-cat
        @click="emit('open-tab', it.cat, it.name)"><i aria-hidden="true" />{{ catName }}</button>
      <StateChip :model-value="secMode" :options="SECTION_MODES" :title="catName" :dflt="sectionMode({ catMode: {} }, it.cat)"
        :bias="cfg.nudge[it.cat] ?? 0" no-bias-in="off" @update:model-value="setSecMode" @update:bias="setNudge" />
    </div>
    <div :class="$style.row" data-currency-card-item>
      <span :class="$style.lab">This item</span>
      <StateChip :model-value="mode === 'always' ? 'always' : 'auto'" :options="ITEM_CHIPS" :title="it.name" dflt="auto" :bias="-notch" @update:model-value="setMode" @update:bias="n => commitNotch(-n)" />
    </div>
    <label v-if="kindOf(it.cat) === 'cards'" :class="$style.row" data-currency-card-collect>
      <span :class="$style.lab">Collecting</span>
      <input type="checkbox" :checked="!!edit.min" @change="toggleCollect"> <span class="text-xs w-dim">every stack shows at least Normal</span>
    </label>
    <label v-if="LV_KINDS.has(kindOf(it.cat))" :class="$style.row" data-currency-card-levelling>
      <span :class="$style.lab">Levelling</span>
      <input type="checkbox" :checked="!!lvCurrencyOf(cfg, it.name)" @change="setLvCurrency(cfg, it.name, !lvCurrencyOf(cfg, it.name))"> <span class="text-xs w-dim">shows at least Normal below maps</span>
    </label>
    <div v-if="floorLine" class="text-xs w-dim" data-currency-card-floor>{{ floorLine }}</div>

    <div :class="$style.fold">
      <WFoldHead fold="alt-f.currency-more" :class="$style.foldHead"><span>Own price, own look</span></WFoldHead>
      <CurrencyItemEditor v-if="open.more" :it="it" :edit="edit" :step="now" :base-price="base" :base-look="currencyFullLook(now === 0 ? 1 : now, it.cat, cfg)" no-avg @change="setEdit" />
    </div>
  </div>
  <div v-else class="flex items-center gap-2 text-xs w-dim" data-currency-card-place>
    <span class="grow">{{ placeLine }}</span>
    <WButton v-if="openTier" size="sm" data-currency-card-open @click="emit('open-rule', openTier)">Open</WButton>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useFold } from '../ui/fold'
import WFoldHead from '../ui/WFoldHead.vue'
import { WButton, WInfo, WPrice, WToggle } from '../ui'
import LabelPreview from './LabelPreview.vue'
import StateChip from './StateChip.vue'
import type { ChipOption } from './StateChip.vue'
import { SECTION_MODES } from './section-modes'
import CurrencyItemEditor from './CurrencyItemEditor.vue'
import { CSTEP_NAMES, ALL_CATEGORIES, kindOf, CURRENCY_TYPE, MULT_MAX, MULT_MIN, NUDGE_MAX, catColour, currencyFullLook, currencyItems, faintOn, fixedOf, forcedHidden, minStack, offSteps, pileWorth, rowForBase, scaled, sectionMode, sizeCutNow, stacksFor, stepOfPile, stepStarts, withEdit } from './currency-weights'
import { toggleNotAvg } from './currency-settings'
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
const emit = defineEmits<{ 'open-tab': [cat: string, name: string], 'open-rule': [tier: string], 'place': [p: { cat: string, catName: string, name: string } | null], 'uniques': [listed: boolean] }>()

const open = reactive({ more: useFold('alt-f.currency-more') })
// The item on its own: its section's state or Always. Hide is the Shows switch.
// With its own bias, price or look it says Custom (Guy 2026-11-28).
const ITEM_CHIPS = computed<ChipOption[]>(() => [
  edit.value.mult != null || edit.value.price != null || edit.value.look
    ? { value: 'auto', label: 'Custom', desc: 'Its section decides, with your bias, price or look.', dot: 'var(--w-gold)' }
    : { value: 'auto', label: 'Same as section', desc: 'Its section decides.', dot: 'var(--w-gold)' },
  { value: 'always', label: 'Always', desc: 'Shows at least Small, whatever the price.', dot: 'var(--w-gold-hi)', glow: true }
])
const BIAS_HELP = `Makes this item count above or below its price, so it shows louder or quieter.
- Only this item (a unique base: only this base). Other items keep theirs.
- Its section has its own bias, on the section chip. Both apply.
- The mark and step move as you drag; it applies when you let go.`
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
  const all = currencyItems({ ...doc, blocks: doc.blocks.filter(b => b.type !== CURRENCY_TYPE) }, lookup, {}, cardFacts.value, props.gem ? gemLinesOf(props.store.prices.items.value) : null, ownTables.value)
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
const mult = computed(() => edit.value.mult ?? 1)
// Price bias in notches of ×1.25, as the sections' bias (Guy's pick Y).
const notch = computed(() => Math.max(-NUDGE_MAX, Math.min(NUDGE_MAX, Math.round(Math.log(mult.value) / Math.log(1.25)))))
const dragNotch = ref<number | null>(null)
const liveMult = computed(() => dragNotch.value != null ? 1.25 ** dragNotch.value : mult.value)

const catName = computed(() => ALL_CATEGORIES.find(x => x.id === it.value?.cat)?.name ?? 'Other')
// Tells the card above which section and row this is (its Go to rule and
// rule name follow it).
const SECTION_NAMES: Record<string, string> = { gemexc: 'Exceptional gems', gemawk: 'Awakened gems', gemtrans: 'Transfigured gems', gemvaal: 'Vaal gems', gemsup: 'Supports', gemskill: 'Skill gems' }
// A gem section's own Always / Hide rule has no row: its section still is the place.
const secRule = computed(() => /: (gem[a-z]+), (always|off)\b/.exec(props.note ?? ''))
watch(() => it.value ? [it.value.cat, catName.value, it.value.name] as const : secRule.value ? [secRule.value[1], SECTION_NAMES[secRule.value[1]] ?? secRule.value[1], props.name] as const : null,
  p => emit('place', p ? { cat: p[0], catName: p[1], name: p[2] } : null), { immediate: true })
onBeforeUnmount(() => emit('place', null))
const catCss = computed(() => `rgb(${catColour(it.value?.cat ?? 'other', cfg.value).rgb.join(',')})`)

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
const mode = computed(() => edit.value.step === 0 || fixed.value === 0 ? 'off' : (edit.value.supply === 1 && edit.value.step == null) || fixed.value != null ? 'always' : 'auto')
const stacks = computed(() => it.value ? stacksFor(it.value, eff.value) : [null, null, null, null, null])
const off = computed(() => it.value ? offSteps(it.value, cfg.value) : [])
const now = computed<CStep>(() => stepOfPile(stacks.value, props.stack, off.value))
const starts = computed(() => stepStarts(eff.value, it.value?.cat ?? ''))

// Rules the Loot tab writes that aren't an item's price step (Guy's picks
// alt-f-hides and alt-f-floors, 2026-11-28): say which one caught it.
const floorLine = computed(() => {
  const note = props.note ?? ''
  const sec = /: (gem[a-z]+), (always|off)\b/.exec(note)
  if (sec) return sec[2] === 'always' ? `Shown: ${SECTION_NAMES[sec[1]] ?? sec[1]} is Always, which also shows gems poe.ninja doesn't list.` : `Hidden: ${SECTION_NAMES[sec[1]] ?? sec[1]} is set to Hide.`
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
  if (league) return `League: ${league.name} is set to Hide.`
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
const shown = computed<CStep>(() => dragNotch.value != null && mode.value === 'auto' && secMode.value !== 'off' && edit.value.step == null ? stepAt(liveWorth.value) : now.value)

interface Row { step: CStep, at: number, off: boolean, from: number | null, css: Record<string, string> }
const rows = computed<Row[]>(() => {
  const i = it.value
  if (!i) return []
  // The stack each step starts at; while the bias drags, at the dragged price.
  const live = dragNotch.value != null ? { chaos: base.value * liveMult.value * sizeCutNow(i, cfg.value), full: i.full } : null
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
// The answer: its step, or why it hides.
const verdict = computed(() => {
  const s = shown.value
  if (mode.value === 'off') return 'Hidden'
  // An Off section hides it unless the item shows anyway (its own step,
  // Always or Collecting): read what the rules give it, not the mode.
  if (secMode.value === 'off' && stacks.value.every(k => k == null)) return `Hidden · ${catName.value} is set to Hide`
  if (s !== 0) return CSTEP_NAMES[s]
  const pile = dragNotch.value != null ? 0 : stepOfPile(stacks.value, props.stack)
  if (pile !== 0) return `Hidden · ${CSTEP_NAMES[pile]} is off`
  // Under the line with Faint on, it shows small and see-through.
  return it.value && faintOn(cfg.value, props.store.doc.value?.strictness ?? null) && !forcedHidden(it.value, cfg.value) ? 'Faint' : 'Hidden'
})

// What the base can be (Guy 2026-11-28: every unique with its price and
// step, and the average the filter prices it by, between them by price).
interface CanBe { key: string, avg?: boolean, name: string, chaos: number, step: CStep, chance: string, counted: boolean, chase: boolean, out: boolean }
const canBe = computed<CanBe[]>(() => {
  const list = it.value?.uniques ?? []
  if (!list.length) return []
  const w = (t: number | null) => t == null ? 45 : DROP_WEIGHT[t] ?? 45
  const sum = list.filter(u => u.counted).reduce((a, u) => a + w(u.tier), 0)
  const m = liveMult.value
  const out: CanBe[] = list.map(u => {
    const p = sum && u.counted ? w(u.tier) / sum * 100 : 0
    return { key: u.name, name: u.name, chaos: u.chaos * m, step: stepAt(u.chaos * m), chance: p >= 10 ? `${Math.round(p)}%` : `${Number(p.toPrecision(1))}%`, counted: u.counted, chase: u.chase, out: u.out }
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
// Applies on release (Guy: sliders apply when you let go).
function commitNotch (k: number) {
  dragNotch.value = null
  const n = Math.min(MULT_MAX, Math.max(MULT_MIN, Math.round(1.25 ** k * 100) / 100))
  put({ mult: !Number.isFinite(n) || k === 0 ? undefined : n })
}
function pctText (m: number) {
  const p = Math.round((m - 1) * 100)
  return p === 0 ? 'none' : `${p > 0 ? '+' : '−'}${Math.abs(p)}%`
}
function setNudge (n: number) {
  const cat = it.value?.cat
  if (!cat) return
  const next = Object.fromEntries(Object.entries(cfg.value.nudge).filter(([k]) => k !== cat))
  if (n !== 0) next[cat] = n
  cfg.value.nudge = next
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
.verdict { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.big { font-family: var(--w-head); font-size: var(--w-fs-lg); color: var(--w-fg); }
.cat {
  display: inline-flex; align-items: center; gap: 5px;
  border: 1px solid var(--c); border-radius: 10px; padding: 0 9px 0 7px;
  color: var(--c); background: var(--w-panel-2); font-size: var(--w-fs-sm); cursor: pointer;
}
.cat i { width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
.row { display: flex; align-items: center; gap: 8px; font-size: var(--w-fs-sm); }
.lab { display: inline-flex; align-items: center; gap: 3px; color: var(--w-dim); min-width: 4.5rem; font-size: var(--w-fs-xs); }
.range { flex: 1; min-width: 6rem; accent-color: var(--w-accent); }
.mx { font-variant-numeric: tabular-nums; color: var(--w-accent); min-width: 3.2em; text-align: right; font-weight: 400; }
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
.avg { cursor: default; border-top: 1px dashed var(--w-line); border-bottom: 1px dashed var(--w-line); }
.avg .uqName { color: var(--w-fg); }
.fold { border-top: 1px solid var(--w-line); padding-top: 6px; }
.foldHead { font-size: var(--w-fs-xs); }
</style>
