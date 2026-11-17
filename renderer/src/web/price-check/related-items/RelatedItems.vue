<template>
  <div v-if="result" :class="$style.wrapper" class="w-pc-side">
    <div v-if="'error' in result" class="p-2">
      {{ result.error }}
    </div>
    <!-- woke: the item's family, its drop group, what it drops: one row and one
         click for every section. A click price checks the row's item the way the
         item menu's Price button does; nothing searches before that. -->
    <template v-for="sec in sections" :key="sec.title">
      <div :class="$style.hd">
        <span>{{ sec.title }}</span>
        <span v-if="sec.family" :class="$style.count">{{ sec.rows.length }} · poe.ninja</span>
      </div>
      <div :class="[$style.list, { [$style.tight]: sec.family }]">
        <div v-for="row in sec.rows" :key="row.name" v-item-tip="{ name: row.name }"
          :class="[$style.row, { [$style.me]: row.highlight, [$style.click]: canOpen(row) }]"
          @click="open(row)">
          <img :class="$style.art" :src="row.icon" :alt="''">
          <span :class="$style.name">{{ row.name }}</span>
          <span :class="$style.price">
            <template v-if="row.price">{{ priceText(row.price) }}<img :class="$style.coin" :src="coin(row.price)" :alt="row.price.currency"></template>
            <span v-else :class="$style.none" title="poe.ninja has no price for this">?</span>
          </span>
        </div>
      </div>
    </template>
    <div v-if="sections.some(sec => sec.rows.some(canOpen))" :class="$style.ft">Click to price check</div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from 'vue'
import { BaseType, ITEM_BY_REF, ITEM_DROP, ITEMS_ITERATOR } from '@/assets/data'
import { usePoeninja, CurrencyValue, displayRounding } from '@/web/background/Prices'
import { getDetailsId } from '../trends/getDetailsId'
import { vItemTip } from '@/web/woke/ui/tooltip/item-tip'
import { ParsedItem } from '@/parser'
import { canPriceCheck, priceCheckRequest } from '@/web/woke/ui/tooltip/item-price-check'
import type { ItemMenuRef } from '@/web/woke/ui/tooltip/item-menu-logic'
import { familyOf, familyRows, type Family } from '@/web/woke/related-family/family'

const { findPriceByQuery, autoCurrency, xchgRate } = usePoeninja()

function findItemByQueryId (queryId: string): BaseType | undefined {
  const [ns, encodedName] = queryId.split('::')
  const [name, variant] = encodedName.split(' // ')
  let found = ITEM_BY_REF(ns as unknown as BaseType['namespace'], name)
  if (found && ns === 'UNIQUE') {
    const filtered = found.filter(unique => unique.unique!.base === variant)
    if (filtered.length) found = filtered
  }
  // return any first item
  if (found && found.length) return found[0]
}

function findPriceByQueryId (queryId: string) {
  const [ns, encodedName] = queryId.split('::')
  const [name, variant] = encodedName.split(' // ')
  const priceEntry = findPriceByQuery({ ns, name, variant })
  if (priceEntry) {
    return autoCurrency(priceEntry.chaos)
  }
}

// woke: every row of the side window, whatever its section.
interface SideRow { name: string, icon: string, price?: CurrencyValue, highlight: boolean, ref: ItemMenuRef, clickable: boolean }

// The item menu's reference for a data item: its English name and what kind it is.
const KIND_OF_NS: Partial<Record<BaseType['namespace'], Partial<ItemMenuRef>>> = {
  UNIQUE: { rarity: 'unique' },
  DIVINATION_CARD: { type: 'DivinationCard' },
  GEM: { type: 'SkillGem' }
}
function sideRow (info: BaseType, price: CurrencyValue | undefined, highlight: boolean): SideRow {
  const ref: ItemMenuRef = { name: info.refName, ...KIND_OF_NS[info.namespace] }
  return { name: info.name, icon: info.icon, price, highlight, ref, clickable: canPriceCheck(ref) }
}

// woke: the rest of a bulk item's family (fossils, catalysts, essences of its
// tier...), dearest first, from the item data and poe.ninja rows already loaded.
// Members come from a scan of the item data, so each family is read once.
const familyCache = new Map<string, Family | null>()
function cachedFamily (info: BaseType): Family | null {
  const key = `${info.namespace}::${info.refName}`
  if (!familyCache.has(key)) {
    familyCache.set(key, familyOf(info, needle => ITEMS_ITERATOR(needle), ref => ITEM_BY_REF('ITEM', ref)?.[0]))
  }
  return familyCache.get(key)!
}

function getFamily (item: ParsedItem) {
  const fam = cachedFamily(item.info)
  if (!fam) return null
  const rows = familyRows(fam, item.info.refName, ref => findPriceByQuery({ ns: 'ITEM', name: ref, variant: undefined })?.chaos ?? null)
  return {
    label: fam.label,
    related: rows.map(row => sideRow(row.info, row.chaos != null ? autoCurrency(row.chaos) : undefined, row.own))
  }
}

