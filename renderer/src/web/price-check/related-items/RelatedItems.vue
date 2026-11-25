<template>
  <div v-if="result || sections.length || keystones" :class="$style.wrapper" class="w-pc-side" data-goto-spot="related">
    <div v-if="result && 'error' in result" class="p-2">
      {{ result.error }}
    </div>
    <!-- woke: a Timeless jewel's keystones, one per conqueror. A click ticks that
         conqueror's line alone with no number and searches once (CheckedItem.vue). -->
    <template v-if="keystones">
      <div :class="$style.hd"><span>Keystones</span><span :class="$style.count">any number</span></div>
      <div :class="$style.list">
        <button v-for="k in keystones" :key="k.id" type="button" v-item-tip="k.tip" data-keystone-row
          :class="[$style.row, $style.click, { [$style.me]: k.own }]" @click="pickKeystone(k.id)">
          <span :class="$style.ks" />
          <span :class="$style.kname">{{ k.name }}<span :class="$style.kby">{{ k.by }}</span></span>
          <span />
        </button>
      </div>
      <div :class="$style.ft">Click: search that keystone, any number</div>
    </template>
    <!-- woke: the item's family, its drop group, what it drops: one row and one
         click for every section. A click price checks the row's item the way the
         item menu's Price button does; nothing searches before that. -->
    <template v-for="sec in sections" :key="sec.key">
      <div :class="$style.hd">
        <span>{{ sec.title }}</span>
        <span v-if="sec.family" :class="$style.count">{{ sec.rows.length }} · poe.ninja</span>
      </div>
      <div :class="[$style.list, { [$style.tight]: sec.family }]">
        <template v-for="row in sec.rows" :key="row.key">
          <div v-if="row.lead" :class="$style.lead">{{ row.lead }}</div>
          <WItemRow :item="tipOf(row)" :art="false" :info="row.info" :action="canOpen(row) ? 'pick' : null"
            :class="[$style.row, { [$style.me]: row.highlight, [$style.click]: canOpen(row) }]"
            @pick="open(row)">
            <img :class="$style.art" :src="row.icon" :alt="''">
            <span :class="$style.name"><span v-if="row.qty && row.qty > 1" :class="$style.qty">{{ row.qty }} ×</span>{{ row.name }}<span v-if="row.gives" :class="$style.gives">→ {{ row.gives }}</span><span v-if="row.tag" :class="row.ownTag ? $style.kby : $style.tag">{{ row.tag }}</span><span v-if="row.sub?.tip" v-item-tip="row.sub.tip" :class="$style.ksub">{{ row.sub.text }}</span><span v-else-if="row.sub" :class="$style.ksub">{{ row.sub.text }}</span></span>
            <span :class="$style.price">
              <template v-if="row.price">{{ priceText(row.price) }}<img :class="$style.coin" :src="coin(row.price)" :alt="row.price.currency"></template>
              <span v-else :class="$style.none" title="poe.ninja has no price for this">?</span>
            </span>
          </WItemRow>
        </template>
      </div>
      <!-- woke: what the recipe's parts (or a full set) cost, against what it makes. -->
      <div v-if="sec.sum" :class="$style.sum">
        <span>{{ sec.sum.label }} <b>{{ sec.sum.value }}</b><span v-if="sec.sum.missing" :class="$style.none"> + {{ sec.sum.missing }} unpriced</span></span>
        <span v-if="sec.sum.makes">Makes <b>{{ sec.sum.makes }}</b></span>
      </div>
      <div v-if="sec.note" :class="$style.note">{{ sec.note }}</div>
    </template>
    <div v-if="sections.some(sec => sec.rows.some(canOpen))" :class="$style.ft">Click to price check</div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, shallowRef, watch } from 'vue'
