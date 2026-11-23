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
        <tr>
          <th>Lv / Q</th>
          <th :class="$style.r">Clean</th>
          <th :class="$style.r">Corrupted</th>
          <th v-if="hasVaal" :class="$style.r">Vaal</th>
          <th :class="$style.r">{{ hasOwnPrice ? 'vs yours' : '' }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r of rows" :key="`${r.level}/${r.quality}`" :class="{ [$style.newLevel]: r.firstOfLevel }" :data-version-row="`${r.level}/${r.quality}`">
          <td :class="$style.lq">{{ r.level }}/{{ r.quality }}</td>
          <template v-for="col of cols" :key="col">
            <WItemRow v-if="r[col]" as="td" :item="tipOf(r[col]!)" :art="false" action="pick"
              :class="[$style.cell, $style[col], { [$style.own]: r[col]!.own, [$style.on]: isSearched(r[col]!) }]"
              :data-version="rowKey(r[col]!)"
              :aria-current="isSearched(r[col]!) ? 'true' : undefined"
              @pick="search(r[col]!)">
              <w-price :chaos="r[col]!.chaos" :divine="divine" />
            </WItemRow>
            <td v-else :class="[$style.r, $style.none]">–</td>
          </template>
          <td :class="[$style.r, $style.note]">
            <span v-if="rowSearched(r)" :class="$style.mark">searched</span>
            <span v-else-if="r.own" class="w-dim">yours</span>
            <span v-else-if="r.delta != null" :class="r.delta > 0 ? 'w-up' : r.delta < 0 ? 'w-down' : 'w-faint'">{{ signed(r.delta) }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, shallowRef, watch } from 'vue'
import type { ParsedItem } from '@/parser'
import type { ItemFilters } from '@/web/price-check/filters/interfaces'
import { AppConfig } from '@/web/Config'
import WPrice from '@/web/woke/ui/WPrice.vue'
import WItemRow from '@/web/woke/ui/WItemRow.vue'
import type { ItemTipRef } from '@/web/woke/ui/tooltip/item-tip'
import { versionFilters, type GemForms, type GemVersion } from './versions'
import { useGemVersions } from './useVersions'
import { versionRows, type VersionRow } from './table'
import { formatChaos } from '../ui/format'
import { gemVersionsOpen as open } from './open'
import { rawClone } from '@/web/woke/raw-clone'

const props = defineProps<{
  item: ParsedItem
  filters: ItemFilters
}>()

// The price check's own search: runs on the next tick, with the filters a click set.
const runSearch = inject<() => void>('price-check-search', () => {})

const { forms, versions, divine } = useGemVersions(() => props.item, () => props.filters.trade.league)
const rows = computed(() => versionRows(versions.value))
const hasVaal = computed(() => versions.value.some(v => v.vaal))
const hasOwnPrice = computed(() => versions.value.some(v => v.own))
const cols = computed<Array<'clean' | 'corrupted' | 'vaal'>>(() => hasVaal.value ? ['clean', 'corrupted', 'vaal'] : ['clean', 'corrupted'])

function signed (n: number): string {
  const t = formatChaos(Math.abs(n), divine.value)
  return n > 0 ? `+${t}` : n < 0 ? `−${t}` : '0'
}

function rowSearched (r: VersionRow): boolean {
  return [r.clean, r.corrupted, r.vaal].some(v => v != null && isSearched(v))
}

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
.table th {
  text-align: left; font-weight: 400; color: var(--w-faint); padding: 1px 6px;
  border-bottom: 1px solid var(--w-line);
  font-size: var(--w-fs-caps); text-transform: var(--w-caps-case); letter-spacing: 0.06em; font-family: var(--w-caps-face);
}
.table td { padding: 2px 6px; border-bottom: 1px solid var(--w-line-soft); }
.table .r { text-align: right; }
.table tr.newLevel td { border-top: 1px solid var(--w-line); }
.lq { color: var(--w-fg); }
.table td.cell { width: auto; text-align: right; cursor: pointer; border-radius: 2px; }
.table td.cell > * { justify-content: flex-end; }
.table td.cell:hover { background: var(--w-chip-ground); box-shadow: inset 0 0 0 1px var(--w-line-strong); }
.corrupted, .vaal { color: var(--w-mod-corrupted); }
.none { color: var(--w-faint); opacity: 0.5; }
.table td.own, .table td.own:hover { box-shadow: inset 0 0 0 1px var(--w-gold-hi); color: var(--w-gold-hi); }
.table td.on { background: var(--w-accent-soft); }
.note { font-size: var(--w-fs-xs); white-space: nowrap; }
.mark { color: var(--w-gold-hi); }
</style>