function getItemPrices (queryId: string) {
  const dropEntry = ITEM_DROP.find(entry => entry.query.includes(queryId))
  if (!dropEntry) return null

  const out = {
    label: undefined as string | undefined,
    related: [] as SideRow[],
    items: [] as SideRow[]
  }
  for (const itemId of dropEntry.query) {
    const dbItem = findItemByQueryId(itemId)
    if (!dbItem) return { error: `Can't find "${itemId}".` }

    out.related.push(sideRow(dbItem, findPriceByQueryId(itemId), itemId === queryId))
  }
  const chaosOf = (price?: CurrencyValue) => !price ? -1 : (price.currency === 'div' ? price.max * (xchgRate.value ?? 1) : price.max)
  for (const itemId of dropEntry.items) {
    const dbItem = findItemByQueryId(itemId)
    if (!dbItem) return { error: `Can't find "${itemId}".` }

    out.items.push(sideRow(dbItem, findPriceByQueryId(itemId), false))
  }
  out.items.sort((a, b) => chaosOf(b.price) - chaosOf(a.price))

  return out
}

export default defineComponent({
  directives: { itemTip: vItemTip },
  props: {
    item: {
      type: Object as PropType<ParsedItem | null>,
      default: null
    },
    clickPosition: {
      type: String,
      required: true
    }
  },
  emits: ['check'],
  setup (props, { emit }) {
    const { updatedAt } = usePoeninja()
    const result = computed(() => {
      // Prices arrive after the panel first shows.
      if (!props.item || updatedAt.value === undefined) return

      const queryId = getDetailsId(props.item)
      const drops = queryId
        ? getItemPrices(`${queryId.ns}::${queryId.name}${queryId.variant ? ` // ${queryId.variant}` : ''}`)
        : null
      const family = getFamily(props.item)
      if (!family) return drops ?? undefined
      if (!drops || 'error' in drops) return { ...family, items: [], dropRelated: [] as SideRow[] }
      // The drop group stays when it adds items (an essence's other tiers), and
      // what the item drops leaves out what the family already lists.
      const listed = new Set(family.related.map(r => r.name))
      return {
        ...family,
        dropRelated: drops.related.some(r => !listed.has(r.name)) ? drops.related : [],
        items: drops.items.filter(r => !listed.has(r.name))
      }
    })

    interface Section { title: string, family: boolean, rows: SideRow[] }
    const sections = computed<Section[]>(() => {
      const res = result.value
      if (!res || !('related' in res)) return []
      const out: Section[] = []
      if (res.related.length > 1) out.push({ title: res.label ?? `Related to ${props.item!.info.name}`, family: res.label != null, rows: res.related })
      if ('dropRelated' in res && res.dropRelated.length > 1) out.push({ title: `Related to ${props.item!.info.name}`, family: false, rows: res.dropRelated })
      if (res.items.length) out.push({ title: `Drops in ${props.item!.info.name}`, family: false, rows: res.items })
      return out
    })

    const canOpen = (row: SideRow) => row.clickable && !row.highlight
    async function open (row: SideRow) {
      if (!canOpen(row)) return
      const input = await priceCheckRequest(row.ref)
      if (input) emit('check', input)
    }

    return {
      result,
      sections,
      canOpen,
      open,
      priceText: (price: CurrencyValue) => (price.min === price.max)
        ? displayRounding(price.min, true)
        : `${displayRounding(price.min, true)}–${displayRounding(price.max, true)}`,
      coin: (price: CurrencyValue) => (price.currency === 'div') ? '/images/divine.png' : '/images/chaos.png'
    }
  }
})
</script>

<style lang="postcss" module>
.wrapper {
  width: 17.5rem;
  max-width: 100%;
  margin-top: 1.5rem;
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-md);
  overflow: hidden;
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
  box-shadow: var(--w-shadow);
}
.hd {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  padding: 6px 12px;
  background: var(--w-panel-solid);
  border-bottom: 1px solid var(--w-line);
  font-family: var(--w-head);
  font-size: var(--w-fs-lg);
  color: var(--w-accent);
}
.row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 36px;
  padding: 2px 12px;
  border-bottom: 1px solid var(--w-line-soft);
}
.row:last-child { border-bottom: 0; }
.count { font-family: var(--w-body); font-size: var(--w-fs-sm); color: var(--w-faint); white-space: nowrap; }
/* woke: a long family scrolls inside the panel; the panel never outgrows the window. */
.list { max-height: min(26rem, 60vh); overflow-y: auto; overscroll-behavior: contain; }
.tight .row { min-height: 30px; }
.click { cursor: pointer; }
.click:hover { background: var(--w-panel-3); }
.ft { padding: 4px 12px; border-top: 1px solid var(--w-line); font-size: var(--w-fs-sm); color: var(--w-faint); }
.me { background: var(--w-accent-soft); }
.art { width: 28px; height: 28px; object-fit: contain; }
.name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #d98a4a; }
.price { display: inline-flex; align-items: center; gap: 3px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
.coin { width: 16px; height: 16px; object-fit: contain; }
.none { color: var(--w-faint); font-weight: 400; }
</style>