import { BaseType, DropEntry, ITEM_BY_REF, ITEM_DROP, ITEMS_ITERATOR } from '@/assets/data'
import { usePoeninja, CurrencyValue, displayRounding } from '@/web/background/Prices'
import { getDetailsId } from '../trends/getDetailsId'
import WItemRow from '@/web/woke/ui/WItemRow.vue'
import type { ItemTipRef } from '@/web/woke/ui/tooltip/item-tip'
import { ParsedItem } from '@/parser'
import { priceCheckRequest } from '@/web/woke/ui/tooltip/item-price-check'
import { sideRow, type SideRow } from './side-row'
import { familiesOf, familyRows, type Family } from '@/web/woke/related-family/family'
import { cardsFor, isFragmentSet, realDrops, recipeBook, recipesOf, recipeSum, recipeTitle, resolveParts } from '@/web/woke/related-family/recipe'
import { loadTipItems, vItemTip } from '@/web/woke/ui/tooltip/item-tip'
import type { Conqueror } from '@/web/woke/related-family/conquest'
import { conquestPick } from '@/web/woke/related-family/conquest-pick'

const { findPriceByQuery, findPricesByName, autoCurrency, xchgRate } = usePoeninja()

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

// woke: the rest of a bulk item's family (fossils, catalysts, essences of its
// tier...), dearest first, from the item data and poe.ninja rows already loaded.
// Members come from a scan of the item data, so each family is read once.
// An item can be in more than one (Tainted Exalted Orb: tainted currency and exalts).
const familyCache = new Map<string, Family[]>()
function cachedFamilies (info: BaseType): Family[] {
  const key = `${info.namespace}::${info.refName}`
  if (!familyCache.has(key)) {
    familyCache.set(key, familiesOf(info, needle => ITEMS_ITERATOR(needle), ref => ITEM_BY_REF('ITEM', ref)?.[0]))
  }
  return familyCache.get(key)!
}

function familySection (fam: Family, own: string) {
  const rows = familyRows(fam, own, ref => findPriceByQuery({ ns: 'ITEM', name: ref, variant: undefined })?.chaos ?? null)
  return {
    label: fam.label,
    related: rows.map(row => sideRow(row.info, row.chaos != null ? autoCurrency(row.chaos) : undefined, row.own, row.info.refName))
  }
}

function getFamily (item: ParsedItem) {
  const fam = cachedFamilies(item.info)[0]
  return fam ? familySection(fam, item.info.refName) : null
}

// The item's other families, after its own.
function otherFamilies (item: ParsedItem) {
  return cachedFamilies(item.info).slice(1).map(fam => familySection(fam, item.info.refName))
}

// woke: the vendor recipes the item makes or is a part of (Lost Unity for one of
// its rings): every part, then what it makes, each with its poe.ninja price.
const findRecipeItem = (name: string) => ITEM_BY_REF('UNIQUE', name)?.[0] ?? ITEM_BY_REF('ITEM', name)?.[0]
// A unique's row is named by its base (as a checked unique's is), else its
// cheapest variant that isn't linked (a 6L price isn't the part's), else the
// row with no variant.
function chaosOf (info: BaseType): number | null {
  const ns = info.namespace
  if (ns === 'UNIQUE') {
    // A unique on several bases (Precursor's Emblem) takes its cheapest, not the first base's.
    const oneBase = (ITEM_BY_REF('UNIQUE', info.refName)?.length ?? 1) <= 1
    const byBase = info.unique && oneBase ? findPriceByQuery({ ns, name: info.refName, variant: info.unique.base }) : null
    if (byBase) return byBase.chaos
    const rows = findPricesByName(ns, info.refName)
    const plain = rows.filter(r => !/\b\dL\b/.test(r.variant ?? ''))
    const pick = (plain.length ? plain : rows).map(r => r.chaos)
    if (pick.length) return Math.min(...pick)
  }
  return findPriceByQuery({ ns, name: info.refName, variant: undefined })?.chaos ?? null
}
const book = () => recipeBook(findRecipeItem, ITEM_DROP)

