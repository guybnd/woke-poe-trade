<template>
  <div v-if="versions.length > 1" :class="$style.wrap">
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
        <tr><th>Level</th><th>Quality</th><th></th><th :class="$style.r">poe.ninja</th><th :class="$style.r">Trade</th></tr>
      </thead>
      <tbody>
        <tr v-for="v of versions" :key="rowKey(v)"
          :class="[v.own ? $style.own : $style.click]"
          :title="v.own ? 'Your gem: the search below' : 'Search this version (1 trade search)'"
          @click="search(v)">
          <td>{{ v.level }}</td>
          <td>{{ v.quality }}</td>
          <td :class="$style.corr">{{ v.vaal ? 'Vaal' : v.corrupted ? 'corr' : '' }}</td>
          <td :class="$style.r"><w-price :chaos="v.chaos" :divine="divine" /></td>
          <td :class="$style.r">
            <template v-if="v.own">yours</template>
            <template v-else-if="runOf(v)?.state === 'loading'"><span class="w-dim">searching…</span></template>
            <template v-else-if="runOf(v)?.state === 'error'"><span :class="$style.bad" :title="runOf(v)!.error">failed, retry</span></template>
            <template v-else-if="runOf(v)?.state === 'done'">
              <span v-if="!runOf(v)!.total" class="w-dim">none listed</span>
              <span v-else :class="$style.got"><w-price :chaos="runOf(v)!.chaos" :divine="divine" /><span class="w-dim">· {{ runOf(v)!.total }} listed</span></span>
            </template>
            <span v-else class="w-faint">search</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import type { ParsedItem } from '@/parser'
import type { ItemFilters } from '@/web/price-check/filters/interfaces'
import { usePoeninja } from '@/web/background/Prices'
import { getDetailsId } from '@/web/price-check/trends/getDetailsId'
import { useInsight } from '@/web/woke/price-insight/useInsight'
import { AppConfig } from '@/web/Config'
import WPrice from '@/web/woke/ui/WPrice.vue'
import { gemForms, listVersions, type GemVersion, type NinjaGemRow } from './versions'
import { gemVersionsOpen as open } from './open'

const props = defineProps<{
  item: ParsedItem
  filters: ItemFilters
}>()

const ninja = usePoeninja()
const league = computed(() => props.filters.trade.league)
const { options, divine } = useInsight(ref([]), league)

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
    { vaal: ownVaal, variant: getDetailsId(props.item)?.variant })
})

const low = computed(() => Math.min(...versions.value.map(v => v.chaos)))
const high = computed(() => Math.max(...versions.value.map(v => v.chaos)))

interface Run { id: number, state: 'loading' | 'done' | 'error', chaos?: number | null, total?: number, error?: string }
const runs = reactive(new Map<string, Run>())
let runId = 0
const searchCode = shallowRef<typeof import('./search') | null>(null)

// A new gem: the old rows' searches were for another gem.
watch(() => props.item, () => { runs.clear() })

function rowKey (v: GemVersion): string {
  return `${v.vaal ? 'V' : ''}${v.key}`
}
function runOf (v: GemVersion): Run | undefined {
  return runs.get(rowKey(v))
}

async function search (v: GemVersion) {
  if (v.own || !forms.value) return
  const key = rowKey(v)
  const prev = runs.get(key)
  if (prev && prev.state !== 'error') return
  const id = ++runId
  runs.set(key, { id, state: 'loading' })
  try {
    if (!searchCode.value) searchCode.value = await import('./search')
    const res = await searchCode.value.searchVersion(props.filters, v, forms.value, {
      ...options.value,
      accountName: AppConfig().accountName
    })
    if (runs.get(key)?.id === id) runs.set(key, { id, state: 'done', ...res })
  } catch (e) {
    if (runs.get(key)?.id === id) runs.set(key, { id, state: 'error', error: (e as Error).message })
  }
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
.r { text-align: right; }
.table td.r > * { justify-content: flex-end; }
.corr { color: var(--w-mod-corrupted); }
.click { cursor: pointer; }
.click:hover td { background: var(--w-chip-ground); }
.own td { color: var(--w-gold-hi); background: var(--w-accent-soft); }
.got { display: inline-flex; align-items: center; gap: 4px; }
.bad { color: var(--w-bad-fg); }
</style>
