<template>
  <div :class="$style.wrap" @focusin="open = true" @focusout="onFocusOut">
    <WField :model-value="modelValue" type="search" icon="fas fa-search" placeholder="Find any item, or paste one" style="width: 19rem;"
      @update:model-value="onType" @paste="onPaste"
      @keydown.enter.prevent="pick(rows[hl])" @keydown.down.prevent="step(1)" @keydown.up.prevent="step(-1)" />
    <div v-if="open && doc && modelValue.trim().length >= 2" :class="$style.list" role="listbox" @mousedown.prevent>
      <div v-if="rows.some(r => r.item.gear)" :class="$style.chips">
        <span class="w-faint text-xs">Gear as</span>
        <WChip v-for="r in RARITIES" :key="r" clickable :active="rarity === r" @click="rarity = r">{{ r }}</WChip>
      </div>
      <button v-for="(r, i) in rows" :key="`${r.item.kind}|${r.item.name}`" type="button" role="option" :aria-selected="i === hl"
        :class="[$style.row, { [$style.hl]: i === hl }]" :title="r.title" @mouseenter="hl = i" @click="pick(r)">
        <img v-if="r.icon" :src="r.icon" :class="$style.art" alt="">
        <span v-else :class="$style.art" />
        <span :class="$style.text">
          <LabelPreview :text="r.text" :actions="r.match.actions" :visibility="r.match.visibility" :extras="false" style="max-width: 100%; overflow: hidden;" />
          <span class="w-dim text-xs w-trunc">{{ r.line }}</span>
        </span>
      </button>
      <div v-if="!rows.length" class="w-faint text-xs" :class="$style.none">No item matches "{{ modelValue.trim() }}". A rare's name is random: search its base, or copy it in game (Ctrl+C) and paste it here.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { WChip, WField } from '../ui'
import { gameIcon } from '../ui/game-icons'
import LabelPreview from './LabelPreview.vue'
import { baseIcon } from './label-style'
import { matchItem } from './match'
import type { MatchResult } from './match'
import { itemFacts } from './item-facts'
import type { FilterRarity, ItemFacts } from './item-facts'
import { parseClipboard } from '@/parser'
import { filterClasses, itemCatalog, searchFacts, searchItems } from './item-search'
import type { SearchItem } from './item-search'
import { ruleLabel } from './parse'
import type { FilterDoc } from './parse'

// `drop`: a pick lands on the Preview ground instead of opening its rule.
const props = defineProps<{ modelValue: string, doc: FilterDoc | null, areaLevel: number, drop?: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'open-rule', rule: { type: string, tier: string | null, base: string }): void
  (e: 'drop-item', pick: { item: SearchItem, rarity: FilterRarity, facts?: ItemFacts }): void
}>()

const RARITIES = ['Normal', 'Magic', 'Rare'] as const
const open = ref(false)
const hl = ref(0)
// Gear shows as a rare unless you say otherwise: what most people check.
const rarity = ref<FilterRarity>('Rare')

// `facts`: a pasted copy, matched as it is, mods and all.
interface Row { item: SearchItem, text: string, line: string, title: string, icon: string | null, match: MatchResult, facts?: ItemFacts }

// The last item pasted, while the box still shows its title.
const pasted = ref<{ query: string, item: SearchItem, facts: ItemFacts } | null>(null)

const dataTick = ref(0)
const classes = computed(() => props.doc ? filterClasses(props.doc) : new Map<string, string>())
const rows = computed<Row[]>(() => {
  const q = props.modelValue
  const doc = props.doc
  if (!doc || q.trim().length < 2) return []
  // Reading the tick makes this run again once it moves.
  const list = dataTick.value >= 0 ? itemCatalog() : []
  // Game data still loading: look again shortly, or the list stays empty.
  if (!list.length) setTimeout(() => { dataTick.value++ }, 500)
  const copy = pasted.value?.query === q ? pasted.value : null
  const found = searchItems(list, q).filter(item => !copy || item !== copy.item).map(item => {
    const facts = searchFacts(item, { areaLevel: props.areaLevel, rarity: rarity.value, classes: classes.value })
    const match = matchItem(doc, facts, { brief: true })
    const block = match.final?.block
    const rule = block ? ruleLabel(block.type, block.tier) : 'no rule, the game default'
    const hidden = match.visibility === 'Hide' ? 'Hidden · ' : ''
    // A unique lies unidentified, under its base's name.
    const who = item.kind === 'Unique' ? `${item.name} · ` : item.gear ? `${rarity.value} · ` : ''
    return {
      item,
      text: facts.baseType ?? item.name,
      line: `${who}${hidden}${rule}`,
      title: `${item.name}, as it drops in an area of level ${props.areaLevel}`,
      icon: item.kind === 'Unique' ? (gameIcon(item.name, 'UNIQUE') ?? baseIcon(item.baseType)) : (baseIcon(item.baseType) ?? baseIcon(item.name)),
      match
    }
  })
  return copy ? [pastedRow(doc, copy), ...found] : found
})