// The sum line under a section: "Parts 130 c + 1 unpriced", "Makes 5 div".
interface SumLine { label: string, value: string, missing: number, makes?: string | null }
function sumLine (label: string, chaos: number, missing: number, count: number, makes?: number | null): SumLine {
  const none = missing === count
  return {
    label,
    value: none ? '?' : currencyText(autoCurrency(chaos)),
    missing: none ? 0 : missing,
    makes: makes != null ? currencyText(autoCurrency(makes)) : null
  }
}

function getRecipes (item: ParsedItem) {
  const own = item.info.refName
  return recipesOf(own, book()).map(r => {
    const parts = resolveParts(r, own, chaosOf)
    const sum = recipeSum(parts, r.makes, chaosOf)
    const rows = parts.map(p => {
      const each = chaosOf(p.info)
      return { ...sideRow(p.info, each != null ? autoCurrency(each * p.qty) : undefined, p.info.refName === own, `part:${p.info.refName}`), qty: p.qty, lead: p.label }
    })
    const title = recipeTitle(r)
    return {
      key: `recipe:${title}`,
      title,
      rows: [...rows, { ...sideRow(r.makes, sum.makes != null ? autoCurrency(sum.makes) : undefined, r.makes.refName === own, `makes:${r.makes.refName}`), lead: 'Makes' }],
      sum: sumLine('Parts', sum.parts, sum.missing, parts.length, sum.makes),
      note: r.note
    }
  })
}

// woke: the divination cards that give the item, each priced as a full stack.
function getCards (item: ParsedItem, tips: Record<string, { d?: string, n?: number }>) {
  const rows: SideRow[] = []
  for (const c of cardsFor(item.info, tips)) {
    const info = ITEM_BY_REF('DIVINATION_CARD', c.card)?.[0]
    if (!info) continue
    const each = findPriceByQuery({ ns: 'DIVINATION_CARD', name: c.card, variant: undefined })?.chaos
    rows.push({ ...sideRow(info, each != null ? autoCurrency(each * c.stack) : undefined, false, `card:${c.card}`), qty: c.stack, gives: c.gives > 1 ? c.gives : undefined, tag: c.corrupted ? 'corrupted' : undefined })
  }
  return rows.length ? [{ key: 'cards', title: 'Cards that give it', rows }] : []
}

// woke: a fragment set's total, under its list: "Full set 3.2 div".
function setSum (group: DropEntry): SumLine | undefined {
  if (!isFragmentSet(group)) return undefined
  let total = 0
  let missing = 0
  for (const id of group.query) {
    const info = findItemByQueryId(id)
    const each = info ? chaosOf(info) : null
    if (each == null) missing++
    else total += each
  }
  return sumLine('Full set', total, missing, group.query.length)
}

// woke: where the item drops: each drop group that lists it, with what opens it
// (Nimis: the Devouring Fragment), then what else that boss drops, dearest
// first (Dawnbreaker: Forbidden Flame, Dawnstrider...). Recipe groups are
// recipes, not drops. A group of only cards (The Doctor, The Nurse, The
// Patient) goes when the cards that give the item are listed already.
function getSources (item: ParsedItem, queryId: string, cardsShown: boolean, shown: Set<string>) {
  const dearest = (a: SideRow, b: SideRow) => chaosOfPrice(b.price) - chaosOfPrice(a.price)
  return ITEM_DROP
    .filter(g => !book().used.has(g) && realDrops(g).includes(queryId))
    .filter(g => !cardsShown || !g.query.every(id => id.startsWith('DIVINATION_CARD::')))
    .map((g, i) => {
      const rows: SideRow[] = []
      for (const id of g.query) {
        const info = findItemByQueryId(id)
        if (info) rows.push(sideRow(info, findPriceByQueryId(id), false, `from:${id}`))
      }
      const also: SideRow[] = []
      for (const id of realDrops(g)) {
        if (id === queryId) continue
        const info = findItemByQueryId(id)
        if (info && info.name !== item.info.name && !shown.has(info.name)) also.push(sideRow(info, findPriceByQueryId(id), false, `also:${id}`))
      }
      also.sort(dearest)
      if (also.length) also[0] = { ...also[0], lead: 'Also drops' }
      return { key: `from:${i}`, title: 'Drops from', rows, also, sum: setSum(g) }
    })
    .filter(sec => sec.rows.length && !sec.rows.some(r => r.name === item.info.name))
    .map(({ also, ...sec }) => ({ ...sec, rows: [...sec.rows, ...also] }))
}

