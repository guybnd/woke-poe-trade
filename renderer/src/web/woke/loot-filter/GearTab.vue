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
          <span />
          <span :class="$style.groupHead" style="grid-column: span 5; color: #a8a8ff;">Magic</span>
          <span />
          <span :class="$style.groupHead" style="grid-column: span 5; color: #f3e27a;">Rare</span>
          <span class="w-faint text-xs">Shows from drop tier</span>
          <template v-for="r in RARITIES" :key="`h-${r}`">
            <span v-for="v in SHOW_FROM" :key="v" :class="$style.stepHead">{{ v || 'Off' }}</span>
            <span v-if="r === 'magic'" />
          </template>
          <template v-for="row in GEAR_ROWS" :key="row">
            <span :class="$style.rowHead">
              <span>{{ ROW_LABEL[row] }}</span>
              <span class="w-faint text-xs">{{ rowSub(row) }}</span>
            </span>
            <template v-for="r in RARITIES" :key="r">
              <button v-for="v in SHOW_FROM" :key="v" type="button" :class="cellClass(row, r, v)"
                :aria-pressed="shown[row][r] === v" :aria-label="stepTitle(row, r, v)" :disabled="row === 'build' && !buildCount"
                :title="stepTitle(row, r, v)" @click="setShow(row, r, v)">{{ cellText(row, r, v) }}</button>
              <span v-if="r === 'magic'" />
            </template>
          </template>
        </div>
        <WToggle :model-value="g.exoticAlways" @update:model-value="v => change(x => { x.exoticAlways = v })">Always show exotic bases: any drop tier or none, any rarity</WToggle>
        <div :class="$style.sentence">
          <span><b style="color: #f3e27a;">Rare</b> {{ sentence.rare }}</span>
          <span><b style="color: #a8a8ff;">Magic</b> {{ sentence.magic }}</span>
          <span v-if="sentence.build">{{ sentence.build }}</span>
        </div>
      </div>

      <div :class="$style.card">
        <div class="flex items-center gap-2">
          <span>Looks</span>
          <WInfo text="How the table's labels look. NeverSink gives magic and rare gear the same colours; here each rarity can look its own way. Each row and drop tier keeps NeverSink's size and sound." />
          <WToggle :model-value="g.look.rarityText" style="margin-left: 8px;" @update:model-value="v => change(x => { x.look.rarityText = v })">Game's rarity colour for the text</WToggle>
        </div>
        <div :class="$style.looks">
          <div v-for="r in RARITIES" :key="r" :class="$style.lookCol">
            <div class="flex items-center gap-2">
              <b :style="{ color: r === 'magic' ? '#a8a8ff' : '#f3e27a' }">{{ r === 'magic' ? 'Magic' : 'Rare' }}</b>
              <WButton size="sm" @click="editing = editing === r ? null : r">{{ editing === r ? 'Done' : 'Change look' }}</WButton>
              <WButton v-if="Object.keys(g.look[r]).length" size="sm" variant="ghost" @click="change(x => { x.look[r] = {} })">Reset</WButton>
            </div>
            <div class="flex flex-wrap gap-2 items-end">
              <span v-for="t in [5, 3]" :key="t" class="flex flex-col items-start gap-1">
                <LabelPreview :text="sampleBase(r)" :actions="sampleActions(r, t)" :extras="false" :default-text="r === 'magic' ? [136, 136, 255, 255] : [255, 255, 119, 255]" :scale="1.1" />
                <span class="w-faint text-xs">rank 1, tier {{ t }}</span>
              </span>
            </div>
            <StyleEditor v-if="editing === r" look-only :look="sampleLook(r)" visibility="Show" :preview-text="sampleBase(r)"
              @patch="p => change(x => { x.look[r] = { ...x.look[r], ...p } })" />
          </div>
        </div>
      </div>

      <div :class="$style.card">
        <div class="flex items-center gap-2">
          <WToggle :model-value="g.quality.on" @update:model-value="setQualityOn">Over-quality bases</WToggle>
          <WInfo text="White, magic or rare gear with at least this much quality, from each row's bases. Off hands it to the rules further down." />
        </div>
        <div v-if="g.quality.on" :class="$style.qgrid">
          <span class="w-faint text-xs">Shows from quality</span>
          <span v-for="v in QUALITY_STEPS" :key="v" :class="$style.stepHead">{{ v ? `${v}%` : 'Off' }}</span>
          <template v-for="row in GEAR_ROWS" :key="row">
            <span :class="$style.rowHead">{{ ROW_LABEL[row] }}</span>
            <button v-for="v in QUALITY_STEPS" :key="v" type="button" :class="qualityClass(row, v)"
              :aria-pressed="g.quality.min[row] === v" :aria-label="qualityTitle(row, v)" :title="qualityTitle(row, v)" @click="setQuality(row, v)">{{ v && g.quality.min[row] && v >= g.quality.min[row] ? '✓' : '' }}</button>
          </template>
        </div>
        <div v-else class="w-faint text-xs">Using NeverSink's own over-quality lists. Switch on to pick a line per row.</div>
      </div>

      <div :class="$style.card">
        <div class="flex items-center gap-2">
          <span>How much gear this shows</span>
          <WInfo text="Every gear base in the game, run through the table for each rarity and drop tier. Special gear (influenced, fractured and the rest) comes first in the filter and isn't counted here." />
          <span class="w-faint text-xs">Click a cell for its bases.</span>
        </div>
        <div :class="$style.pgrid">
          <span class="w-faint text-xs">Drop tier</span>
          <span :class="$style.groupHead" style="color: #a8a8ff;">Magic</span>
          <span :class="$style.groupHead" style="color: #f3e27a;">Rare</span>
          <template v-for="t in DROP_TIERS" :key="t">
            <span :class="$style.rowHead">Tier {{ t }}</span>
            <button v-for="r in RARITIES" :key="r" type="button" :class="[$style.bar, picks?.t === t && picks?.r === r && $style.barPicked]"
              :aria-pressed="picks?.t === t && picks?.r === r" @click="picks = picks?.t === t && picks?.r === r ? null : { t, r }">
              <span :class="[$style.fill, r === 'magic' ? $style.fillMagic : $style.fillRare]" :style="{ width: `${universe.length ? Math.round(counts[t][r].n / universe.length * 100) : 0}%` }" />
              <span :class="$style.barText">{{ countText(counts[t][r]) }}</span>
            </button>
          </template>
        </div>
        <div v-if="picked2" :class="$style.baseList">
          <div class="text-sm">{{ picked2.title }}</div>
          <div v-for="part in picked2.parts" :key="part.row" class="flex flex-col gap-1">
            <span class="w-dim text-xs">{{ ROW_LABEL[part.row] }} · {{ part.bases.length }}</span>
            <div class="flex flex-wrap gap-1">
              <span v-for="b in part.bases.slice(0, part.open ? undefined : 40)" :key="b" :class="$style.baseChip" :title="baseTitle(b, part.row)">
                <img v-if="info(b).icon" :src="info(b).icon!" alt="" :class="$style.chipIcon">{{ b }}
              </span>
              <WButton v-if="part.bases.length > 40 && !part.open" size="sm" variant="ghost" @click="openParts.push(part.row)">+{{ part.bases.length - 40 }} more</WButton>
            </div>
          </div>
        </div>
      </div>

      <div :class="$style.card">
        <div class="flex items-center gap-2 flex-wrap">
          <span>Test drops</span>
          <span class="w-faint text-xs">{{ pile.length }} random gear drops through your whole filter: {{ pileShown }} shown, {{ pile.length - pileShown }} hidden</span>
          <WButton size="sm" style="margin-left: auto;" @click="seed++">New drops</WButton>
        </div>
        <div class="flex flex-wrap items-center gap-1">
          <span class="w-dim text-xs">Mix in</span>
          <WChip v-for="d in DECORATORS" :key="d.key" clickable :active="decos.includes(d.key)" @click="toggle(decos, d.key)">{{ d.label }}</WChip>
        </div>
        <template v-for="group in pileGroups" :key="group.key">
          <div v-if="group.drops.length" :class="$style.pileHead">{{ group.label }} · {{ group.drops.length }}</div>
          <div v-if="group.drops.length" :class="$style.ground">
            <div v-for="d in group.drops" :key="d.id" :class="[$style.drop, group.key === 'hidden' && $style.hiddenDrop]" :title="d.title">
              <LabelPreview :text="d.label" :actions="d.actions" :visibility="'Show'" :extras="false" :default-text="d.colour" :scale="1.15" />
              <span :class="$style.dropWhat">
                <b :style="{ color: d.rarity === 'Magic' ? '#a8a8ff' : '#f3e27a' }">{{ d.rarity }}</b>
                · {{ d.tier ? `tier ${d.tier}` : 'no tier' }} · {{ ROW_LABEL[d.row as GearRow] }}
              </span>
              <span v-if="d.tags.length" :class="$style.dropTags">{{ d.tags.join(' · ') }}</span>
              <span :class="$style.dropWhy">{{ d.why }}</span>
            </div>
          </div>
        </template>
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
                <span class="w-faint" style="font-size: var(--w-fs-xs, 10px);">{{ [info(b).slot, info(b).defence].filter(Boolean).join(' · ') }}<template v-if="wasRank(b, lane.key)"> · was {{ wasRank(b, lane.key) }}</template><template v-if="lane.key !== 'exotic' && exotics.has(b)"> · <span style="color: #e0b860;">exotic</span></template></span>
              </span>
            </button>
            <span v-if="lane.bases.length > LANE_CAP" class="w-faint text-xs">+{{ lane.bases.length - LANE_CAP }} more, narrow with search</span>
          </div>
        </div>
      </div>
      <div class="w-faint text-xs">Click to pick, shift-click for a run. A move applies to every drop tier. "was R2" marks a base moved off NeverSink's rank. Exotic: talismans, experimented and other special bases NeverSink shows with their own rules, before this table; they only reach the table when those rules pass them by.</div>
      <div class="flex gap-1">
        <WButton size="sm" variant="ghost" :disabled="!movedCount" @click="change(x => { x.moves = {} })">Reset ranks to NeverSink</WButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useCssModule } from 'vue'
