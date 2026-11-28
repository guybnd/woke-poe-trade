<template>
  <!-- Alt+F on an item Currency weights decides (Guy's picks B, S, W1): its
       category, Hide / By price / Always, a Worth × slider and the stack each
       step starts at. -->
  <div v-if="it" :class="$style.card" data-currency-card>
    <div :class="$style.top">
      <button type="button" :class="$style.cat" class="w-focusable" :style="{ '--c': catCss }" :title="`Open ${catName} on the Loot tab`" data-currency-card-cat
        @click="emit('open-tab', it.cat, it.name)"><i aria-hidden="true" />{{ catName }}</button>
      <span class="grow" />
      <span class="text-xs w-dim">{{ chaosText(base) }} each · {{ edit.price != null ? 'your price' : it.est ? 'guess' : 'poe.ninja' }}<template v-if="stack > 1"> · stack {{ stack }}/{{ Math.max(stack, it.full) }}</template></span>
    </div>

    <div :class="$style.row" data-currency-card-section>
      <span :class="$style.lab">{{ catName }}</span>
      <WSegmented :model-value="secMode" :options="SECTION_MODES" @update:model-value="setSecMode" />
    </div>
    <div :class="$style.row" data-currency-card-item>
      <span :class="$style.lab">This item</span>
      <WSegmented :model-value="mode" :options="MODES" @update:model-value="setMode" />
    </div>
    <label v-if="it && kindOf(it.cat) === 'cards'" :class="$style.row" data-currency-card-collect>
      <span :class="$style.lab">Collecting</span>
      <input type="checkbox" :checked="!!edit.min" @change="toggleCollect"> <span class="text-xs w-dim">every stack shows at least Normal</span>
    </label>

    <div :class="$style.row">
      <span :class="$style.lab">Worth ×</span>
      <span class="text-xs w-faint">penalty</span>
      <input type="range" :min="MULT_MIN" :max="MULT_MAX" step="0.05" :value="dragMult ?? mult" :class="$style.range" :disabled="mode !== 'auto' || secMode === 'off'"
        aria-label="Worth multiplier for this item" data-currency-card-mult
        @input="dragMult = Number(($event.target as HTMLInputElement).value)" @change="commitMult(($event.target as HTMLInputElement).value)">
      <span class="text-xs w-faint">bonus</span>
      <span :class="$style.mx">×{{ (dragMult ?? mult).toFixed(2) }}</span>
      <button v-if="mult !== 1" type="button" class="w-icon-btn" title="Back to ×1" aria-label="Worth back to ×1" @click="commitMult('1')"><i aria-hidden="true" class="fas fa-undo" /></button>
    </div>

    <table :class="$style.steps" aria-label="The stack each step starts at">
      <thead><tr><th>Step</th><th>Stack</th><th>Pile worth</th></tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="r.step" :class="{ [$style.cur]: r.step === now, [$style.never]: r.from == null }">
          <td><LabelPreview :text="r.from != null && r.from > 1 ? `${r.from}x ${it.name}` : it.name" :actions="[]" :style-override="r.look" visibility="Show" :extras="false" :scale="0.7" /></td>
          <td>{{ r.from == null ? 'never' : r.from > 1 ? `${r.from}+` : 'any' }}</td>
          <td class="w-dim">{{ r.note }}</td>
        </tr>
      </tbody>
    </table>
    <div class="text-xs w-dim" data-currency-card-now>{{ nowLine }}</div>
    <div v-if="floorLine" class="text-xs w-dim" data-currency-card-floor>{{ floorLine }}</div>

    <div :class="$style.fold">
      <WFoldHead fold="alt-f.currency-more" :class="$style.foldHead"><span>Own price, supply stack, own look</span></WFoldHead>
      <CurrencyItemEditor v-if="open.more" :it="it" :edit="edit" :step="now" :base-price="base" :base-look="currencyFullLook(now === 0 ? 1 : now, it.cat, cfg)" @change="setEdit" />
    </div>
  </div>
  <div v-else class="flex items-center gap-2 text-xs w-dim" data-currency-card-place>
    <span class="grow">{{ placeLine }}</span>
    <WButton v-if="openTier" size="sm" data-currency-card-open @click="emit('open-rule', openTier)">Open</WButton>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useFold } from '../ui/fold'
