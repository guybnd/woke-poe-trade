<template>
  <WPanel size-key="net-worth" :title="config.wmTitle || 'Net worth'" icon="divine" width="26rem" max-height="80vh"
    :hotkey="config.hotkey" :busy="status?.running === true" :stale="!!status?.error && !!v">
    <template #actions>
      <span class="w-dim text-xs mr-2">{{ readLine }}</span>
      <WButton size="sm" icon="fas fa-sync-alt" :disabled="status?.running" @click="refresh">Refresh</WButton>
    </template>
    <template v-if="status?.error" #banner>
      <WBanner :tone="status.error.kind === 'rate-limited' ? 'warn' : 'error'">{{ errorLine }}</WBanner>
    </template>

    <WEmpty v-if="!v && !status?.lastReadAt" icon="fas fa-box-open">
      {{ status?.account ? 'Not read yet. Press Refresh.' : 'Sign in under Settings › Game & league, then press Refresh.' }}
    </WEmpty>
    <WEmpty v-else-if="!v" icon="fas fa-hourglass-half">Waiting for poe.ninja prices…</WEmpty>
    <div v-else :class="$style.body">
      <section v-if="diff && (diff.added.length || diff.removed.length)" :class="$style.diff">
        <div :class="$style.head">
          <span :class="$style.caps">Since last refresh</span>
          <span class="w-num" :class="diff.netChaos >= 0 ? $style.up : $style.down">{{ sign(diff.netChaos) }}<WPrice :chaos="Math.abs(diff.netChaos)" :divine="divine" /></span>
        </div>
        <ul :class="$style.list">
          <li v-for="l in diffRows" :key="l.dir + l.key" :class="$style.row">
            <img v-if="l.icon" :src="l.icon" :class="$style.icon" alt="">
            <span class="w-trunc">{{ l.count > 1 ? `${l.count} × ` : '' }}{{ l.name }}</span>
            <span class="w-num" :class="l.dir === 'add' ? $style.up : $style.down">{{ l.dir === 'add' ? '+' : '−' }}<WPrice :chaos="l.chaos" :divine="divine" /></span>
          </li>
        </ul>
        <WButton v-if="diffMore > 0" size="sm" variant="ghost" @click="diffAll = true">{{ diffMore }} more</WButton>
      </section>

      <div :class="$style.totals">
        <div><small :class="$style.caps">Total</small><b class="w-num">{{ divText(v.chaos) }}</b></div>
        <div><small :class="$style.caps">Since yesterday</small><b class="w-num" :class="$style[tone(sum?.sinceYesterdayDiv)]">{{ sum?.sinceYesterdayDiv == null ? '—' : `${sign(sum.sinceYesterdayDiv)}${fmt(Math.abs(sum.sinceYesterdayDiv))}` }}</b></div>
        <div><small :class="$style.caps">Per hour today</small><b class="w-num" :class="$style[tone(sum?.perHourChaos)]">{{ sum?.perHourChaos == null ? '—' : `${sign(sum.perHourChaos)}${divText(Math.abs(sum.perHourChaos), false)}` }}</b></div>
      </div>

      <ul :class="$style.bars">
        <li v-for="c in cats" :key="c.id">
          <button type="button" :class="[$style.bar, { [$style.open]: openCat === c.id }]" @click="openCat = openCat === c.id ? null : c.id">
            <span>{{ c.label }}</span>
            <i :style="{ width: `${c.share * 100}%` }" />
            <b class="w-num">{{ fmt(c.div) }}</b>
          </button>
          <ul v-if="openCat === c.id" :class="$style.list">
            <li v-for="l in linesOf(c.id)" :key="l.key" :class="$style.row" :title="l.tabs.join(', ')">
              <img v-if="l.icon" :src="l.icon" :class="$style.icon" alt="">
              <span class="w-trunc">{{ l.count > 1 ? `${l.count} × ` : '' }}{{ l.name }}</span>
              <WPrice class="w-num" :chaos="l.chaos" :divine="divine" />
            </li>
            <li v-if="!linesOf(c.id).length" class="w-dim text-xs">Nothing here.</li>
          </ul>
        </li>
      </ul>
      <div class="w-dim text-xs" :class="$style.foot">
        <span>{{ sum?.tabs }} tabs · values in divines</span>
        <span v-if="status?.skipped">{{ status.skipped }} remove-only tabs skipped</span>
        <span v-if="v.unpriced">{{ v.unpriced }} items without a price (rares aren't searched)</span>
      </div>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { WBanner, WButton, WEmpty, WPanel, WPrice } from '../ui'
import { agoPhrase, formatAmount } from '../ui/format'
import { hostRequest } from '../shared/host'
import { CATEGORIES } from './valuation'
import type { Category } from './valuation'
import { divine, lastDiff, summary, valuation, wantPrices } from './store'
import type { NetWorthWidget, ReaderStatus } from './widget'

const props = defineProps<{
  config: NetWorthWidget
  status: ReaderStatus | null
}>()

onMounted(wantPrices)

const v = valuation
const sum = summary
const diff = lastDiff
const openCat = shallowRef<Category | null>(null)
const diffAll = shallowRef(false)

const fmt = (n: number) => formatAmount(n)
const sign = (n: number) => n > 0 ? '+' : n < 0 ? '−' : ''
const tone = (n: number | null | undefined) => n == null || n === 0 ? 'flat' : n > 0 ? 'up' : 'down'
function divText (chaos: number, unit = true) {
  if (!divine.value) return `${fmt(chaos)} c`
  return `${fmt(chaos / divine.value)}${unit ? ' div' : ''}`
}

const cats = computed(() => {
  const val = v.value
  if (!val) return []
  const max = Math.max(1, ...Object.values(val.byCategory))
  return CATEGORIES.map(c => ({
    ...c,
    div: divine.value ? val.byCategory[c.id] / divine.value : val.byCategory[c.id],
    share: val.byCategory[c.id] / max
  }))
})

function linesOf (cat: Category) {
  return (v.value?.lines ?? []).filter(l => l.category === cat).slice(0, 200)
}

const DIFF_ROWS = 8
const diffRows = computed(() => {
  const d = diff.value
  if (!d) return []
  const rows = [
    ...d.added.map(l => ({ ...l, dir: 'add' as const })),
    ...d.removed.map(l => ({ ...l, dir: 'remove' as const }))
  ].sort((a, b) => b.chaos - a.chaos)
  return diffAll.value ? rows : rows.slice(0, DIFF_ROWS)
})
const diffMore = computed(() => {
  const d = diff.value
  return d && !diffAll.value ? Math.max(0, d.added.length + d.removed.length - DIFF_ROWS) : 0
})

const readLine = computed(() => {
  const s = props.status
  if (s?.running) return s.progress ? `reading ${s.progress.done}/${s.progress.total}` : 'reading…'
  return s?.lastReadAt ? `read ${agoPhrase(s.lastReadAt)}` : ''
})

const errorLine = computed(() => {
  const e = props.status?.error
  if (!e) return ''
  if (e.kind === 'rate-limited' && e.retryAt) {
    const min = Math.max(1, Math.ceil((e.retryAt - Date.now()) / 60_000))
    return `Rate-limited by pathofexile.com. Try again in ${min} min.`
  }
  return e.message
})

function refresh () {
  diffAll.value = false
  hostRequest('stash-reader-read', null, 15 * 60_000).catch(() => {})
}
</script>

<style module>
.body { display: flex; flex-direction: column; gap: var(--w-s2); padding: var(--w-s2) var(--w-pad); }
.caps { font-family: var(--w-caps-face); text-transform: var(--w-caps-case); font-size: var(--w-fs-caps); color: var(--w-dim); }
.diff { display: flex; flex-direction: column; gap: 2px; padding-bottom: var(--w-s2); border-bottom: 1px solid var(--w-line); }
.head { display: flex; justify-content: space-between; align-items: center; }
.totals { display: flex; gap: var(--w-s4); flex-wrap: wrap; }
.totals div { display: flex; flex-direction: column; }
.totals b { font-size: var(--w-fs-lg); font-weight: 500; }
.bars { display: flex; flex-direction: column; gap: 2px; }
.bar {
  display: grid; grid-template-columns: 7rem minmax(0, 1fr) 3.5rem; gap: var(--w-s2); align-items: center;
  width: 100%; padding: 3px 4px; border-radius: var(--w-r-sm); font-size: var(--w-fs-sm); text-align: left;
}
.bar:hover, .open { background: var(--w-accent-soft); }
.bar i { display: block; height: 7px; border-radius: 2px; background: var(--w-accent); min-width: 1px; }
.bar b { text-align: right; font-weight: 500; }
.list { display: flex; flex-direction: column; gap: 1px; padding: 2px 4px 6px; }
.row { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; gap: var(--w-s2); align-items: center; font-size: var(--w-fs-sm); }
.icon { width: 18px; height: 18px; object-fit: contain; }
.up { color: var(--w-up); }
.down { color: var(--w-down); }
.flat { color: var(--w-fg); }
.foot { display: flex; justify-content: space-between; gap: var(--w-s2); flex-wrap: wrap; }
</style>
