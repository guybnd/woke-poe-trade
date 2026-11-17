<template>
  <div :class="$style.wrap" class="w-scroll" data-w-switches>
    <div class="flex items-center gap-2 text-sm">
      <span v-if="g.on" class="w-dim">Your table replaces {{ store.gearReplaced.value }} of NeverSink's gear rules.</span>
      <span v-else class="w-dim">Showing NeverSink's gear rules as they are. Change anything to take them over.</span>
      <WInfo text="Magic and rare gear that drops with a 3.30 item tier. Each cell is the lowest drop tier that shows. Influenced, fractured, veiled and other special gear keeps NeverSink's own rules, which come first." />
      <WButton v-if="g.on" size="sm" variant="ghost" style="margin-left: auto;" @click="backToNeverSink">Back to NeverSink</WButton>
    </div>

    <WSegmented v-model="view" :options="[{ value: 'table', label: 'Table' }, { value: 'ranks', label: `Base ranks${movedCount ? ` · ${movedCount} moved` : ''}` }]" />

    <template v-if="view === 'table'">
      <div class="flex flex-wrap items-center gap-1">
        <span class="w-dim text-xs">Quick</span>
        <WButton size="sm" @click="quick(magicOff)">Magic off</WButton>
        <WButton size="sm" @click="quick(magicLikeRares)">Magic like rares</WButton>
        <WButton size="sm" :disabled="!buildCount" @click="quick(onlyBuild)">Only my build's bases</WButton>
        <WButton size="sm" @click="quick(x => shiftAll(x, 1))">Stricter</WButton>
        <WButton size="sm" @click="quick(x => shiftAll(x, -1))">Looser</WButton>
      </div>

      <div :class="$style.card">
        <div :class="$style.grid">
          <span class="w-dim text-xs">Shows from drop tier</span>
          <span :class="$style.colHead" style="color: var(--w-magic, #8888ff);">Magic</span>
          <span :class="$style.colHead" style="color: var(--w-rare, #ffff77);">Rare</span>
          <template v-for="row in GEAR_ROWS" :key="row">
            <span class="flex flex-col">
              <span>{{ ROW_LABEL[row] }}</span>
              <span class="w-faint text-xs">{{ rowSub(row) }}</span>
            </span>
            <span v-for="r in RARITIES" :key="r" :class="$style.steps" role="group" :aria-label="`${ROW_LABEL[row]}, ${r}: lowest drop tier shown`">
              <button v-for="v in SHOW_FROM" :key="v" type="button" :class="[$style.step, shown[row][r] === v && (r === 'magic' ? $style.onMagic : $style.onRare)]"
                :aria-pressed="shown[row][r] === v" :disabled="row === 'build' && !buildCount"
                :title="stepTitle(row, r, v)" @click="setShow(row, r, v)">{{ v ? v : row === 'build' ? 'Rank' : 'Off' }}</button>
            </span>
          </template>
        </div>
        <div class="w-faint text-xs">{{ sentence }}</div>
      </div>

      <div :class="$style.card">
        <div class="flex items-center gap-2">
          <WToggle :model-value="g.quality.on" @update:model-value="setQualityOn">Over-quality bases</WToggle>
          <WInfo text="Normal, magic or rare gear with this much quality or more, from each row's bases. Off hands it to the rules further down." />
        </div>
        <div v-if="g.quality.on" :class="$style.qgrid">
          <template v-for="row in GEAR_ROWS" :key="row">
            <span>{{ ROW_LABEL[row] }}</span>
            <span :class="$style.steps" role="group" :aria-label="`${ROW_LABEL[row]}: lowest quality shown`">
              <button v-for="v in QUALITY_STEPS" :key="v" type="button" :class="[$style.step, g.quality.min[row] === v && $style.onRare]"
                :aria-pressed="g.quality.min[row] === v" @click="setQuality(row, v)">{{ v ? `${v}%` : 'Off' }}</button>
            </span>
          </template>
        </div>
        <div v-else class="w-faint text-xs">NeverSink's own over-quality lists for now.</div>
      </div>

      <div :class="$style.card">
        <div class="flex items-center gap-2">
          <span>What you'd see</span>
          <span class="w-faint text-xs">bases this table shows, of {{ universe.length }} gear bases</span>
        </div>
        <div :class="$style.pgrid">
          <span />
          <span :class="$style.colHead" style="color: var(--w-magic, #8888ff);">Magic</span>
          <span :class="$style.colHead" style="color: var(--w-rare, #ffff77);">Rare</span>
          <template v-for="t in DROP_TIERS" :key="t">
            <span class="text-sm">Tier {{ t }}</span>
            <span v-for="r in RARITIES" :key="r" :class="$style.bar" :title="`${counts[t][r]} bases`">
              <span :class="$style.fill" :style="{ width: `${universe.length ? Math.round(counts[t][r] / universe.length * 100) : 0}%` }" />
              <span :class="$style.barText">{{ counts[t][r] ? `${counts[t][r]} bases` : 'hidden' }}</span>
            </span>
          </template>
        </div>
      </div>
    </template>

    <template v-else>
      <div :class="$style.card">
        <div class="flex items-center gap-2 flex-wrap">
          <span>{{ buildName ? `Build: ${buildName}` : 'No PoB build linked' }}</span>
          <WToggle v-if="buildName" :model-value="g.build.auto" @update:model-value="v => change(x => { x.build.auto = v })">Take its rare bases</WToggle>
          <span class="w-faint text-xs">{{ buildCount }} in the Build lane</span>
        </div>
        <div v-if="buildName" class="flex flex-wrap gap-1">
          <WButton size="sm" :disabled="!offBuild.length" :title="offBuild.slice(0, 12).join(', ')" @click="neverOffBuild">Move {{ offBuild.length }} bases my build can't use to Never</WButton>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-1">
        <WField v-model="search" placeholder="Find a base…" style="width: 12rem;" aria-label="Find a base" />
        <WChip v-for="s in SLOTS" :key="s" clickable :active="slots.includes(s)" @click="toggle(slots, s)">{{ s }}</WChip>
      </div>
      <div class="flex flex-wrap items-center gap-1">
        <WChip v-for="d in DEFENCES" :key="d" clickable :active="defences.includes(d)" :title="DEFENCE_ATTR[d]" @click="toggle(defences, d)">{{ d }}</WChip>
        <span class="w-dim text-xs" style="margin-left: 6px;">Drop level</span>
        <WField v-model.number="minLevel" type="number" style="width: 4.5rem;" aria-label="Lowest base drop level" />
        <span class="w-dim text-xs">and up</span>
      </div>

      <div v-if="picked.length" :class="$style.selBar">
        <span>{{ picked.length }} picked</span>
        <WButton v-for="l in MOVE_TO" :key="l.lane" size="sm" @click="moveTo(l.lane)">{{ l.label }}</WButton>
        <WButton size="sm" variant="ghost" @click="picked = []">Clear</WButton>
      </div>

      <div :class="$style.lanes">
        <div v-for="lane in lanes" :key="lane.key" :class="[$style.lane, lane.key === 'build' && $style.buildLane]">
          <div :class="$style.laneHead">
            <span>{{ lane.label }}</span>
            <span class="w-faint text-xs">{{ lane.bases.length }}</span>
          </div>
          <div :class="$style.laneBody" class="w-scroll">
            <button v-for="b in lane.bases.slice(0, LANE_CAP)" :key="b" type="button" :class="[$style.base, picked.includes(b) && $style.picked]"
              :title="baseTitle(b, lane.key)" :aria-pressed="picked.includes(b)" @click="pick(b, $event)">
              <img v-if="info(b).icon" :src="info(b).icon!" alt="" :class="$style.icon">
              <span :class="$style.baseText">
                <span>{{ b }}</span>
                <span class="w-faint" style="font-size: var(--w-fs-xs, 10px);">{{ [info(b).slot, info(b).defence].filter(Boolean).join(' · ') }}<template v-if="wasRank(b, lane.key)"> · was {{ wasRank(b, lane.key) }}</template></span>
              </span>
            </button>
            <span v-if="lane.bases.length > LANE_CAP" class="w-faint text-xs">+{{ lane.bases.length - LANE_CAP }} more, narrow with search</span>
          </div>
        </div>
      </div>
      <div class="w-faint text-xs">Click to pick, shift-click for a run. A move applies to every drop tier. "was R2" marks a base moved off NeverSink's rank.</div>
      <div class="flex gap-1">
        <WButton size="sm" variant="ghost" :disabled="!movedCount" @click="change(x => { x.moves = {} })">Reset ranks to NeverSink</WButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { WButton, WChip, WField, WInfo, WSegmented, WToggle } from '../ui'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import { DROP_TIERS, GEAR_ROWS, QUALITY_STEPS, RANKS, SHOW_FROM, buildBases, gearDefaults, laneOf, magicLikeRares, magicOff, rankLists, readTiered, shiftAll } from './gear'