import { WButton, WChip, WField, WInfo, WSegmented, WToggle } from '../ui'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import { DROP_TIERS, GEAR_ROWS, GEAR_TYPE, exoticBases, QUALITY_STEPS, RANKS, SHOW_FROM, buildBases, gearDefaults, laneOf, magicLikeRares, magicOff, rankLists, readTiered, shiftAll } from './gear'
import type { GearRarity, GearRow, GearSettings, Lane } from './gear'
import { DEFENCES, DEFENCE_ATTR, SLOTS, allGearBases, baseInfo } from './gear-bases'
import type { BaseInfo, Defence, Slot } from './gear-bases'
import { DECORATORS, rollPile } from './gear-pile'
import type { Decorator } from './gear-pile'
import { matchItem } from './match'
import { defaultTextColour } from './drops'
import { ruleLabel } from './parse'
import LabelPreview from './LabelPreview.vue'
import { tierLabel } from './names'
import StyleEditor from './StyleEditor.vue'
import { applyStyle as applyStyleTo, readStyle } from './edits'
import type { StylePatch } from './edits'
import type { FilterAction } from './parse'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
}>()

const useCss = useCssModule()
const RARITIES: GearRarity[] = ['magic', 'rare']
const ROW_LABEL: Record<GearRow, string> = { build: 'Build bases', r1: 'Rank 1', r2: 'Rank 2', r3: 'Rank 3', any: 'Unranked (trash)' }
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
  if (row === 'any') return 'every other base; exotics have their own rules'
  return `${lists.value[row].length} bases`
}
function stepTitle (row: GearRow, r: GearRarity, v: number): string {
  if (!v) return row === 'build' ? `${r === 'magic' ? 'Magic' : 'Rare'} build bases follow their rank` : `Never show ${r} ${ROW_LABEL[row].toLowerCase()} for its drop tier`
  return `Show ${r} ${ROW_LABEL[row].toLowerCase()} from drop tier ${v}`
}