import WFoldHead from '../ui/WFoldHead.vue'
import { WButton, WSegmented } from '../ui'
import LabelPreview from './LabelPreview.vue'
import { ITEM_MODES, SECTION_MODES } from './section-modes'
import CurrencyItemEditor from './CurrencyItemEditor.vue'
import { CSTEP_NAMES, ALL_CATEGORIES, kindOf, CURRENCY_TYPE, MULT_MAX, MULT_MIN, catColour, currencyFullLook, currencyItems, faintOn, forcedHidden, offSteps, scaled, sectionMode, stacksFor, stepOfPile, stepStarts, withEdit } from './currency-weights'
import { cardFacts, loadCardFacts } from './card-facts'
import { gemLinesOf } from './gem-classes'
import { LEAGUE_SECTIONS } from './league-classes'
import { gemItemFor, itemFor, lootFocus } from './loot-focus'
import type { CStep, CurrencyItem, ItemEdit, SectionMode } from './currency-weights'
import type { StylePatch } from './edits'
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
}>()
// The item's category and the name its row has on the Loot tab.
const emit = defineEmits<{ 'open-tab': [cat: string, name: string], 'open-rule': [tier: string] }>()

const open = reactive({ more: useFold('alt-f.currency-more') })
// The whole category (Guy 2026-11-27: every section has Hide / By price /
// Always, and Alt+F sets the section or just the item).
const MODES = ITEM_MODES

const cfg = computed(() => props.config.presets.currency)
const eff = computed(() => scaled(cfg.value, props.store.doc.value?.strictness ?? null))
// The item as the filter lists it, with poe.ninja's price (none of yours).
const raw = computed<CurrencyItem | null>(() => {
  const doc = props.store.doc.value
  const lookup = props.store.prices.lootLookup.value
  if (!doc || !lookup) return null
  loadCardFacts()
  const all = currencyItems({ ...doc, blocks: doc.blocks.filter(b => b.type !== CURRENCY_TYPE) }, lookup, {}, cardFacts.value, props.gem ? gemLinesOf(props.store.prices.items.value) : null)
  if (!props.gem) return itemFor(all, props.name, props.rule)
  return gemItemFor(all, props.name, props.gem, props.rule)
})
// The row's name on the Loot tab ("Arc 20/20" for a gem band).
const itemName = computed(() => raw.value?.name ?? props.name)
const edit = computed<ItemEdit>(() => cfg.value.items[itemName.value] ?? {})
const it = computed(() => raw.value && withEdit(raw.value, edit.value))
const base = computed(() => edit.value.price ?? raw.value?.chaos ?? 0)
const mult = computed(() => edit.value.mult ?? 1)
const dragMult = ref<number | null>(null)

const catName = computed(() => ALL_CATEGORIES.find(x => x.id === it.value?.cat)?.name ?? 'Other')
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
const mode = computed(() => edit.value.step === 0 ? 'off' : edit.value.supply === 1 && edit.value.step == null ? 'always' : 'auto')
const stacks = computed(() => it.value ? stacksFor(it.value, eff.value) : [null, null, null, null, null])
const off = computed(() => it.value ? offSteps(it.value, cfg.value) : [])
const now = computed<CStep>(() => stepOfPile(stacks.value, props.stack, off.value))
const starts = computed(() => stepStarts(eff.value, it.value?.cat ?? ''))

// Rules the Loot tab writes that aren't an item's price step (Guy's picks
// alt-f-hides and alt-f-floors, 2026-11-28): say which one caught it.
const SECTION_NAMES: Record<string, string> = { gemexc: 'Exceptional gems', gemawk: 'Awakened gems', gemtrans: 'Transfigured gems', gemvaal: 'Vaal gems', gemsup: 'Supports', gemskill: 'Skill gems' }
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
const openTier = computed(() => /: recipe: /.test(props.note ?? '') ? 'recipes' : props.tier && lootFocus(props.tier) ? props.tier : null)