import type { GearRarity, GearRow, GearSettings, Lane } from './gear'
import { DEFENCES, DEFENCE_ATTR, SLOTS, allGearBases, baseInfo } from './gear-bases'
import type { BaseInfo, Defence, Slot } from './gear-bases'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
}>()

const RARITIES: GearRarity[] = ['magic', 'rare']
const ROW_LABEL: Record<GearRow, string> = { build: 'Build bases', r1: 'Rank 1', r2: 'Rank 2', r3: 'Rank 3', any: 'Any other base' }
const LANE_CAP = 80
const MOVE_TO: Array<{ lane: Lane | 'build' | 'unbuild', label: string }> = [
  { lane: 'build', label: 'Add to Build' },
  { lane: 'unbuild', label: 'Out of Build' },
  { lane: 'r1', label: 'Rank 1' },
  { lane: 'r2', label: 'Rank 2' },
  { lane: 'r3', label: 'Rank 3' },
  { lane: 'none', label: 'Unranked' },
  { lane: 'never', label: 'Never' }
]

const g = computed(() => props.config.presets.gear)
const view = ref<'table' | 'ranks'>('table')

// NeverSink's tiered gear rules as they came (with your edits): read while
// the table is off, since on it they are commented out.
const source = computed(() => {
  const doc = props.store.doc.value
  return doc ? readTiered(doc) : null
})
const defaults = computed(() => {
  const doc = props.store.doc.value
  return doc && !g.value.on ? gearDefaults(doc) : null
})
const shown = computed(() => g.value.on || !defaults.value ? g.value.show : defaults.value.show)