// A row's price in chaos, for sorting: unpriced last.
function chaosOfPrice (price?: CurrencyValue) {
  return !price ? -1 : (price.currency === 'div' ? price.max * (xchgRate.value ?? 1) : price.max)
}

// woke: a keystone's tooltip, framed as the passive tree frames keystones.
function keystoneTip (c: Conqueror, jewel?: string): ItemTipRef | null {
  if (!c.keystone) return null
  return {
    name: c.keystone.name,
    noMenu: true,
    content: { kind: 'passive', name: c.keystone.name, stats: c.keystone.stats, frame: 'unique', note: jewel ? `${jewel} (${c.name}) turns keystones in its area into this.` : `${c.name} turns keystones in the ring into this, whatever the number.` }
  }
}

// woke: the Abyss conquest jewels have one lord each: wherever one is listed
// (the Reclaimed Malevolence recipe lists all five), its keystone goes under it.
// The keystone data loads with the first Timeless or Eye jewel checked, not
// at startup (the startup JS budget).
type ConquestData = typeof import('@/web/woke/related-family/conquest')
const conquest = shallowRef<ConquestData | null>(null)
let conquestJob: Promise<void> | null = null
function needsConquest (item: ParsedItem) {
  const base = item.info.unique?.base
  if (base == null || conquest.value || conquestJob) return
  if (base !== 'Timeless Jewel' && !base.endsWith(' Eye Jewel')) return
  conquestJob = import('@/web/woke/related-family/conquest')
    .then(m => { conquest.value = m })
    .catch(() => { conquestJob = null })
}
function withKeystone (row: SideRow, data: ConquestData): SideRow {
  const a = data.ABYSS.find(x => x.jewel === row.info.refName)
  return a ? { ...row, sub: { text: a.keystone?.name ?? a.name, tip: keystoneTip(a, a.jewel) } } : row
}

// woke: a Legion Timeless jewel drops in the Domain of Timeless Conflict: the
// five emblems that open it, its own faction's marked.
function getEmblems (item: ParsedItem, data: ConquestData | null) {
  if (!data?.EMBLEMS.some(e => e.jewel === item.info.refName)) return []
  const rows: SideRow[] = []
  for (const e of data.EMBLEMS) {
    const info = ITEM_BY_REF('ITEM', e.emblem)?.[0]
    if (!info) continue
    const chaos = chaosOf(info)
    const row = sideRow(info, chaos != null ? autoCurrency(chaos) : undefined, false, `emblem:${e.emblem}`)
    rows.push(e.jewel === item.info.refName ? { ...row, tag: 'its own', ownTag: true } : row)
  }
  return [{ key: 'emblems', title: 'Drops in Timeless Conflict', rows }]
}

function priceText (price: CurrencyValue) {
  return (price.min === price.max)
    ? displayRounding(price.min, true)
    : `${displayRounding(price.min, true)}–${displayRounding(price.max, true)}`
}
const currencyText = (price: CurrencyValue) => `${priceText(price)} ${price.currency === 'div' ? 'div' : 'c'}`

