<template>
  <!-- A Nightmare Map goes into any of the five T17 maps: each one's boss
       fragments and unique, maps across (best first), drops down the side. -->
  <div v-if="cols.length" :class="$style.strip" data-woke-nightmare>
    <!-- Folds to one line, the best three maps; remembered (Guy, 2026-11-20). -->
    <button type="button" :class="$style.fold" :aria-expanded="open" data-nightmare-fold @click="open = !open">
      <span :class="$style.title">Worth running</span>
      <span class="flex-1" />
      <span class="w-dim">as {{ cols[0].name }} <b :class="(cols[0].profit ?? cols[0].loot) >= 0 ? 'w-up' : 'w-down'">{{ cols[0].profit == null ? chaos(cols[0].loot) : signed(cols[0].profit) }}</b></span>
      <i class="fas w-dim" :class="open ? 'fa-chevron-up' : 'fa-chevron-down'" />
    </button>
    <!-- Guy's holistic pick A: profit bars for the five maps, the grid one click further. -->
    <!-- The grid takes the bars' place, so opening it doesn't push what's below out of the window (Guy, 2026-11-20). -->
    <div v-if="open && !gridOpen" :class="$style.bars" data-nightmare-bars>
      <template v-for="c in cols" :key="c.id">
        <span :title="c.name">{{ c.short }}</span>
        <span :class="$style.bar"><i :class="(c.profit ?? c.loot) >= 0 ? $style.barUp : $style.barDown" :style="{ width: barWidth(c) }" /></span>
        <b :class="(c.profit ?? c.loot) >= 0 ? 'w-up' : 'w-down'">{{ c.profit == null ? chaos(c.loot) : signed(c.profit) }}</b>
        <!-- The vault this map spawns about half the time; a tag, not in profit (Guy's pick, 2026-11-21). -->
        <span :class="$style.vault" :title="c.vault ? vaultTitle(c.vault) : undefined" :data-nightmare-vault="c.id">{{ c.vault?.short ?? '' }}</span>
      </template>
    </div>
    <button v-if="open" type="button" :class="$style.gridToggle" :aria-expanded="gridOpen" data-nightmare-grid @click="gridOpen = !gridOpen">
      {{ estimated && !gridOpen ? '~ estimates · ' : '' }}{{ gridOpen ? 'Back to the profit bars' : 'Show the fragment × map grid' }} <i class="fas" :class="gridOpen ? 'fa-chart-bar' : 'fa-table'" />
    </button>
    <WSegmented v-if="open && gridOpen && vaultTable" v-model="bigTab" :class="$style.tabs" data-nightmare-tabs
      :options="[{ value: 'frags', label: 'Fragments' }, { value: 'vaults', label: 'Vaults' }]" />
    <div v-if="open && gridOpen && bigTab === 'vaults' && vaultTable" :class="$style.vaults" data-nightmare-vaults>
      <div v-for="v in vaultBlocks" :key="v.id" :class="$style.vblock" :data-nightmare-vault-block="v.id">
        <div :class="$style.vhead">
          <span :class="$style.vtitle">{{ v.name }}</span>
          <span class="w-dim">{{ v.quadrant }} · {{ v.maps.join(', ') || 'no Nightmare map' }}</span>
          <span class="flex-1" />
          <span :class="$style.est" :title="TYPICAL_TIP">~{{ chaos(v.typical) }}</span>
        </div>
        <div v-for="r in v.rewards" :key="r.text" :class="$style.vrow">
          <span :class="r.rare ? $style.rare : undefined">{{ r.text }}{{ r.rare ? ' · rare' : '' }}</span>
          <span v-if="r.chaos != null">{{ chaos(r.chaos) }}</span>
          <span v-else class="w-faint" :title="r.note">varies</span>
        </div>
      </div>
    </div>
    <div v-if="open && gridOpen && bigTab === 'vaults' && vaultTable" :class="$style.note">
      About {{ DEFAULT_NIGHTMARE_VAULT_CHANCE }}% of Nightmare maps spawn their boss's quadrant vault ({{ NIGHTMARE_VAULT_SOURCE }}). {{ TYPICAL_TIP }} Gems at level 1. Arkhon's Vault can also give a Nightmare Map.
    </div>
    <div v-if="open && gridOpen && (bigTab === 'frags' || !vaultTable)" :class="$style.wrap">
      <table :class="$style.grid">
        <thead>
          <tr>
            <th :class="$style.lab">Fragment · price</th>
            <th v-for="c in cols" :key="c.id" :class="$style.map" :data-nightmare-map="c.id" :title="c.name">{{ c.short }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in fragRows" :key="f.name" :data-nightmare-frag="f.name">
            <td><span :class="$style.item"><WIcon :src="itemArt({ name: f.name, type: 'Fragment' }) ?? undefined" fallback="fas fa-puzzle-piece" size="sm" />{{ f.short }} <span class="w-dim">{{ chaos(f.price) }}</span></span></td>
            <td v-for="(cell, i) in f.cells" :key="cols[i].id" :class="[cell.favoured ? $style.fav : $style.low, cell.estimate && cell.favoured && $style.est]">
              {{ cell.estimate ? '~' : '' }}{{ cell.pct }}%
            </td>
          </tr>
          <tr :class="$style.sep" data-nightmare-unique>
            <td :class="$style.uniq">Unique</td>
            <td v-for="c in cols" :key="c.id" :class="$style.ucell" :title="c.unique?.name">
              <template v-if="c.unique">
                <WIcon :src="itemArt({ name: c.unique.name }) ?? undefined" fallback="fas fa-gem" size="md" :class="$style.uicon" />
                <div :class="c.unique.estimate && $style.est">{{ c.unique.estimate ? '~' : '' }}{{ c.unique.pct }}%</div>
                <div>{{ chaos(c.unique.price) }}</div>
              </template>
            </td>
          </tr>
          <tr v-if="cols.some(c => c.vault)" :class="$style.sep" data-nightmare-vault-row>
            <td class="w-dim">Vault</td>
            <td v-for="c in cols" :key="c.id" :title="c.vault ? vaultTitle(c.vault) : undefined">{{ c.vault?.short ?? '' }}</td>
          </tr>
          <tr :class="$style.sep">
            <td class="w-dim">Loot</td>
            <td v-for="c in cols" :key="c.id" :class="estimated && $style.est">{{ estimated ? '~' : '' }}{{ chaos(c.loot) }}</td>
          </tr>
          <tr>
            <td class="w-dim">Profit <span :class="$style.mapcost">(map {{ chaos(mapPrice) }})</span></td>
            <td v-for="c in cols" :key="c.id" :class="$style.profit" :data-nightmare-profit="c.id">
              <span v-if="c.profit != null" :class="c.profit >= 0 ? 'w-up' : 'w-down'">{{ c.profit >= 0 ? '+' : '' }}{{ chaos(c.profit) }}</span>
              <span v-else class="w-faint" title="No Nightmare Map price on poe.ninja">?</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="open && gridOpen && (bigTab === 'frags' || !vaultTable)" :class="$style.note">
      <template v-if="estimated">~ is an estimate: no drop rates are published. {{ perKill }} fragments a kill, % = copies a kill; the unique's 5% is a 3.29 guide's figure.</template>
      Fragments a kill and your kill log live in Boss runs › Nightmare.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { onSharedDataChange } from '../app/live-data'
import { useFold } from '../ui/fold'
import { AppConfig } from '@/web/Config'
import WIcon from '../ui/WIcon.vue'
import WSegmented from '../ui/WSegmented.vue'
import { itemArt } from '../ui/game-icons'
import { usePriceIndex } from '../market/price-index'
import { evaluateBoss, priceResolver } from './calc'
import type { BossPrefs, DropRow } from './calc'
import { DEFAULT_FRAGMENTS_PER_KILL, NIGHTMARE_MAP, NIGHTMARE_MAPS, nightmareBosses, UBER_FRAGMENTS } from './nightmare'
import { BOSS_RUNS_TYPE } from './widget'
import type { BossRunsWidget } from './widget'
import { DEFAULT_NIGHTMARE_VAULT_CHANCE, loadVaults, nightmareMapsFor, NIGHTMARE_VAULT_SOURCE, rewardPrice, shortName, typicalPick, vaultForNightmare } from '../vaults/vaults'
import type { Vault, VaultTable } from '../vaults/vaults'

const open = useFold('nightmare-strip', true)
const gridOpen = useFold('nightmare-grid', false)
// Each bar against the best map's value (profit, or loot without a map price).
function barWidth (c: { profit: number | null, loot: number }) {
  // Against the largest swing either way, so a losing map's red bar shows too.
  const v = (x: { profit: number | null, loot: number }) => Math.abs(x.profit ?? x.loot)
  const top = Math.max(...cols.value.map(v), 1)
  return `${Math.round(v(c) / top * 100)}%`
}
function signed (n: number) { return `${n >= 0 ? '+' : ''}${chaos(n)}` }

// Mounted only with the Boss runs module on (CheckedItem.vue).
const prices = usePriceIndex()
// Plain chaos in the grid: one unit across every cell, so columns compare at a glance.
function chaos (n: number | null | undefined) {
  if (n == null) return '?'
  return `${Math.abs(n) >= 10 ? Math.round(n) : +n.toFixed(1)}c`
}

const DEFAULT_PREFS: BossPrefs = {
  runSeconds: {}, rates: {}, extraDrops: {}, kills: {}, ownEntry: false, plannedRuns: 0, dropToggles: {}, priceModes: {}, customPrices: {}
}
// Boss runs' settings (fragments a kill, typed rates, kill log), else defaults.
const prefs = computed<BossPrefs>(() => {
  const w = AppConfig().widgets.find(x => x.wmType === BOSS_RUNS_TYPE) as BossRunsWidget | undefined
  // The map in hand is the entry, so its cost always counts; every drop counts.
  return w ? { ...DEFAULT_PREFS, ...w, ownEntry: false, plannedRuns: 0 } : DEFAULT_PREFS
})
const perKill = computed(() => prefs.value.nightmareFrags ?? DEFAULT_FRAGMENTS_PER_KILL)

const px = computed(() => priceResolver(prices.snapshot.value?.items ?? []))
const mapPrice = computed(() => px.value.price(NIGHTMARE_MAP))

const results = computed(() => {
  if (!prices.snapshot.value) return []
  return nightmareBosses(prefs.value.nightmareFrags)
    .map(b => evaluateBoss(b, prefs.value, px.value))
    .filter(r => r.hasRates)
    // Same map cost for all five, so loot ranks them even without a map price.
    .sort((a, b) => b.loot - a.loot)
})
const estimated = computed(() => results.value.some(r => r.estimated))

// Templar Vaults (woke/vaults): the one each map spawns, and the big view's Vaults tab.
const vaultTable = shallowRef<VaultTable | null>(null)
function readVaults () { loadVaults().then(t => { vaultTable.value = t }).catch(() => {}) }
onMounted(readVaults)
// A data update brings a new table; a failed read tries again then too.
onBeforeUnmount(onSharedDataChange(() => { vaultTable.value = null; readVaults() }))
const bigTab = shallowRef<'frags' | 'vaults'>('frags')
const TYPICAL_TIP = '~ = the estimated typical pick: the best of four offers, no weights are published.'
const priceOf = (name: string, variant?: string) => px.value.price(name, variant)
function vaultTitle (v: { name: string, typical: number | null }) {
  return `${v.name}: about ${DEFAULT_NIGHTMARE_VAULT_CHANCE}% of maps spawn it · ~${chaos(v.typical)} typical pick`
}
// Every vault, the ones these maps spawn first, best typical pick first.
const vaultBlocks = computed(() => {
  const t = vaultTable.value
  if (!t) return []
  const block = (v: Vault) => ({
    id: v.id,
    name: v.name,
    quadrant: v.quadrant,
    maps: nightmareMapsFor(t, v),
    typical: typicalPick(v, priceOf),
    rewards: v.rewards
      .map(r => ({ text: r.text, rare: !!r.rare, note: r.note, chaos: rewardPrice(r, priceOf) }))
      .sort((a, b) => (b.chaos ?? -1) - (a.chaos ?? -1))
  })
  return t.vaults.map(block).sort((a, b) => (b.maps.length ? 1 : 0) - (a.maps.length ? 1 : 0) || (b.typical ?? -1) - (a.typical ?? -1))
})

// Column heads: five fit side by side in the price check.
const SHORT: Record<string, string> = {
  'nightmare-abomination': 'Abom',
  'nightmare-citadel': 'Citadel',
  'nightmare-fortress': 'Fortress',
  'nightmare-sanctuary': 'Sanct',
  'nightmare-ziggurat': 'Zigg'
}
// Copies a kill as a percentage: whole numbers, one decimal under 1%.
const pct = (n: number) => n >= 0.01 ? String(Math.round(n * 100)) : (n * 100).toFixed(1).replace(/\.0$/, '')
const copies = (d: DropRow) => (d.chance ?? 0) * d.qty

function vaultOf (mapId: string) {
  const v = vaultTable.value ? vaultForNightmare(vaultTable.value, mapId) : null
  return v ? { name: v.name, short: shortName(v), typical: typicalPick(v, priceOf) } : null
}
const cols = computed(() => results.value.map(r => {
  const map = NIGHTMARE_MAPS.find(m => m.id === r.boss.id)!
  const u = r.drops.find(d => d.name === map.unique)
  return {
    id: r.boss.id,
    name: r.boss.name.replace(/ Map$/, ''),
    short: SHORT[r.boss.id] ?? r.boss.name,
    favoured: map.favoured,
    drops: new Map(r.drops.map(d => [d.name, d])),
    unique: u ? { name: u.name, pct: pct(copies(u)), estimate: u.rateSource === 'estimate', price: u.price } : null,
    vault: vaultOf(r.boss.id),
    loot: r.loot,
    profit: r.entryMissing.length ? null : r.profit
  }
}))

// Dearest fragment first.
const fragRows = computed(() => UBER_FRAGMENTS
  .map(name => ({
    name,
    short: name.replace(/ Fragment$/, ''),
    price: px.value.price(name),
    cells: cols.value.map(c => {
      const d = c.drops.get(name)
      return { pct: d ? pct(copies(d)) : '0', estimate: d?.rateSource === 'estimate', favoured: c.favoured.includes(name) }
    })
  }))
  .sort((a, b) => (b.price ?? -1) - (a.price ?? -1)))
</script>

<style module>
.strip {
  display: flex;
  flex-direction: column;
  padding: 4px 8px 6px;
  border-radius: var(--w-r-md);
  border: 1px solid var(--w-line-strong);
  background: var(--w-panel);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-xs);
}
.wrap { overflow-x: auto; margin-top: 3px; }
.fold { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; font-size: var(--w-fs-sm); }
.title { color: var(--w-gold); font-family: var(--w-caps-face); }
.bars { display: grid; grid-template-columns: 4.5em minmax(0, 1fr) auto auto; gap: 3px 8px; align-items: center; margin-top: 4px; font-size: var(--w-fs-xs); }
.bar { height: 7px; border-radius: var(--w-r-sm); background: var(--w-panel-2); overflow: hidden; }
.bar i { display: block; height: 100%; }
.barUp { background: var(--w-up); }
.barDown { background: var(--w-down); }
.vault { color: var(--w-faint); font-size: var(--w-fs-xs); white-space: nowrap; }
.tabs { align-self: flex-start; margin-top: 4px; }
/* Scrolls inside, so a tall list doesn't push the rest of the price check out of the window. */
.vaults { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; max-height: 16em; overflow-y: auto; }
.vblock { border-top: 1px solid var(--w-line); padding-top: 3px; }
.vhead { display: flex; align-items: baseline; gap: 6px; }
.vtitle { color: var(--w-gold); font-family: var(--w-caps-face); }
.vrow { display: flex; justify-content: space-between; gap: 8px; padding-left: 8px; font-variant-numeric: tabular-nums; }
.rare { color: var(--w-r-unique); }
.gridToggle { align-self: flex-start; margin-top: 4px; color: var(--w-faint); font-size: var(--w-fs-xs); }
.gridToggle:hover { color: var(--w-fg); }
/* Fixed columns, every map cell centred: headers, chances, unique, loot and
   profit line up whatever the window's text alignment (PoE layout centres rows). */
.grid { width: 100%; border-collapse: collapse; table-layout: fixed; font-variant-numeric: tabular-nums; }
.grid th, .grid td { padding: 1px 2px; text-align: center !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.grid th:first-child, .grid td:first-child { text-align: left !important; padding-left: 0; width: 34%; }
.lab { color: var(--w-faint); font-weight: 400; }
.mapcost { color: var(--w-faint); font-weight: 400; }
.map { color: var(--w-gold); font-family: var(--w-caps-face); font-weight: 400; vertical-align: bottom; }
.item { display: inline-flex; align-items: center; gap: 4px; }
.fav { color: var(--w-fg); font-weight: 600; }
.low { color: var(--w-faint); }
.est { color: var(--w-warn); }
.sep td { border-top: 1px solid var(--w-line); padding-top: 3px; }
.uniq { color: var(--w-r-unique); }
.ucell { vertical-align: top; }
.uicon { display: block; margin: 0 auto 1px; }
.profit { font-weight: 600; }
.note { margin-top: 4px; padding-top: 4px; border-top: 1px solid var(--w-line); color: var(--w-faint); }
</style>