const buildName = computed(() => props.store.buildInput.value?.buildName ?? '')
const autoBases = computed(() => props.store.buildInput.value?.rareBases ?? [])
const build = computed(() => buildBases(g.value, autoBases.value))
const buildCount = computed(() => build.value.length)
const lists = computed(() => source.value ? rankLists(source.value, g.value) : { r1: [], r2: [], r3: [], never: [] })
const movedCount = computed(() => Object.keys(g.value.moves).length)

// Takes NeverSink's numbers first, so the first change is the only change.
function change (fn: (x: GearSettings) => void) {
  const x = g.value
  if (!x.on) {
    const doc = props.store.doc.value
    if (doc && readTiered(doc)) x.show = gearDefaults(doc).show
    x.on = true
  }
  fn(x)
}
const quick = (fn: (x: GearSettings) => void) => change(fn)

function setShow (row: GearRow, r: GearRarity, v: number) {
  change(x => { x.show[row][r] = v })
}
function setQuality (row: GearRow, v: number) {
  change(x => { x.quality.min[row] = v })
}
function setQualityOn (v: boolean) {
  change(x => { x.quality.on = v })
}
function onlyBuild (x: GearSettings) {
  for (const row of ['r1', 'r2', 'r3', 'any'] as const) x.show[row] = { magic: 0, rare: 0 }
  if (!x.show.build.rare) x.show.build.rare = 2
}
function backToNeverSink () {
  const x = g.value
  x.on = false
  x.quality.on = false
}

function rowSub (row: GearRow): string {
  if (row === 'build') return buildCount.value ? `${buildCount.value} from your build` : 'link a PoB build'
  if (row === 'any') return 'everything unranked'
  return `${lists.value[row].length} bases`
}
function stepTitle (row: GearRow, r: GearRarity, v: number): string {
  if (!v) return row === 'build' ? `${r === 'magic' ? 'Magic' : 'Rare'} build bases follow their rank` : `Never show ${r} ${ROW_LABEL[row].toLowerCase()} for its drop tier`
  return `Show ${r} ${ROW_LABEL[row].toLowerCase()} from drop tier ${v}`
}

const sentence = computed(() => {
  const s = shown.value
  const part = (r: GearRarity) => {
    const rows = (['r1', 'r2', 'r3', 'any'] as const).map(row => s[row][r] ? `${ROW_LABEL[row].toLowerCase()} from ${s[row][r]}` : null).filter(Boolean)
    return rows.length ? rows.join(', ') : 'never'
  }
  const b = buildCount.value && (s.build.rare || s.build.magic) ? ` Build bases: rare from ${s.build.rare || 'rank'}, magic from ${s.build.magic || 'rank'}.` : ''
  return `Rares show ${part('rare')}. Magic shows ${part('magic')}.${b}`
})