// A cell is lit when that drop tier shows; the picked one is the line.
function cellClass (row: GearRow, r: GearRarity, v: number) {
  const line = shown.value[row][r]
  const lit = v !== 0 && line !== 0 && v >= line
  return [
    useCss.cell,
    lit && (r === 'magic' ? useCss.litMagic : useCss.litRare),
    line === v && useCss.line,
    v === 0 && line === 0 && (row === 'build' ? useCss.followRank : useCss.off)
  ]
}
function cellText (row: GearRow, r: GearRarity, v: number): string {
  const line = shown.value[row][r]
  if (v === 0) return line === 0 ? (row === 'build' ? 'Rank' : 'Off') : ''
  return line !== 0 && v >= line ? '✓' : ''
}
function qualityClass (row: GearRow, v: number) {
  const line = g.value.quality.min[row]
  return [useCss.cell, v !== 0 && line !== 0 && v >= line && useCss.litRare, line === v && useCss.line, v === 0 && line === 0 && useCss.off]
}
function qualityTitle (row: GearRow, v: number): string {
  return v ? `Show ${ROW_LABEL[row].toLowerCase()} with ${v}% quality or more` : `No over-quality rule for ${ROW_LABEL[row].toLowerCase()}`
}

const sentence = computed(() => {
  const s = shown.value
  const part = (r: GearRarity) => {
    const rows = (['r1', 'r2', 'r3', 'any'] as const).map(row => s[row][r] ? `${ROW_LABEL[row].toLowerCase()} from tier ${s[row][r]}` : null).filter(Boolean)
    return rows.length ? `shows ${rows.join(', ')}.` : 'never shows.'
  }
  const build = buildCount.value && (s.build.rare || s.build.magic)
    ? `Your build's bases: rare from ${s.build.rare ? `tier ${s.build.rare}` : 'their rank'}, magic from ${s.build.magic ? `tier ${s.build.magic}` : 'their rank'}.`
    : ''
  return { rare: part('rare'), magic: part('magic'), build }
})