function getItemPrices (queryId: string) {
  const dropEntry = ITEM_DROP.find(entry => entry.query.includes(queryId))
  if (!dropEntry) return null

  const out = {
    label: undefined as string | undefined,
    related: [] as SideRow[],
    items: [] as SideRow[],
    group: dropEntry
  }
  for (const itemId of dropEntry.query) {
    const dbItem = findItemByQueryId(itemId)
    if (!dbItem) return { error: `Can't find "${itemId}".` }

    out.related.push(sideRow(dbItem, findPriceByQueryId(itemId), itemId === queryId, itemId))
  }
  const chaosOf = (price?: CurrencyValue) => !price ? -1 : (price.currency === 'div' ? price.max * (xchgRate.value ?? 1) : price.max)
  // A recipe group's items are what it makes, which the recipe list shows.
  for (const itemId of book().used.has(dropEntry) ? [] : realDrops(dropEntry)) {
    const dbItem = findItemByQueryId(itemId)
    if (!dbItem) return { error: `Can't find "${itemId}".` }

    out.items.push(sideRow(dbItem, findPriceByQueryId(itemId), false, itemId))
  }
  out.items.sort((a, b) => chaosOf(b.price) - chaosOf(a.price))

  return out
}

export default defineComponent({
  components: { WItemRow },
  directives: { ItemTip: vItemTip },
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
      const listed = new Set([family, ...otherFamilies(props.item)].flatMap(f => f.related.map(r => r.name)))
      return {
        ...family,
        dropRelated: drops.related.some(r => !listed.has(r.name)) ? drops.related : [],
        items: drops.items.filter(r => !listed.has(r.name))
      }
    })

    interface Section {
      key: string
      title: string
      family?: boolean
      rows: SideRow[]
      sum?: SumLine
      note?: string
    }
    // The card rewards load with the first unique or currency checked, and
    // again on the next check if that load failed.
    watch(() => props.item, item => { if (item) needsConquest(item) }, { immediate: true })
    const tipItems = shallowRef<Record<string, { d?: string, n?: number }> | null>(null)
    watch(() => props.item, item => {
      const ns = item?.info.namespace
      if (tipItems.value || (ns !== 'UNIQUE' && ns !== 'ITEM')) return
      loadTipItems().then(items => { tipItems.value = items as Record<string, { d?: string, n?: number }> | null }).catch(() => {})
    }, { immediate: true })
    const extra = computed<Section[]>(() => {
      if (!props.item || !updatedAt.value) return []
      const queryId = getDetailsId(props.item)
      const id = queryId ? `${queryId.ns}::${queryId.name}${queryId.variant ? ` // ${queryId.variant}` : ''}` : null
      const cards = tipItems.value ? getCards(props.item, tipItems.value) : []
      const recipes = getRecipes(props.item)
      // What a recipe lists already isn't repeated under Also drops.
      const shown = new Set(recipes.flatMap(sec => sec.rows.map(r => r.name)))
      return [
        ...getEmblems(props.item, conquest.value),
        ...recipes,
        ...cards,
        ...(id ? getSources(props.item, id, cards.length > 0, shown) : [])
      ]
    })
    const sections = computed<Section[]>(() => {
      const recipeSecs: Section[] = extra.value.filter(sec => sec.key.startsWith('recipe:'))
      // A drop group that only repeats a recipe (Kingmaker's two parts, and
      // Kingmaker) goes: the recipe says it better.
      const inRecipe = new Set(recipeSecs.flatMap(sec => sec.rows.map(r => r.name)))
      const others = otherSections().filter(sec => !recipeSecs.length || !sec.rows.every(r => inRecipe.has(r.name)))
      const all = [...recipeSecs, ...extra.value.filter(sec => !sec.key.startsWith('recipe:')), ...others]
      const data = conquest.value
      if (!data) return all
      return all.map(sec => sec.rows.some(r => data.ABYSS.some(a => a.jewel === r.info.refName)) ? { ...sec, rows: sec.rows.map(r => withKeystone(r, data)) } : sec)
    })
    function otherSections (): Section[] {
      const res = result.value
      if (!res || !('related' in res)) return []
      const out: Section[] = []
      const group = 'group' in res ? res.group : undefined
      if (res.related.length > 1) out.push({ key: 'related', title: res.label ?? `Related to ${props.item!.info.name}`, family: res.label != null, rows: res.related, sum: res.label == null && group ? setSum(group) : undefined })
      for (const fam of otherFamilies(props.item!)) out.push({ key: `family:${fam.label}`, title: fam.label, family: true, rows: fam.related })
      if ('dropRelated' in res && res.dropRelated.length > 1) out.push({ key: 'drop-related', title: `Related to ${props.item!.info.name}`, rows: res.dropRelated })
      if (res.items.length) out.push({ key: 'drops', title: `Drops in ${props.item!.info.name}`, rows: res.items })
      return out
    }

    // woke: a Timeless jewel's conquerors and their keystones.
    const keystones = computed(() => {
      const item = props.item
      const data = conquest.value
      const list = item && data ? data.TIMELESS[item.info.refName] : undefined
      if (!item || !list || !data) return null
      const own = data.ownConquerorId(item.statsByType)
      return list.filter(c => c.keystone).map(c => ({ id: c.id, name: c.keystone!.name, by: c.name, own: c.id === own, tip: keystoneTip(c) }))
    })
    function pickKeystone (id: string) {
      if (props.item) conquestPick.value = { item: props.item, id }
    }

    const canOpen = (row: SideRow) => row.clickable && !row.highlight
    // A unique's mods load before it opens: a later click, or a new check,
    // wins over a click still waiting.
    let clickSeq = 0
    async function open (row: SideRow) {
      if (!canOpen(row)) return
      const seq = ++clickSeq
      const item = props.item
      const input = await priceCheckRequest(row.ref, row.info)
      if (input && seq === clickSeq && props.item === item) emit('check', input)
    }

    // The row's own item (English name, kind, base) for the tooltip and menu,
    // as its click uses.
    const tipOf = (row: SideRow): ItemTipRef => ({ name: row.ref.name, type: row.ref.type, menu: row.ref })

    return {
      result,
      sections,
      keystones,
      pickKeystone,
      canOpen,
      open,
      tipOf,
      priceText,
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
/* Beside the instant card, which zooms it 1.2x (--w-instant-scale): the same height on screen as before. */
.list { max-height: calc(min(26rem, 60vh) / var(--w-instant-scale, 1)); overflow-y: auto; overscroll-behavior: contain; }
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
.qty { color: var(--w-faint); margin-right: 4px; }
.gives { color: var(--w-faint); margin-left: 6px; }
.tag { color: #d20000; margin-left: 6px; font-size: var(--w-fs-sm); }
/* woke: a keystone: the tree's round frame, in CSS (no keystone art is bundled). */
.ks { width: 20px; height: 20px; margin: 0 4px; border-radius: 50%; border: 2px solid #9a8355; background: radial-gradient(#3b2f6b, #14102a); box-sizing: border-box; }
.kname { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #b8a3ff; }
.ksub { display: block; font-size: var(--w-fs-sm); color: #b8a3ff; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; }
.kby { margin-left: 6px; font-size: var(--w-fs-sm); color: var(--w-faint); }
button.row { width: 100%; text-align: left; }
.lead { padding: 3px 12px 2px; font-size: var(--w-fs-sm); color: var(--w-faint); background: var(--w-panel-solid); border-bottom: 1px solid var(--w-line-soft); }
.sum { display: flex; justify-content: space-between; gap: 8px; padding: 5px 12px; border-top: 1px solid var(--w-line); font-size: var(--w-fs-sm); color: var(--w-dim); }
.sum b { color: var(--w-fg); font-variant-numeric: tabular-nums; }
.note { padding: 0 12px 5px; font-size: var(--w-fs-sm); color: var(--w-faint); }
</style>