// ---- Preview: what the table lets through, base by base ----
const universe = computed(() => {
  const set = new Set(allGearBases())
  for (const r of RANKS) lists.value[r].forEach(b => set.add(b))
  return [...set]
})
const counts = computed(() => {
  const s = shown.value
  const rankOf = new Map<string, GearRow>()
  for (const r of RANKS) lists.value[r].forEach(b => rankOf.set(b, r))
  const never = new Set(lists.value.never)
  const inBuild = new Set(build.value)
  const out: Record<number, Record<GearRarity, number>> = {}
  for (const t of DROP_TIERS) {
    out[t] = { magic: 0, rare: 0 }
    for (const r of RARITIES) {
      for (const b of universe.value) {
        if (never.has(b)) continue
        const row = rankOf.get(b) ?? 'any'
        const line = s[row][r]
        const buildLine = inBuild.has(b) ? s.build[r] : 0
        if ((buildLine && t >= buildLine) || (line && t >= line)) out[t][r]++
      }
    }
  }
  return out
})

// ---- Base ranks ----
const search = ref('')
const slots = ref<Slot[]>([])
const defences = ref<Defence[]>([])
const minLevel = ref(0)
const picked = ref<string[]>([])
let lastPick: string | null = null

const info = (b: string): BaseInfo => baseInfo(b)
function toggle<T> (list: T[], v: T) {
  const i = list.indexOf(v)
  if (i >= 0) list.splice(i, 1)
  else list.push(v)
}
function visible (b: string): boolean {
  const i = info(b)
  if (search.value.trim() && !b.toLowerCase().includes(search.value.trim().toLowerCase())) return false
  if (slots.value.length && (!i.slot || !slots.value.includes(i.slot))) return false
  if (defences.value.length && (!i.defence || !defences.value.includes(i.defence))) return false
  if (minLevel.value > 0 && (i.dropLevel ?? 0) < minLevel.value) return false
  return true
}
const lanes = computed(() => {
  const ranked = new Set([...lists.value.r1, ...lists.value.r2, ...lists.value.r3, ...lists.value.never])
  const unranked = universe.value.filter(b => !ranked.has(b))
  const lane = (key: string, label: string, bases: string[]) => ({ key, label, bases: bases.filter(visible) })
  return [
    lane('build', 'Build', build.value),
    lane('r1', 'Rank 1', lists.value.r1),
    lane('r2', 'Rank 2', lists.value.r2),
    lane('r3', 'Rank 3', lists.value.r3),
    lane('none', 'Unranked', unranked),
    lane('never', 'Never', lists.value.never)
  ]
})
function pick (b: string, e: MouseEvent) {
  if (e.shiftKey && lastPick) {
    const lane = lanes.value.find(l => l.bases.includes(b) && l.bases.includes(lastPick!))
    if (lane) {
      const [a, z] = [lane.bases.indexOf(lastPick), lane.bases.indexOf(b)].sort((x, y) => x - y)
      picked.value = [...new Set([...picked.value, ...lane.bases.slice(a, z + 1)])]
      lastPick = b
      return
    }
  }
  picked.value = picked.value.includes(b) ? picked.value.filter(x => x !== b) : [...picked.value, b]
  lastPick = b
}
function wasRank (b: string, lane: string): string {
  if (lane === 'build' || !g.value.moves[b] || !source.value) return ''
  const orig = RANKS.find(r => source.value!.ranks[r].includes(b))
  return orig ? `R${orig.slice(1)}` : ''
}
function baseTitle (b: string, lane: string): string {
  const i = info(b)
  const parts = [b, i.slot, i.defence && `${i.defence} (${DEFENCE_ATTR[i.defence]})`, i.dropLevel != null ? `drop level ${i.dropLevel}` : null]
  const was = wasRank(b, lane)
  if (was) parts.push(`NeverSink: ${was}`)
  return parts.filter(Boolean).join(' · ')
}
function moveTo (lane: Lane | 'build' | 'unbuild') {
  const bases = [...picked.value]
  change(x => {
    if (lane === 'build') {
      x.build.removed = x.build.removed.filter(b => !bases.includes(b))
      x.build.extra = [...new Set([...x.build.extra, ...bases.filter(b => !autoBases.value.includes(b))])]
      return
    }
    if (lane === 'unbuild') {
      x.build.extra = x.build.extra.filter(b => !bases.includes(b))
      x.build.removed = [...new Set([...x.build.removed, ...bases.filter(b => autoBases.value.includes(b))])]
      return
    }
    const moves: Record<string, Lane> = Object.fromEntries(Object.entries(x.moves).filter(([b]) => !bases.includes(b)))
    for (const b of bases) {
      // Back where NeverSink had it: no move to remember.
      const orig = source.value ? laneOf(source.value, { ...x, moves: {} }, b) : 'none'
      if (orig !== lane) moves[b] = lane
    }
    x.moves = moves
  })
  picked.value = []
}