// ---- How much gear this shows, base by base ----
const universe = computed(() => {
  const set = new Set(allGearBases())
  for (const r of RANKS) lists.value[r].forEach(b => set.add(b))
  return [...set]
})
interface Count { n: number, byRow: Partial<Record<GearRow, string[]>> }
const counts = computed(() => {
  const s = shown.value
  const rankOf = new Map<string, GearRow>()
  for (const r of RANKS) lists.value[r].forEach(b => rankOf.set(b, r))
  const never = new Set(lists.value.never)
  const inBuild = new Set(build.value)
  const out: Record<number, Record<GearRarity, Count>> = {}
  for (const t of DROP_TIERS) {
    out[t] = { magic: { n: 0, byRow: {} }, rare: { n: 0, byRow: {} } }
    for (const r of RARITIES) {
      const c = out[t][r]
      for (const b of universe.value) {
        if (never.has(b)) continue
        const row = rankOf.get(b) ?? 'any'
        const line = s[row][r]
        const buildLine = inBuild.has(b) ? s.build[r] : 0
        const by: GearRow | null = buildLine && t >= buildLine ? 'build' : line && t >= line ? row : null
        if (!by) continue
        c.n++
        ;(c.byRow[by] ??= []).push(b)
      }
    }
  }
  return out
})
const SHORT_ROW: Record<GearRow, string> = { build: 'build', r1: 'rank 1', r2: 'rank 2', r3: 'rank 3', any: 'unranked' }
function countText (c: Count): string {
  if (!c.n) return 'none'
  return GEAR_ROWS.filter(r => c.byRow[r]?.length).map(r => `${c.byRow[r]!.length} ${SHORT_ROW[r]}`).join(' + ')
}
// The bases behind one cell, row by row.
const picks = ref<{ t: number, r: GearRarity } | null>(null)
const openParts = ref<GearRow[]>([])
const picked2 = computed(() => {
  const p = picks.value
  if (!p) return null
  const c = counts.value[p.t]?.[p.r]
  if (!c) return null
  return {
    title: `${p.r === 'magic' ? 'Magic' : 'Rare'}, drop tier ${p.t}: ${c.n} of ${universe.value.length} gear bases show`,
    parts: GEAR_ROWS.filter(r => c.byRow[r]?.length).map(r => ({ row: r, bases: [...c.byRow[r]!].sort(), open: openParts.value.includes(r) }))
  }
})

