<template>
  <!-- woke: Mercenary Warrant support ladder (Guy's merc thread, option A1). Supports ranked by what
       the market pays for them; Measure spends searches only on a click and remembers the answers. -->
  <div v-if="ladders.length" :class="$style.box">
    <div v-for="l in ladders" :key="l.skillRef" :class="$style.skill">
      <div :class="$style.head">
        <span v-item-tip="{ name: l.skillText }" :class="$style.skillName">{{ l.skillText }}</span>
        <span class="w-faint">{{ l.supports.length }} {{ l.supports.length === 1 ? 'support' : 'supports' }}<template v-if="topTier(l)"> · {{ topTier(l) }} top tier</template></span>
        <button type="button" :class="$style.measure" :disabled="busy"
          :title="`Searches warrants with this skill, then with each support linked to it. ${l.supports.length + 1} trade searches.`"
          @click="measure(l)">{{ busySkill === l.skillRef ? progressText : `Measure · ${l.supports.length + 1} searches` }}</button>
      </div>
      <label v-for="row in ranked(l)" :key="row.statRef" :class="$style.row">
        <input type="checkbox" :checked="!row.filter.disabled" @change="tick(l, row)">
        <span :class="$style.sup" data-no-item-tip="a mercenary's support, not an item">{{ row.text }}<span v-if="row.maxTier" class="w-faint" :class="$style.tier">top tier</span></span>
        <span :class="$style.worth">
          <template v-if="worth(l, row)">
            <template v-if="adds(worth(l, row)) != null">+<w-price :chaos="adds(worth(l, row))" :divine="divine" /></template>
            <template v-else-if="worth(l, row)!.with != null"><w-price :chaos="worth(l, row)!.with" :divine="divine" /><span class="w-faint" title="Warrants with this skill had no price to compare with">· no base</span></template>
            <span v-else class="w-faint">none listed</span>
            <span class="w-faint">· {{ worth(l, row)!.count }} listed</span>
          </template>
          <span v-else class="w-faint">not measured</span>
        </span>
        <span :class="$style.bar"><i :style="{ width: barWidth(l, row) }" /></span>
      </label>
      <div v-if="warning(l)" :class="$style.warn">{{ warning(l) }}</div>
    </div>
    <div v-if="error" :class="$style.warn">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { ItemFilters, FilterOrGroup } from '@/web/price-check/filters/interfaces'
import { WPrice, vItemTip } from '@/web/woke/ui'
import { useInsight } from '@/web/woke/price-insight/useInsight'
import { pricedSearch, CANCELLED } from '@/web/woke/price-insight/drivers'
import { skillLadders, supportKey, rankSupports, loadWorth, saveWorth, worthKey, adds, measureStats, type SkillLadder, type SupportRow, type Worth } from './ladder'

const props = defineProps<{
  stats: FilterOrGroup[]
  filters: ItemFilters
}>()

const league = computed(() => props.filters.trade.league)
const { divine, options } = useInsight(ref([]), league)

const ladders = computed(() => skillLadders(props.stats))
// Bumped after a measure so the remembered answers are read again.
const version = ref(0)

function worth (l: SkillLadder, row: SupportRow): Worth | undefined {
  if (version.value < 0) return undefined // read so a measure re-renders
  return loadWorth(league.value, l.skillRef, supportKey(row))
}

// While a measure runs the rows keep their order, so nothing moves under the cursor.
let frozen: Map<string, string[]> | null = null
function ranked (l: SkillLadder) {
  const order = frozen?.get(l.skillRef)
  if (order) return order.map(ref => l.supports.find(s => s.statRef === ref)!).filter(Boolean)
  return rankSupports(l.supports, row => worth(l, row))
}

function topTier (l: SkillLadder) {
  return l.supports.filter(s => s.maxTier).length
}

function barWidth (l: SkillLadder, row: SupportRow) {
  const all = l.supports.map(s => adds(worth(l, s)) ?? 0)
  const max = Math.max(...all, 0)
  const a = adds(worth(l, row)) ?? 0
  return max > 0 ? `${Math.round(a / max * 100)}%` : '0%'
}

function tick (l: SkillLadder, row: SupportRow) {
  row.filter.disabled = !row.filter.disabled
  // A ticked support needs its skill's group on, or the search ignores it.
  if (!row.filter.disabled) {
    l.group.meta.disabled = false
    l.group.expanded = true
  }
}

/** What the measured answers say about the ticked supports. */
function warning (l: SkillLadder): string | null {
  const ticked = l.supports.filter(s => !s.filter.disabled)
  if (ticked.length >= 4 && ticked.length === l.supports.length) {
    return 'Every support ticked: few or no warrants match, so the price would be one seller\'s ask. Untick the cheap ones.'
  }
  const empty = ticked.find(s => { const w = worth(l, s); return w && w.count === 0 })
  if (empty) return `No warrant with this skill has ${empty.text} listed. Untick it to get a price.`
  const thin = ticked.find(s => { const w = worth(l, s); return w && w.count > 0 && w.count < 4 })
  if (thin) return `Only ${worth(l, thin)!.count} listed with ${thin.text}: a thin market, check the listings.`
  return null
}

const busy = ref(false)
const busySkill = ref<string | null>(null)
const progressText = ref('')
const error = ref<string | null>(null)
let gone = false
onUnmounted(() => { gone = true })
// A new item or preset reuses this panel: a measure for the old one stops.
let run = 0
watch(() => props.stats, () => { run++ })

async function measure (l: SkillLadder) {
  if (busy.value) return
  busy.value = true
  busySkill.value = l.skillRef
  error.value = null
  const total = l.supports.length + 1
  const onWait = (sec: number) => { progressText.value = `Waiting ${sec}s for the trade site…` }
  const myRun = ++run
  const isCancelled = () => gone || run !== myRun
  // The item as it was when Measure was clicked.
  const stats = JSON.parse(JSON.stringify(props.stats)) as FilterOrGroup[]
  const filters = JSON.parse(JSON.stringify(props.filters)) as ItemFilters
  const lg = league.value
  frozen = new Map(ladders.value.map(x => [x.skillRef, ranked(x).map(s => s.statRef)]))
  try {
    progressText.value = `Searching 1 of ${total}…`
    const bare = await pricedSearch(filters, measureStats(stats, l.skillRef, null), options.value, onWait, isCancelled)
    const base = bare.insight.range?.fair ?? null
    const out: Array<[string, Worth]> = []
    let i = 1
    for (const row of l.supports) {
      i++
      progressText.value = `Searching ${i} of ${total}…`
      const r = await pricedSearch(filters, measureStats(stats, l.skillRef, row.statRef), options.value, onWait, isCancelled)
      const w: Worth = { with: r.insight.range?.fair ?? null, base, count: r.total, at: Date.now() }
      out.push([worthKey(lg, l.skillRef, supportKey(row)), w])
      // Show each answer as it lands.
      saveWorth([out[out.length - 1]])
      version.value++
    }
  } catch (err) {
    if ((err as Error).message !== CANCELLED) error.value = `Measure stopped: ${(err as Error).message}`
  } finally {
    frozen = null
    version.value++
    busy.value = false
    busySkill.value = null
  }
}
</script>

<style module>
.box { display: grid; gap: 8px; font-size: var(--w-fs-sm); }
.skill { display: grid; gap: 1px; }
.head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.skillName { color: var(--w-mod-gem, #1ba29b); }
.measure {
  margin-left: auto; padding: 0 8px; border: 1px solid var(--w-line-strong); border-radius: 2px;
  background: var(--w-chip-ground); color: var(--w-gold); cursor: pointer; font-size: var(--w-fs-xs);
}
.measure:hover:not(:disabled), .measure:focus-visible { color: var(--w-gold-hi); outline: none; }
.measure:disabled { opacity: 0.6; cursor: default; }
.row { display: flex; align-items: center; gap: 8px; padding: 1px 4px; cursor: pointer; border-bottom: 1px solid var(--w-line-soft); }
.row:hover { background: var(--w-chip-ground); }
.sup { color: var(--w-fg); flex: 1 1 auto; min-width: 0; }
.tier { margin-left: 4px; font-size: var(--w-fs-xs); }
.worth { display: flex; align-items: baseline; gap: 4px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.bar { width: 48px; height: 5px; background: var(--w-line-soft); position: relative; flex: none; }
.bar i { position: absolute; top: 0; bottom: 0; left: 0; background: var(--w-gold); }
.warn { color: var(--w-warn, #e0a050); font-size: var(--w-fs-xs); }
</style>