// Armour your build doesn't wear (by defence) and weapons it doesn't use.
const offBuild = computed(() => {
  const own = build.value.map(info)
  const wears = new Set(own.filter(i => i.defence).map(i => i.defence))
  const weapons = new Set(own.filter(i => i.slot && ['1H', '2H', 'Caster', 'Bow'].includes(i.slot)).map(i => i.slot))
  if (!wears.size && !weapons.size) return []
  return universe.value.filter(b => {
    if (lists.value.never.includes(b) || build.value.includes(b)) return false
    const i = info(b)
    if (wears.size && i.defence && !wears.has(i.defence)) return true
    if (weapons.size && i.slot && ['1H', '2H', 'Caster', 'Bow'].includes(i.slot) && !weapons.has(i.slot)) return true
    return false
  })
})
function neverOffBuild () {
  const bases = offBuild.value
  change(x => { for (const b of bases) x.moves[b] = 'never' })
}
</script>

<style module>
.wrap {
  max-height: min(40rem, calc(76vh / var(--w-ui-scale, 1)));
  padding: 8px var(--w-pad) 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  background: var(--w-panel-2);
  border-radius: var(--w-r-sm);
}
.grid {
  display: grid;
  grid-template-columns: minmax(8rem, auto) repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
  align-items: center;
}
.qgrid {
  display: grid;
  grid-template-columns: minmax(8rem, auto) minmax(0, 1fr);
  gap: 6px 12px;
  align-items: center;
}
.pgrid {
  display: grid;
  grid-template-columns: 4rem repeat(2, minmax(0, 1fr));
  gap: 4px 8px;
  align-items: center;
}
.colHead {
  font-size: var(--w-fs-xs, 12px);
  font-weight: 600;
}
.steps {
  display: flex;
  gap: 2px;
}
.step {
  min-width: 2.2rem;
  height: 1.8rem;
  padding: 0 6px;
  font-size: var(--w-fs-xs, 12px);
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-border);
  background: transparent;
  color: var(--w-text-dim);
  cursor: pointer;
}
.step:hover:not(:disabled) { color: var(--w-text); border-color: var(--w-text-dim); }
.step:disabled { opacity: 0.4; cursor: default; }
.onMagic { border-color: #8888ff; background: rgb(136 136 255 / 18%); color: #b8b8ff; }
.onRare { border-color: #e8d24a; background: rgb(232 210 74 / 16%); color: #f3e27a; }
.bar {
  position: relative;
  height: 1.5rem;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-border);
  overflow: hidden;
  font-size: var(--w-fs-xs, 12px);
}
.fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: rgb(0 200 160 / 28%);
}
.barText {
  position: relative;
  padding: 0 6px;
  line-height: calc(1.5rem * var(--w-text-scale, 1));
}
.selBar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: var(--w-r-sm);
  background: var(--w-panel-2);
  border: 1px solid var(--w-accent, #e0b860);
}
.lanes {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
}
.lane {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 6px;
  border-radius: var(--w-r-sm);
  background: var(--w-panel-2);
}
.buildLane { outline: 1px solid var(--w-accent, #e0b860); }
.laneHead {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: var(--w-fs-xs, 12px);
  font-weight: 600;
}
.laneBody {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 22rem;
}
.base {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
  text-align: left;
  font-size: var(--w-fs-xs, 11px);
  border-radius: var(--w-r-sm);
  border: 1px solid transparent;
  background: var(--w-panel);
  color: var(--w-text);
  cursor: pointer;
}
.base:hover { border-color: var(--w-border); }
.picked { border-color: var(--w-accent, #e0b860); background: rgb(224 184 96 / 14%); }
.icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex: none;
}
.baseText {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