// ---- Looks: samples from NeverSink's rank 1 rules with the table's look ----
const editing = ref<GearRarity | null>(null)
function sampleBase (r: GearRarity): string {
  return lists.value.r1[r === 'magic' ? 1 : 0] ?? 'Twilight Regalia'
}
function sampleActions (r: GearRarity, t: number): FilterAction[] {
  const block = source.value?.cells.get(`r1:${t}`)?.block
  let acts = (block?.actions ?? []).map(a => ({ key: a.key, args: [...a.args] }))
  if (g.value.look.rarityText) acts = acts.filter(a => a.key !== 'SetTextColor')
  const patch: StylePatch = g.value.look[r]
  if (!Object.keys(patch).length) return acts
  const tmp = { actions: acts } as unknown as Parameters<typeof applyStyleTo>[0]
  applyStyleTo(tmp, patch)
  return tmp.actions
}
function sampleLook (r: GearRarity): StylePatch {
  return readStyle(sampleActions(r, 5))
}

// ---- Test drops: a pile of gear through the filter as built ----
const seed = ref(1)
const decos = ref<Decorator[]>(['influenced', 'fractured', 'corrupted'])
const pile = computed(() => {
  const doc = props.store.doc.value
  if (!doc) return []
  const ranked = new Set([...lists.value.r1, ...lists.value.r2, ...lists.value.r3])
  const drops = rollPile({
    rows: [
      { row: 'build', bases: build.value, weight: 2 },
      { row: 'r1', bases: lists.value.r1, weight: 3 },
      { row: 'r2', bases: lists.value.r2, weight: 3 },
      { row: 'r3', bases: lists.value.r3, weight: 2 },
      { row: 'any', bases: universe.value.filter(b => !ranked.has(b) && !lists.value.never.includes(b)), weight: 2 }
    ],
    decorators: decos.value,
    count: 36,
    seed: seed.value
  })
  return drops.map(d => {
    const m = matchItem(doc, d.facts, { brief: true })
    const rule = m.final?.block
    const hidden = m.visibility === 'Hide'
    const by = !rule
      ? 'no rule matched'
      : rule.type === GEAR_TYPE
        ? 'your Gear table'
        : rule.type?.startsWith('woke->') ? ruleLabel(rule.type, rule.tier) : `NeverSink: ${ruleLabel(rule.type, rule.tier)}`
    return {
      id: d.id,
      label: d.facts.baseType!,
      rarity: d.facts.rarity,
      tier: d.tier,
      row: d.row,
      tags: d.tags,
      actions: m.actions,
      visibility: m.visibility,
      colour: defaultTextColour(d.facts),
      why: `${hidden ? 'Hidden' : 'Shown'} by ${by}`,
      title: `${d.facts.rarity} ${d.facts.baseType}, item level ${d.facts.itemLevel}`
    }
  })
})
const pileShown = computed(() => pile.value.filter(d => d.visibility !== 'Hide').length)
const pileGroups = computed(() => [
  { key: 'shown', label: 'Shown', drops: pile.value.filter(d => d.visibility !== 'Hide') },
  { key: 'hidden', label: 'Hidden', drops: pile.value.filter(d => d.visibility === 'Hide') }
])

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
const exotics = computed(() => props.store.doc.value ? exoticBases(props.store.doc.value) : new Map<string, string[]>())
const lanes = computed(() => {
  const ranked = new Set([...lists.value.r1, ...lists.value.r2, ...lists.value.r3, ...lists.value.never])
  const unranked = universe.value.filter(b => !ranked.has(b) && !exotics.value.has(b))
  const exotic = [...exotics.value.keys()].filter(b => !ranked.has(b) && info(b).slot).sort()
  const lane = (key: string, label: string, bases: string[]) => ({ key, label, bases: bases.filter(visible) })
  return [
    lane('build', 'Build', build.value),
    lane('r1', 'Rank 1', lists.value.r1),
    lane('r2', 'Rank 2', lists.value.r2),
    lane('r3', 'Rank 3', lists.value.r3),
    lane('exotic', 'Exotic', exotic),
    lane('none', 'Unranked (trash)', unranked),
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
  const ex = exotics.value.get(b)
  if (ex) parts.push(`NeverSink's Exotic bases show it first (${ex.map(tierLabel).join(', ')}); change those under Rules`)
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
  grid-template-columns: minmax(9rem, 12rem) repeat(5, 2.6rem) 1.2rem repeat(5, 2.6rem);
  gap: 4px 3px;
  align-items: center;
  justify-content: start;
}
.qgrid {
  display: grid;
  grid-template-columns: minmax(9rem, 12rem) repeat(5, 2.6rem);
  gap: 4px 3px;
  align-items: center;
  justify-content: start;
}
.pgrid {
  display: grid;
  grid-template-columns: minmax(9rem, 12rem) repeat(2, minmax(10rem, 16rem));
  gap: 4px 8px;
  align-items: center;
  justify-content: start;
}
.groupHead {
  font-size: var(--w-fs-sm, 13px);
  font-weight: 600;
  text-align: center;
  border-bottom: 1px solid var(--w-border);
  padding-bottom: 2px;
}
.stepHead {
  font-size: var(--w-fs-xs, 11px);
  color: var(--w-text-dim);
  text-align: center;
}
.rowHead {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}
.cell {
  height: 2rem;
  font-size: var(--w-fs-xs, 12px);
  border-radius: 2px;
  border: 1px solid var(--w-border);
  background: rgb(0 0 0 / 25%);
  color: var(--w-text-dim);
  cursor: pointer;
}
.cell:hover:not(:disabled) { border-color: var(--w-text-dim); color: var(--w-text); }
.cell:disabled { opacity: 0.35; cursor: default; }
.litMagic { background: rgb(136 136 255 / 30%); border-color: rgb(136 136 255 / 50%); color: #d0d0ff; }
.litRare { background: rgb(232 210 74 / 26%); border-color: rgb(232 210 74 / 45%); color: #fff2a0; }
.line { box-shadow: inset 0 0 0 2px currentColor; }
.off { background: rgb(200 60 50 / 22%); border-color: rgb(200 60 50 / 50%); color: #f0a090; }
.followRank { background: rgb(255 255 255 / 8%); color: var(--w-text); }
.sentence {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--w-fs-xs, 12px);
  color: var(--w-text-dim);
}
.bar {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  text-align: left;
  color: var(--w-text);
  cursor: pointer;
  background: transparent;
  height: 1.5rem;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-border);
  overflow: hidden;
  font-size: var(--w-fs-xs, 12px);
}
.fill {
  position: absolute;
  inset: 0 auto 0 0;
}
.barPicked { outline: 2px solid var(--w-text-dim); }
.baseList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border-radius: var(--w-r-sm);
  background: rgb(0 0 0 / 25%);
  max-height: 22rem;
  overflow-y: auto;
}
.baseChip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px 2px 2px;
  font-size: var(--w-fs-xs, 11px);
  border-radius: var(--w-r-sm);
  background: var(--w-panel);
}
.chipIcon { width: 18px; height: 18px; object-fit: contain; }
.fillMagic { background: rgb(136 136 255 / 28%); }
.fillRare { background: rgb(232 210 74 / 24%); }
.barText {
  position: relative;
  padding: 0 6px;
  line-height: calc(1.5rem * var(--w-text-scale, 1));
}
.looks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.lookCol {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.pileHead {
  font-size: var(--w-fs-xs, 12px);
  color: var(--w-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.ground {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 6px;
  padding: 8px;
  border-radius: var(--w-r-sm);
  background: #0c0b09;
}
.drop {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 6px;
  border-radius: var(--w-r-sm);
  background: rgb(255 255 255 / 3%);
  min-width: 0;
}
.hiddenDrop > :first-child { opacity: 0.4; }
.dropWhat { font-size: var(--w-fs-xs, 12px); }
.dropTags { font-size: var(--w-fs-xs, 11px); color: #e0b860; }
.dropWhy { font-size: var(--w-fs-xs, 11px); color: var(--w-text-dim); }
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
  grid-template-columns: repeat(7, minmax(0, 1fr));
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