function pastedRow (doc: FilterDoc, copy: { item: SearchItem, facts: ItemFacts }): Row {
  const facts = { ...copy.facts, areaLevel: copy.facts.areaLevel ?? props.areaLevel }
  const match = matchItem(doc, facts, { brief: true })
  const block = match.final?.block
  const rule = block ? ruleLabel(block.type, block.tier) : 'no rule, the game default'
  const hidden = match.visibility === 'Hide' ? 'Hidden · ' : ''
  const ilvl = facts.itemLevel != null ? ` · item level ${facts.itemLevel}` : ''
  return {
    item: copy.item,
    text: facts.baseType ?? copy.item.name,
    line: `Pasted ${facts.rarity ?? 'item'}${ilvl} · ${hidden}${rule}`,
    title: `${facts.name || copy.item.name}, as you copied it, with its mods`,
    icon: baseIcon(copy.item.baseType),
    match,
    facts
  }
}

// A copied item (Ctrl+C in game) keeps its lines here; the box itself
// would run them together. Matched with its real mods and item level.
function onPaste (e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text/plain') ?? ''
  if (!/^Item Class:/m.test(text) || !/^Rarity:/m.test(text)) return
  e.preventDefault()
  const facts = itemFacts(text, parseClipboard(text).unwrapOr(null))
  if (!facts.baseType) return
  const base = itemCatalog().find(i => i.name === facts.baseType && i.kind !== 'Unique')
  const item: SearchItem = base ?? {
    name: facts.baseType,
    kind: 'Item',
    baseType: facts.baseType,
    itemClass: facts.itemClass,
    gear: false,
    w: facts.width ?? 1,
    h: facts.height ?? 1
  }
  // The copy's name lines run together: "Doom Nails Spike-Point Arrow Quiver".
  const own = facts.name.endsWith(facts.baseType) ? facts.name.slice(0, -facts.baseType.length).trim() : ''
  const name = own ? `${own}, ${facts.baseType}` : facts.baseType
  pasted.value = { query: name, item, facts }
  if (facts.rarity === 'Normal' || facts.rarity === 'Magic' || facts.rarity === 'Rare') rarity.value = facts.rarity
  onType(name)
}
watch(() => props.modelValue, () => { hl.value = 0 })

function onType (v: string | number) {
  open.value = true
  emit('update:modelValue', String(v))
}

function step (dir: 1 | -1) {
  const n = rows.value.length
  if (n) hl.value = (hl.value + dir + n) % n
}

function pick (r: Row | undefined) {
  if (!r) return
  open.value = false
  if (props.drop) {
    emit('drop-item', { item: r.item, rarity: r.facts?.rarity === 'Normal' || r.facts?.rarity === 'Magic' || r.facts?.rarity === 'Rare' ? r.facts.rarity : rarity.value, facts: r.facts })
    // Ready for the next one.
    emit('update:modelValue', '')
    return
  }
  const block = r.match.final?.block
  if (!block?.type) return
  emit('open-rule', { type: block.type, tier: block.tier ?? null, base: r.item.baseType })
}

function onFocusOut (e: FocusEvent) {
  const to = e.relatedTarget as Node | null
  if (!to || !(e.currentTarget as HTMLElement).contains(to)) open.value = false
}
</script>

<style module>
.wrap { position: relative; }
.list {
  position: absolute;
  top: calc(100% + 2px);
  right: 0;
  z-index: 20;
  width: 26rem;
  max-height: 30rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-sm);
  background: var(--w-panel-solid);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
}
.chips { display: flex; align-items: center; gap: 4px; padding: 4px 6px; border-bottom: 1px solid var(--w-line); }
.row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  background: none;
  border: 0;
  color: var(--w-fg);
  text-align: left;
  cursor: pointer;
  min-width: 0;
}
.hl { background: var(--w-accent-soft); }
.art { width: 18px; height: 18px; object-fit: contain; flex: none; }
.text { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; align-items: flex-start; }
.none { padding: 4px 6px; }
</style>