interface Row { step: CStep, from: number | null, note: string, look: StylePatch }
const rows = computed<Row[]>(() => !it.value
  ? []
  : ([1, 2, 3, 4, 5] as CStep[]).map(s => ({
      step: s,
      from: stacks.value[s - 1],
      note: edit.value.step != null ? (edit.value.step === s ? 'set by you' : '') : off.value.includes(s) ? 'off: these piles hide' : `from ${chaosText(starts.value[s - 1])}`,
      look: currencyFullLook(s, it.value!.cat, cfg.value)
    })))
const nowLine = computed(() => {
  const s = now.value
  if (mode.value === 'off') return 'Hidden: no pile of it shows.'
  // An Off section hides it unless the item shows anyway (its own step,
  // Always or Collecting): read what the rules give it, not the mode.
  if (secMode.value === 'off' && stacks.value.every(k => k == null)) return `Hidden: ${catName.value} is set to Hide.`
  const next = rows.value.find(r => r.step > stepOfPile(stacks.value, props.stack) && r.from != null && !off.value.includes(r.step))
  const pile = props.stack > 1 ? `A pile of ${props.stack}` : 'One'
  // Under the line with Faint on, it shows small and see-through.
  const name = s === 0 && it.value && stepOfPile(stacks.value, props.stack) === 0 && faintOn(cfg.value, props.store.doc.value?.strictness ?? null) && !forcedHidden(it.value, cfg.value) ? 'Faint' : CSTEP_NAMES[s]
  const why = s === 0 && stepOfPile(stacks.value, props.stack) !== 0 ? ` (${CSTEP_NAMES[stepOfPile(stacks.value, props.stack)]} is off)` : ''
  return `${pile} is ${name}${why}${next ? `; ${CSTEP_NAMES[next.step]} from a stack of ${next.from}` : ''}.`
})

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
  if (v === 'off') put({ step: 0, supply: undefined })
  else if (v === 'always') put({ step: undefined, supply: 1 })
  else put({ step: undefined, supply: edit.value.supply === 1 ? undefined : edit.value.supply })
}
// Applies on release (Guy: sliders apply when you let go).
function commitMult (v: string) {
  dragMult.value = null
  const n = Math.min(MULT_MAX, Math.max(MULT_MIN, Math.round(Number(v) * 20) / 20))
  put({ mult: !Number.isFinite(n) || n === 1 ? undefined : n })
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
.top { display: flex; align-items: center; gap: 8px; }
.cat {
  display: inline-flex; align-items: center; gap: 5px;
  border: 1px solid var(--c); border-radius: 10px; padding: 0 9px 0 7px;
  color: var(--c); background: var(--w-panel-2); font-size: var(--w-fs-sm); cursor: pointer;
}
.cat i { width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
.row { display: flex; align-items: center; gap: 8px; font-size: var(--w-fs-sm); }
.lab { color: var(--w-dim); min-width: 4.5rem; font-size: var(--w-fs-xs); }
.range { flex: 1; min-width: 6rem; accent-color: var(--w-accent); }
.mx { font-variant-numeric: tabular-nums; color: var(--w-accent); min-width: 3.2em; text-align: right; }
.steps { width: 100%; border-collapse: collapse; font-size: var(--w-fs-sm); }
.steps th { text-align: left; font-weight: 400; color: var(--w-faint); font-size: var(--w-fs-xs); padding: 0 6px 2px; }
.steps td { padding: 3px 6px; border-top: 1px solid var(--w-line); white-space: nowrap; }
.cur td { background: var(--w-panel-2); }
.cur td:first-child { box-shadow: inset 2px 0 0 var(--w-accent); }
.never td { opacity: .5; }
.fold { border-top: 1px solid var(--w-line); padding-top: 6px; }
.foldHead { font-size: var(--w-fs-xs); }
</style>
