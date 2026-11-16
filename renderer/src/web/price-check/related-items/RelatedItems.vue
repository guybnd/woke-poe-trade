<template>
  <div v-if="result" :class="$style.wrapper" class="w-pc-side">
    <div v-if="'error' in result" class="p-2">
      {{ result.error }}
    </div>
    <template v-if="'related' in result && result.related.length > 1">
      <div :class="$style.hd">
        <span>{{ result.label ?? `Related to ${item!.info.name}` }}</span>
        <span v-if="result.label" :class="$style.count">{{ result.related.length }} · poe.ninja</span>
      </div>
      <!-- woke: a click price checks the row's item; nothing searches before that. -->
      <div :class="$style.list">
        <div v-for="row in result.related" :key="row.name" v-item-tip="{ name: row.name }"
          :class="[$style.row, { [$style.me]: row.highlight, [$style.click]: row.check && !row.highlight }]"
          @click="!row.highlight && row.check && $emit('check', row.check)">
          <img :class="$style.art" :src="row.icon" :alt="''">
          <span :class="$style.name">{{ row.name }}</span>
          <span :class="$style.price">
            <template v-if="row.price">{{ priceText(row.price) }}<img :class="$style.coin" :src="coin(row.price)" :alt="row.price.currency"></template>
            <span v-else :class="$style.none" title="poe.ninja has no price for this">?</span>
          </span>
        </div>
      </div>
      <div v-if="result.label" :class="$style.ft">Click to price check</div>
    </template>
    <template v-if="'items' in result && result.items.length">
      <div :class="$style.hd">Drops in {{ item!.info.name }}</div>
      <div v-for="row in result.items" :key="row.name" v-item-tip="{ name: row.name }" :class="$style.row">
        <img :class="$style.art" :src="row.icon" :alt="''">
        <span :class="$style.name">{{ row.name }}</span>
        <span :class="$style.price">
          <template v-if="row.price">{{ priceText(row.price) }}<img :class="$style.coin" :src="coin(row.price)" :alt="row.price.currency"></template>
          <span v-else :class="$style.none" title="poe.ninja has no price for this">?</span>
        </span>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from 'vue'
import { BaseType, ITEM_BY_REF, ITEM_DROP, ITEMS_ITERATOR } from '@/assets/data'
import { usePoeninja, CurrencyValue, displayRounding } from '@/web/background/Prices'
import { getDetailsId } from '../trends/getDetailsId'
import { vItemTip } from '@/web/woke/ui/tooltip/item-tip'
import { ParsedItem } from '@/parser'
import { AppConfig } from '@/web/Config'
import { priceCheckInput, type PriceCheckInput } from '@/web/woke/ui/tooltip/item-menu-logic'
import { familyOf, familyRows } from '@/web/woke/related-family/family'

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

interface RelatedRow { name: string, icon: string, price?: CurrencyValue, highlight: boolean, check?: PriceCheckInput | null }

// woke: what a click on a row price checks: a stackable item as the game copies it.
function checkInput (info: BaseType): PriceCheckInput | null {
  if (info.namespace !== 'ITEM') return null
  return priceCheckInput({ name: info.refName }, 'item', info, AppConfig().language === 'en')
}

// woke: the rest of a bulk item's family (fossils, catalysts, essences of its
// tier...), dearest first, from the item data and poe.ninja rows already loaded.
function getFamily (item: ParsedItem) {
  const fam = familyOf(item.info, needle => ITEMS_ITERATOR(needle))
  if (!fam) return null
  const rows = familyRows(fam, item.info.refName, ref => findPriceByQuery({ ns: 'ITEM', name: ref, variant: undefined })?.chaos ?? null)
  return {
    label: fam.label,
    related: rows.map((row): RelatedRow => ({
      name: row.info.name,
      icon: row.info.icon,
      price: row.chaos != null ? autoCurrency(row.chaos) : undefined,
      highlight: row.own,
      check: checkInput(row.info)
    }))
  }
}

function getItemPrices (queryId: string) {
  const dropEntry = ITEM_DROP.find(entry => entry.query.includes(queryId))
  if (!dropEntry) return null

  const out = {
    label: undefined as string | undefined,
    related: [] as RelatedRow[],
    items: [] as Array<{ name: string, icon: string, price?: CurrencyValue, chaos: number }>
  }
  for (const itemId of dropEntry.query) {
    const dbItem = findItemByQueryId(itemId)
    if (!dbItem) return { error: `Can't find "${itemId}".` }

    out.related.push({
      icon: dbItem.icon,
      name: dbItem.name,
      price: findPriceByQueryId(itemId),
      highlight: (itemId === queryId),
      check: checkInput(dbItem)
    })
  }
  for (const itemId of dropEntry.items) {
    const dbItem = findItemByQueryId(itemId)
    if (!dbItem) return { error: `Can't find "${itemId}".` }

    const price = findPriceByQueryId(itemId)
    out.items.push({
      icon: dbItem.icon,
      name: dbItem.name,
      price,
      chaos: !price ? -1 : (price.currency === 'div' ? price.max * (xchgRate.value ?? 1) : price.max)
    })
  }
  out.items.sort((a, b) => b.chaos - a.chaos)

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
  setup (props) {
    const { updatedAt } = usePoeninja()
    const result = computed(() => {
      if (!props.item) return
      // Prices arrive after the panel first shows.
      void updatedAt.value

      const queryId = getDetailsId(props.item)
      const drops = queryId
        ? getItemPrices(`${queryId.ns}::${queryId.name}${queryId.variant ? ` // ${queryId.variant}` : ''}`)
        : null
      const family = getFamily(props.item)
      if (!family) return drops ?? undefined
      // The family list replaces the drop table's own short list, and keeps
      // what the item drops (none of the families drop anything).
      if (drops && 'items' in drops) return { ...drops, ...family }
      return { ...family, items: [] }
    })

    return {
      result,
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
  min-height: 30px;
  padding: 2px 12px;
  border-bottom: 1px solid var(--w-line-soft);
}
.row:last-child { border-bottom: 0; }
.count { font-family: var(--w-body); font-size: var(--w-fs-sm); color: var(--w-faint); white-space: nowrap; }
/* woke: a long family scrolls inside the panel; the panel never outgrows the window. */
.list { max-height: min(26rem, 60vh); overflow-y: auto; overscroll-behavior: contain; }
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
