<template>
  <div v-if="versions.length > 1" :class="$style.wrap" data-gem-versions>
    <button type="button" :class="$style.fold" :aria-expanded="open" @click="open = !open">
      <span :class="$style.caret">{{ open ? '▾' : '▸' }}</span>
      <span :class="$style.count">{{ versions.length }} versions</span>
      <template v-if="!open">
        <span class="w-faint">·</span>
        <w-price :chaos="low" :divine="divine" /><span class="w-faint">to</span><w-price :chaos="high" :divine="divine" />
      </template>
    </button>
    <table v-if="open" :class="$style.table">
      <thead>
        <tr><th>Level</th><th>Quality</th><th></th><th :class="$style.r">poe.ninja</th><th></th></tr>
      </thead>
      <tbody>
        <WItemRow v-for="v of versions" :key="rowKey(v)" as="tr" :item="tipOf(v)" :art="false" action="pick"
          :class="[$style.click, { [$style.own]: v.own, [$style.on]: isSearched(v) }]"
          :aria-current="isSearched(v) ? 'true' : undefined"
          @pick="search(v)">
          <td>{{ v.level }}</td>
          <td>{{ v.quality }}</td>
          <td :class="$style.corr">{{ v.vaal ? 'Vaal' : v.corrupted ? 'corr' : '' }}</td>
          <td :class="$style.r"><w-price :chaos="v.chaos" :divine="divine" /></td>
          <td :class="$style.r">
            <span v-if="isSearched(v)" :class="$style.mark">searched</span>
            <span v-else-if="v.own" class="w-dim">yours</span>
          </td>
        </WItemRow>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, shallowRef, watch } from 'vue'
import type { ParsedItem } from '@/parser'
import type { ItemFilters } from '@/web/price-check/filters/interfaces'
import { usePoeninja } from '@/web/background/Prices'
import { useInsight } from '@/web/woke/price-insight/useInsight'
import { AppConfig } from '@/web/Config'
import WPrice from '@/web/woke/ui/WPrice.vue'
import WItemRow from '@/web/woke/ui/WItemRow.vue'
import type { ItemTipRef } from '@/web/woke/ui/tooltip/item-tip'
import { gemForms, listVersions, versionFilters, type GemForms, type GemVersion, type NinjaGemRow } from './versions'
import { gemVersionsOpen as open } from './open'
import { rawClone } from '@/web/woke/raw-clone'

const props = defineProps<{
  item: ParsedItem
  filters: ItemFilters
}>()

const ninja = usePoeninja()
const league = computed(() => props.filters.trade.league)
const { divine } = useInsight(ref([]), league)
// The price check's own search: runs on the next tick, with the filters a click set.
const runSearch = inject<() => void>('price-check-search', () => {})

const forms = computed(() => gemForms(props.item))

const versions = computed<GemVersion[]>(() => {
  // poe.ninja's rows are for the league picked in settings only; updatedAt
  // also re-reads them each time poe.ninja loads.
  if (divine.value == null || ninja.updatedAt.value == null) return []
  const f = forms.value
  if (!f) return []
  const ownVaal = !!props.item.info.gem?.vaal || !!props.item.vaalGem?.gem?.vaal
  return listVersions(
    ninja.findPricesByName('GEM', f.base.refName) as NinjaGemRow[],
    f.vaal ? ninja.findPricesByName('GEM', f.vaal.refName) as NinjaGemRow[] : [],
    {
      vaal: ownVaal,
      level: props.item.gemLevel ?? 1,
      quality: props.item.quality ?? 0,
      corrupted: !!props.item.isCorrupted
    })
})

const low = computed(() => Math.min(...versions.value.map(v => v.chaos)))
const high = computed(() => Math.max(...versions.value.map(v => v.chaos)))

// The version as poe.ninja lists it, for its tooltip and item menu; the
// click's meaning goes at the bottom of the tooltip.
function tipOf (v: GemVersion): ItemTipRef | null {
  const gem = v.vaal ? forms.value?.vaal : forms.value?.base
  if (!gem) return null
  const note = isSearched(v) ? 'The search below'
    : v.own ? 'Click to search your gem again (1 trade search)'
      : 'Click to search this version (1 trade search)'
  return { name: gem.refName, type: 'SkillGem', variant: v.key, note }
}

function rowKey (v: GemVersion): string {
  return `${v.vaal ? 'V' : ''}${v.key}`
}

// The filters a row click sets. The copied gem's own row puts back the
// filters it was copied with (corrupted any, imbued, quality waiting at 20).
type VersionFields = Pick<ItemFilters, 'searchExact' | 'searchRelaxed' | 'gemLevel' | 'quality' | 'corrupted' | 'imbuedGem'>
function fieldsOf (f: ItemFilters): VersionFields {
  return rawClone({
    searchExact: f.searchExact,
    searchRelaxed: f.searchRelaxed,
    gemLevel: f.gemLevel,
    quality: f.quality,
    corrupted: f.corrupted,
    imbuedGem: f.imbuedGem
  })
}

let copied: VersionFields | null = null
// The row last clicked and what it set: "searched" while the filters stay so.
const clicked = shallowRef<{ key: string, set: string } | null>(null)
watch(() => props.item, () => {
  copied = fieldsOf(props.filters)
  clicked.value = null
}, { immediate: true })

function isSearched (v: GemVersion): boolean {
  const c = clicked.value
  return c != null && c.key === rowKey(v) && c.set === JSON.stringify(fieldsOf(props.filters))
}

function fieldsFor (v: GemVersion, gem: GemForms): VersionFields {
  if (v.own && copied) return rawClone(copied)
  const next = fieldsOf(versionFilters(props.filters, v, gem, AppConfig().useIntlSite))
  // Empower, Enlighten and Enhance have no quality box: don't add one.
  if (!props.filters.quality && v.quality <= 0) next.quality = undefined
  return next
}

// A click sets the price check's level, quality, corrupted and Vaal filters
// to the version and runs its search: one trade search, only on a click.
function search (v: GemVersion) {
  const f = forms.value
  if (!f || isSearched(v)) return
  Object.assign(props.filters, fieldsFor(v, f))
  clicked.value = { key: rowKey(v), set: JSON.stringify(fieldsOf(props.filters)) }
  runSearch()
}
</script>

<style module>
.wrap { display: grid; gap: 2px; font-size: var(--w-fs-sm); }
.fold {
  display: inline-flex; align-items: center; gap: 5px; justify-self: start;
  background: none; border: 0; padding: 1px 0; color: var(--w-dim); cursor: pointer;
}
.fold:hover, .fold:focus-visible { color: var(--w-fg); outline: none; }
.caret { width: 0.8em; }
.count { color: var(--w-fg); }
.table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.table th { text-align: left; font-weight: 400; color: var(--w-dim); padding: 1px 4px; border-bottom: 1px solid var(--w-line); }
.table td { padding: 1px 4px; border-bottom: 1px solid var(--w-line-soft); }
.table .r { text-align: right; }
.table td.r > * { justify-content: flex-end; }
.corr { color: var(--w-mod-corrupted); }
.click { cursor: pointer; }
.click:hover td { background: var(--w-chip-ground); }
.own td { color: var(--w-gold-hi); }
.on td { background: var(--w-accent-soft); }
.mark { color: var(--w-gold-hi); }
</style>
