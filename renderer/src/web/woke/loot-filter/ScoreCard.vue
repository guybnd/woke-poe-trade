<template>
  <!-- Alt+F for an item Rare weights decide (Guy's R1, 2026-11-28, on the
       Alt+F card's M4 frame): the name and Go to rule; the rule path picks
       what a change covers (Rare gear: every rare; the base: every rare of
       it) with Show it; where it lands and its score; the ruler (drag the
       needle through the base ranks); what decides when it isn't the score;
       the ranks; every part of the score, each opening to all its options. -->
  <WPanel title="Filter rule for this item" size-key="score" width="29rem" max-height="85vh">
    <div v-if="view" :class="$style.body" :data-score-flask="flask ? '' : undefined" data-score-card>
      <div :class="$style.hd">
        <span :class="$style.nm" data-no-item-tip="the item the player is checking, named in its own price check">{{ facts.name }}
          <small>{{ metaText }}<template v-if="!view.id"> · <b data-score-base-rank>{{ view.rankLabel }}</b> base<WInfo :text="RANK_HELP" /><button v-if="wasLabel" type="button" :class="$style.link" :title="`Back to ${wasLabel}`" data-score-rank-reset @click="setRank(got!.row.was!)">↺</button></template></small>
        </span>
        <button type="button" :class="$style.go" data-score-go @click="tune"><span :class="$style.cap">G</span>Go to rule ›</button>
      </div>

      <div :class="$style.box" data-score-rule>
        <div :class="$style.crumb" role="group" aria-label="What your changes cover">
          <span class="w-dim">Rule:</span>
          <span :class="[$style.cr, $style.ro]" title="All loot: its steps and Strictness change on the Loot tab">Loot</span>
          <span class="w-faint">›</span>
          <button type="button" :class="[$style.cr, { [$style.on]: level === 'all' }]" :aria-pressed="level === 'all'" data-score-level="all" @click="level = 'all'">{{ flask ? 'Flasks' : 'Rare gear' }}</button>
          <template v-if="baseName">
            <span class="w-faint">›</span>
            <button type="button" :class="[$style.cr, { [$style.on]: level === 'base' }]" :aria-pressed="level === 'base'" data-score-level="base" data-no-item-tip="the base the player is checking, named in its own price check" @click="level = 'base'">{{ baseName }}</button>
          </template>
          <WInfo v-if="flask" :text="LEVEL_HELP_FLASK" /><WInfo v-else :text="LEVEL_HELP" />
        </div>
        <div v-if="level === 'base' && canMode" :class="$style.line">
          <span class="w-dim">Show it</span>
          <WSegmented :model-value="baseMode" :options="MODES" data-score-mode @update:model-value="setBaseMode" />
          <WInfo :text="MODE_HELP" />
        </div>
        <label v-if="level === 'all'" :class="$style.line">
          <span class="w-dim">{{ flask ? 'Flask line' : 'Line' }}</span>
          <input type="range" :min="LINE_MIN" :max="LINE_MAX" step="1" :value="Math.round(view.line)" :class="$style.range"
            :aria-label="flask ? 'Flask line, every flask' : 'Line, every rare'" data-score-line
            @input="dragLine = Number(($event.target as HTMLInputElement).value)" @change="commitLine(Number(($event.target as HTMLInputElement).value))">
          <b>{{ pointsText(view.line) }}</b>
          <WInfo :text="LINE_HELP" />
        </label>
      </div>

      <div :class="$style.status">
        <span :class="$style.lookWrap" tabindex="0" data-score-look>
          <LabelPreview :text="facts.baseType ?? facts.name" :actions="match.actions" :visibility="shownStep ? 'Show' : 'Hide'" :scale="1.05" />
          <span v-if="lookWhy.length" :class="$style.why" role="tooltip" data-score-look-why>
            <span v-for="l in lookWhy" :key="l.ch" :class="$style.whyRow">
              <i :class="[$style.sw, $style[`sw_${l.ch}`]]" :style="{ '--c': l.css }" aria-hidden="true" />
              <b>{{ l.name }}</b><span>{{ l.why }}</span>
            </span>
          </span>
        </span>
        <b :class="$style.verdict" :style="{ color: shownStep ? STEP_CSS[Math.max(1, shownStep)] : 'var(--w-down, #c46a5a)' }" data-score-answer>{{ shownStep ? `Shows · ${STEP_SHORT[shownStep]}` : 'Hidden' }}</b>
        <span class="grow" />
        <span :class="$style.score" data-score-pts><b>{{ pointsText(shownPts) }} pts</b> <small class="w-faint">score</small><WInfo v-if="view.id" :text="SCORE_ID_HELP" /><WInfo v-else :text="SCORE_HELP" /></span>
      </div>

      <ScoreRuler :pts="shownPts" :line="view.line" :loud="view.loud" :step="rawStep" :drag="canDrag" @drag="dragTo" @drop="dropAt" />

      <div v-if="decides" :class="$style.decides" data-score-decides><span :class="$style.tag">Decides</span><span>{{ decides }}</span></div>

      <div v-if="level === 'base' && !view.id" :class="$style.ranks" role="group" aria-label="Base rank">
        <button v-for="r in view.ranks" :key="r.key" type="button" :class="$style.lane" :aria-pressed="r.key === shownRank" :style="{ '--dot': STEP_CSS[r.step] }"
          :title="`${r.label}: lands ${STEP_SHORT[r.step]} (${pointsText(r.pts)})`" :data-score-rank="r.key" @click="setRank(r.key)">{{ r.label }}</button>
      </div>

      <div :class="$style.terms" data-no-item-tip="the parts of the item's score; the item itself is named in the card title">
        <div :class="$style.sh">Score<WInfo :text="PARTS_HELP" /></div>
        <template v-if="!view.id">
          <div :class="[$style.term, $style.opener]" data-score-rank-row data-score-open="rank" @click="toggle('rank')">
            <i class="fas fa-shield-alt" aria-hidden="true" />
            <span class="grow" :title="flask ? 'Flask rank, this base' : 'Base rank, this base'">{{ view.rankLabel }}<small> · {{ flask ? 'Flask rank' : 'Base rank' }}</small><i :class="['fas', open === 'rank' ? 'fa-caret-up' : 'fa-caret-down', $style.caret]" aria-hidden="true" /></span>
            <span :class="[$style.pts, $style[signOf(view.rankPts)]]">{{ pointsText(view.rankPts) }}</span>
          </div>
          <ScoreSection v-if="open === 'rank'" :rows="sectionRows('rank')" :step-to="stepTo" :edit="level === 'all' && !flask" :pick="level === 'base'" @bump="bump" @pick="k => setRank(k as RankKey)" />
        </template>
        <div v-else-if="!view.rows.length" class="w-faint text-xs" data-score-no-mods>No mod names in the copied item: copy it with Ctrl+Alt+C.</div>
        <template v-for="(t, ti) in view.rows" :key="`${t.key}-${ti}`">
          <div :class="[$style.term, { [$style.off]: !t.counts, [$style.opener]: t.tunable }]" :data-score-term="t.key" :data-score-open="t.tunable ? t.key : undefined" @click="t.tunable && toggle(t.key)">
            <i :class="t.icon" aria-hidden="true" />
            <span class="grow" :title="t.title">{{ t.label }}<small v-if="t.group"> · {{ t.group }}</small><small v-if="t.hint" :class="$style.hint"> {{ t.hint }}</small><i v-if="t.tunable" :class="['fas', open === t.key ? 'fa-caret-up' : 'fa-caret-down', $style.caret]" aria-hidden="true" /></span>
            <span :class="[$style.pts, $style[signOf(t.pts)]]">{{ pointsText(t.pts) }}</span>
          </div>
          <ScoreSection v-if="open === t.key" :rows="sectionRows(t.key)" :step-to="stepTo" :edit="level === 'all'" @bump="bump" />
        </template>
        <div :class="$style.total"><span class="grow">Total</span><b>{{ pointsText(view.pts) }}</b></div>
        <div v-if="last" :class="$style.chg" data-score-changed>
          {{ last.label }}, for every rare with it.
          <button type="button" :class="$style.link" @click="undo">Undo</button>
        </div>
      </div>
    </div>
    <div v-else class="w-faint text-sm">Rare weights don't decide this item.</div>

    <template #footer>
      <div class="flex items-center gap-2 w-full">
        <span class="text-xs grow" :class="store.error.value ? '' : 'w-dim'" :style="store.error.value ? 'color: var(--w-down)' : ''">
          {{ store.error.value ?? (store.dirty.value ? 'Unsaved changes' : (store.pendingReload.value ? 'Saved, not in the game until you reload' : (store.lastSaved.value ? 'Saved' : ''))) }}
        </span>
        <WButton size="sm" variant="primary" :disabled="store.saving.value" data-score-save @click="store.save({ reloadNow: true })">{{ config.reloadViaChat ? 'Save + reload' : 'Save' }}</WButton>
      </div>
    </template>
  </WPanel>
</template>

<script setup lang="ts">
// Alt+F for an item Rare weights decide: its score, part by part, where it
// lands against the line, and what to change to move it.
import { computed, onMounted, ref, watch } from 'vue'
import { WButton, WInfo, WPanel, WSegmented } from '../ui'
import LabelPreview from './LabelPreview.vue'
import ScoreRuler from './ScoreRuler.vue'
import ScoreSection from './ScoreSection.vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import type { ItemFacts } from './item-facts'
import type { MatchResult } from './match'
import { MULT_STEPS, NEED_MAX, NEED_MIN, RANK_KEYS, WEIGHT_GROUPS, WEIGHT_LABEL, WEIGHT_TYPE, countedTerms, GEAR_CLASSES, lookKeyOf, LOOK_LABEL, MARK_ROWS, ID_ROWS, ORDERED_ROWS, stepFor, stepOf, termsOf, weightOf } from './weights'
import type { LookChannel, Step, WeightKey } from './weights'
import { fromPoints, points, pointsText } from './weight-samples'
import { setWeightRank, weightRow } from './weight-rank'
import { affixTable, itemMods, loadAffixTable } from './id-mods'
import { driverSeed } from '../price-insight/seed'
import { FLASK_ILVL, FLASK_QUALITY, FLASK_RANKS, flaskLoud, flaskRank, flaskWeight } from './flask-weights'
import type { BaseMode, RankKey } from './weight-settings'
import { MODE_WORDS } from './section-modes'
import { STEP_CSS, STEP_SHORT } from './score-steps'
import { readStyle } from './edits'
import { cssColour } from './label-style'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  facts: ItemFacts
  match: MatchResult
}>()
const emit = defineEmits<{
  (e: 'open-editor', at?: { type: string, tier: string }): void
}>()

const w = computed(() => props.config.presets.weights)
const got = computed(() => weightRow(props.store, props.config, props.facts))
// A utility flask the Equipment tab's Flasks scores: rank × quality × item level.
const FLASK_LABEL: Partial<Record<RankKey, string>> = { r1: 'Top', r2: 'Good', r3: 'Low', rj: "Don't care" }
const flaskBase = computed(() => !got.value && props.match.final?.block.tier?.startsWith('flask') ? props.facts.baseType ?? props.facts.name : null)
const flask = computed(() => flaskBase.value != null)

// The line while its slider is dragged (points); it applies on release.
const dragLine = ref<number | null>(null)
const LINE_MIN = Math.round(points(NEED_MIN))
const LINE_MAX = Math.round(points(NEED_MAX))
function commitLine (p: number) {
  dragLine.value = null
  const v = Math.min(NEED_MAX, Math.max(NEED_MIN, fromPoints(p)))
  if (flask.value) w.value.flaskLine = v
  else w.value.need = v
}

const GROUP_OF = Object.fromEntries(WEIGHT_GROUPS.flatMap(g => g.rows.map(r => [r.key, g]))) as Record<WeightKey, typeof WEIGHT_GROUPS[number]>
const RANK_SET = new Set<string>(RANK_KEYS)

interface Row { key: WeightKey | string, icon: string, label: string, group: string, pts: number, counts: boolean, tunable: boolean, title: string, hint?: string }
interface View { id?: boolean, pts: number, line: number, loud: number[], step: number, rank: RankKey, rankLabel: string, rankPts: number, ranks: Array<{ key: RankKey, label: string, pts: number, step: number }>, rows: Row[] }

// Identified gear (Guy's pick A, 2026-11-28): its mods' points, not its base.
const idItem = computed(() => {
  const f = props.facts
  if (!w.value.on || !f.identified || (f.itemLevel ?? 0) < 68 || !f.itemClass || !GEAR_CLASSES.includes(f.itemClass)) return null
  if (f.rarity === 'Rare') return got.value ? null : 'Rare' as const
  // Magic decided by its mods (it may go on to its base's rule instead).
  return f.rarity === 'Magic' && /: identified magic/.test(props.match.final?.block.comment ?? '') ? 'Magic' as const : null
})
onMounted(() => { loadAffixTable() })
const ID_ICON = WEIGHT_GROUPS.find(g => g.key === 'idmods')?.icon ?? ''

const view = computed<View | null>(() => {
  const idr = idItem.value
  if (idr && affixTable.value) {
    const need = dragLine.value != null ? fromPoints(dragLine.value) : w.value.need
    const m = w.value.mult
    const bonus: WeightKey = idr === 'Rare' ? 'idr' : 'idm'
    const mods = itemMods(affixTable.value, props.facts.itemClass!, props.facts.explicitModNames, driverSeed.value, m)
    const weight = mods.reduce((x, d) => x * (d.key ? m[d.key] : 1), m[bonus])
    const rows: Row[] = [
      { key: bonus, icon: ID_ICON, label: WEIGHT_LABEL[bonus], group: 'Rarity', pts: points(m[bonus]), counts: true, tunable: true, title: `Shared by every ${WEIGHT_LABEL[bonus].toLowerCase()}` },
      ...mods.map(d => {
        const line = d.text.split('\n')[0]
        const what = d.tier ? `T${d.tier} ${line}` : 'not in the mod data'
        return d.key
          ? { key: d.key, icon: ID_ICON, label: d.name, group: what, pts: points(m[d.key]), counts: true, tunable: true, title: `${WEIGHT_LABEL[d.key]}: shared by every item with one` }
          : { key: `mod:${d.name}`, icon: ID_ICON, label: d.name, group: what, pts: 0, counts: false, tunable: false, title: d.tier > 3 ? 'Tier 4 and lower add nothing' : 'Not on the price check\'s list of valuable mods' }
      })
    ]
    return { id: true, pts: points(weight), line: points(need), loud: w.value.loud.map(points), step: stepOf(weight, need, w.value.loud), rank: 'r0', rankLabel: '', rankPts: 0, ranks: [], rows }
  }
  if (got.value) {
    const { it } = got.value
    const need = dragLine.value != null ? fromPoints(dragLine.value) : w.value.need
    const ws = { mult: w.value.mult, need, always: w.value.always, loud: w.value.loud }
    const counted = new Set(countedTerms(it, ws.mult))
    const rows: Row[] = termsOf(it).filter(k => !RANK_SET.has(k)).map(key => {
      const counts = counted.has(key)
      const g = GROUP_OF[key]
      const title = counts ? `${WEIGHT_LABEL[key]}: shared by every rare with it` : `${WEIGHT_LABEL[key]}: doesn't count here (only the biggest mark counts, and none on a corrupted or mirrored item)`
      return { key, counts, icon: g?.icon ?? '', label: WEIGHT_LABEL[key], group: g?.label ?? '', pts: points(ws.mult[key]), tunable: counts, title }
    })
    return {
      pts: points(weightOf(it, ws.mult)),
      line: points(need),
      loud: ws.loud.map(points),
      step: stepFor(it, ws),
      rank: it.rank,
      rankLabel: WEIGHT_LABEL[it.rank],
      rankPts: points(ws.mult[it.rank]),
      ranks: RANK_KEYS.map(key => { const o = { ...it, rank: key }; return { key, label: WEIGHT_LABEL[key], pts: points(weightOf(o, ws.mult)), step: stepFor(o, ws) } }),
      rows
    }
  }
  const base = flaskBase.value
  if (base == null) return null
  const quality = props.facts.quality ?? 0
  const ilvl = props.facts.itemLevel ?? 0
  const line = dragLine.value != null ? fromPoints(dragLine.value) : w.value.flaskLine
  const loud = flaskLoud(line)
  const rank = flaskRank(w.value, base)
  const q = FLASK_QUALITY.find(b => quality >= b.at)!
  const qNext = [...FLASK_QUALITY].reverse().find(b => b.at > quality)
  const i = FLASK_ILVL.find(b => ilvl >= b.at)!
  const iNext = [...FLASK_ILVL].reverse().find(b => b.at > ilvl)
  const at = (r: RankKey) => flaskWeight({ mult: w.value.mult, ranks: { ...w.value.ranks, [base]: r } }, base, quality, ilvl)
  const weight = flaskWeight(w.value, base, quality, ilvl)
  return {
    pts: points(weight),
    line: points(line),
    loud: loud.map(points),
    step: stepOf(weight, line, loud),
    rank,
    rankLabel: FLASK_LABEL[rank] ?? WEIGHT_LABEL[rank],
    rankPts: points(w.value.mult[rank]),
    ranks: FLASK_RANKS.map(key => ({ key, label: FLASK_LABEL[key] ?? key, pts: points(at(key)), step: stepOf(at(key), line, loud) })),
    rows: [
      { key: 'quality', icon: 'fas fa-star', label: `${quality}%`, group: 'Quality', pts: points(q.x), counts: true, tunable: false, title: 'Quality: 20% and 26% add to the score', hint: qNext ? `${qNext.at}% adds ${pointsText(points(qNext.x) - points(q.x))}` : undefined },
      { key: 'ilvl', icon: 'fas fa-signal', label: props.facts.itemLevel == null ? 'Unknown' : `${ilvl}`, group: 'Item level', pts: points(i.x), counts: true, tunable: false, title: 'Item level 85+ rolls the top mods', hint: iNext ? `${iNext.at}+ adds ${pointsText(points(iNext.x) - points(i.x))}` : undefined }
    ]
  }
})

// What each part of the label means (Guy, 2026-11-28): the look row that
// paints its border, background and text, and the step behind its size.
const CH_NAME: Record<LookChannel, string> = { border: 'Border', bg: 'Background', text: 'Text' }
const lookWhy = computed(() => {
  const v = view.value
  if (!got.value || !v || v.step === 0) return []
  const { it } = got.value
  const st = readStyle(props.match.actions)
  const colour = { border: st.border, bg: st.background, text: st.text }
  const out = (['border', 'bg', 'text'] as LookChannel[]).map(ch => {
    const k = lookKeyOf(it, w.value.look, ch, v.step as Step)
    const why = !k ? 'game default' : k === 'score' ? `${STEP_SHORT[v.step]} step (its score)` : k === 'rarity' ? `${it.rarity ?? 'Rare'} item` : LOOK_LABEL[k]
    return { ch, name: CH_NAME[ch], why, css: colour[ch] ? cssColour(colour[ch]!) : 'transparent' }
  })
  return [...out, { ch: 'size', name: 'Size, sound', why: `${STEP_SHORT[v.step]} step`, css: 'transparent' }]
})
const wasLabel = computed(() => got.value?.row.was ? WEIGHT_LABEL[got.value.row.was] : null)
const pinnedBy = computed(() => {
  const v = view.value
  if (!got.value || !v || v.step !== 1 || v.pts >= v.line) return null
  const has = new Set(termsOf(got.value.it))
  return w.value.always.find(k => has.has(k)) ?? null
})
// What a change covers (Guy's R1 on the M4 rule path): Rare gear (every
// rare: the line and every weight) or the base (every rare of it: its rank
// and Show it). Opens on the base.
const baseName = computed(() => flaskBase.value ?? got.value?.row.name ?? (idItem.value === 'Rare' ? props.facts.baseType ?? null : null))
const level = ref<'all' | 'base'>(baseName.value ? 'base' : 'all')
// Show it is for a rare's base (flasks keep their rank only).
const canMode = computed(() => !flask.value && props.facts.rarity === 'Rare' && !!baseName.value)
const MODES = (['auto', 'always', 'off'] as const).map(v => ({ value: v, label: v === 'auto' ? 'By score' : MODE_WORDS[v], attrs: { [`data-score-mode-${v}`]: '' } }))
const baseMode = computed<'auto' | BaseMode>(() => (canMode.value && w.value.bases[baseName.value!]) || 'auto')
function setBaseMode (v: string) {
  const name = baseName.value
  if (!name) return
  const rest = Object.fromEntries(Object.entries(w.value.bases).filter(([n]) => n !== name))
  w.value.bases = v === 'always' || v === 'off' ? { ...rest, [name]: v } : rest
}
const metaText = computed(() => {
  const f = props.facts
  if (flask.value) return `flask · quality ${f.quality ?? 0}% · ilvl ${f.itemLevel ?? '?'}`
  if (view.value?.id) return `${f.baseType ?? ''} · identified · ilvl ${f.itemLevel ?? '?'}`
  return [(f.rarity ?? 'Rare').toLowerCase(), `ilvl ${f.itemLevel ?? '?'}`, f.unidentifiedItemTier ? `drop tier ${f.unidentifiedItemTier}` : ''].filter(Boolean).join(' · ')
})
// The rank the needle is dragged over (it applies on release).
const dragRank = ref<RankKey | null>(null)
const shownRank = computed(() => dragRank.value ?? view.value?.rank ?? null)
const dragged = computed(() => dragRank.value ? view.value?.ranks.find(r => r.key === dragRank.value) ?? null : null)
const shownPts = computed(() => dragged.value?.pts ?? view.value?.pts ?? 0)
// Where its score lands, and where it lands once Show it has its say.
const rawStep = computed(() => dragged.value?.step ?? view.value?.step ?? 0)
const shownStep = computed(() => baseMode.value === 'off' ? 0 : baseMode.value === 'always' ? Math.max(1, rawStep.value) : rawStep.value)
const canDrag = computed(() => level.value === 'base' && !!view.value && !view.value.id && view.value.ranks.length > 1 && baseMode.value === 'auto')
function dragTo (p: number) {
  const rs = view.value?.ranks ?? []
  let best: RankKey | null = null
  let d = Infinity
  for (const r of rs) {
    const e = Math.abs((Number.isFinite(r.pts) ? r.pts : -999) - p)
    if (e < d) { d = e; best = r.key }
  }
  dragRank.value = best
}
function dropAt (p: number | null) {
  if (p != null) dragTo(p)
  const r = dragRank.value
  dragRank.value = null
  if (r && r !== view.value?.rank) setRank(r)
}
// What decides it, when it isn't the score against the line.
const decides = computed(() => {
  const v = view.value
  const base = baseName.value
  if (!v) return ''
  if (baseMode.value === 'off') return `${base}: Always hide`
  if (baseMode.value === 'always' && rawStep.value === 0) return `${base}: Always show`
  if (pinnedBy.value) return `${flask.value ? 'Flasks' : 'Rare gear'}: always shows ${WEIGHT_LABEL[pinnedBy.value].toLowerCase()}`
  if (shownRank.value === 'rj' && rawStep.value === 0) return `${base}: Don't care`
  return ''
})
const LEVEL_HELP = `The highlighted step is what your changes cover.
- **Rare gear**: every rare: the line and every weight (‹ › on an open score row).
- **The base**: every rare of it: its rank and Show it.
- Loot (All loot) changes only on the Loot tab.`
const LEVEL_HELP_FLASK = `The highlighted step is what your changes cover.
- **Flasks**: every flask: the line.
- **The base**: every flask of it: its rank.
- Loot (All loot) changes only on the Loot tab.`
const RANK_HELP = `This base's rank: it adds or takes points for every one of it.
- Drag the needle on the ruler, or pick a rank on the card.
- It's the same rank as on Base ranks.`
const MODE_HELP = `What every rare of this base does:
- **By score**: its score picks the step on the ruler.
- **Always show**: at least Small, whatever the score.
- **Always hide**: never shows in maps.`
const LINE_HELP = 'Where showing starts, for every one. Under it, it hides.'
const SCORE_HELP = `Rares have no market price, so the filter scores them: each part adds or takes points.
- +10 is twice as good, -10 half.
- It shows from the line up; the louder steps start further right.`
const SCORE_ID_HELP = "An identified item scores by its mods: each mod on the price check's list of valuable mods adds by its tier. Its base rank doesn't count."
const PARTS_HELP = `Every part of the score. Click one to see all its options.
- On the top level of the rule path, ‹ › changes an option for every one with it.
- The base rank's options pick this base's rank.`
const signOf = (p: number) => p > 0.5 ? 'plus' : p < -0.5 ? 'minus' : 'zero'

function setRank (r: RankKey) {
  if (got.value) setWeightRank(props.config, got.value.row, r)
  else if (flaskBase.value) w.value.ranks = { ...w.value.ranks, [flaskBase.value]: r }
}
// A row's multiplier, one step of the editor's up or down. It changes every
// rare with that mark, so the card says so and offers an undo. Rows kept in
// order (drop tiers, item levels) push their neighbours along (Guy,
// 2026-11-28): raise Tier 3 past Tier 4 and Tier 4 rises with it.
const last = ref<{ label: string, before: Record<WeightKey, number> } | null>(null)
// The section whose rows are open for editing (a row's key, or 'rank').
const open = ref<string | null>(null)
watch(() => props.facts, () => { last.value = null; dragLine.value = null; open.value = null; level.value = baseName.value ? 'base' : 'all'; dragRank.value = null })
const MARK_SET = new Set<string>([...MARK_ROWS, ...ID_ROWS])
function stepTo (key: WeightKey | string, dir: 1 | -1): number | null {
  if (!(key in w.value.mult)) return null
  const k = key as WeightKey
  const lo = MARK_SET.has(k) ? 1 : 0
  const cur = w.value.mult[k]
  const ok = MULT_STEPS.filter(s => s >= lo && (dir > 0 ? s > cur + 1e-9 : s < cur - 1e-9))
  return ok.length ? (dir > 0 ? ok[0] : ok[ok.length - 1]) : null
}
function bump (key: WeightKey | string, dir: 1 | -1) {
  const to = stepTo(key, dir)
  if (to == null) return
  const k = key as WeightKey
  const before = last.value?.before ?? { ...w.value.mult }
  const m = { ...w.value.mult, [k]: to }
  for (const row of ORDERED_ROWS) {
    const i = row.indexOf(k)
    if (i < 0) continue
    for (let j = i + 1; j < row.length; j++) m[row[j]] = Math.max(m[row[j]], to)
    for (let j = 0; j < i; j++) m[row[j]] = Math.min(m[row[j]], to)
  }
  w.value.mult = m
  const moved = (Object.keys(m) as WeightKey[]).filter(x => m[x] !== before[x])
  last.value = moved.length ? { label: moved.map(x => `${WEIGHT_LABEL[x]} ${pointsText(points(before[x]))} → ${pointsText(points(m[x]))}`).join(', '), before } : null
}
function undo () {
  if (!last.value) return
  w.value.mult = { ...w.value.mult, ...last.value.before }
  last.value = null
}
// Every row of a section, for the open dropdown.
function sectionRows (key: string) {
  const g = key === 'rank' ? WEIGHT_GROUPS.find(x => x.rows.some(r => r.key === 'r1')) : GROUP_OF[key as WeightKey]
  const rows = (g?.rows ?? []).filter(r => key !== 'rank' || !flask.value || (FLASK_RANKS as readonly string[]).includes(r.key))
  return rows.map(r => ({ key: r.key, label: key === 'rank' && flask.value ? FLASK_LABEL[r.key as RankKey] ?? r.label : r.label, pts: points(w.value.mult[r.key]), dflt: points(r.dflt), mine: key === 'rank' ? r.key === shownRank.value : r.key === key }))
}
function toggle (key: string) { open.value = open.value === key ? null : key }
function tune () {
  emit('open-editor', { type: WEIGHT_TYPE, tier: flask.value ? 'flask' : 'weights' })
}

</script>

<style module>
.body { display: flex; flex-direction: column; gap: 7px; padding: 10px 12px; }
.lookWrap { position: relative; display: inline-flex; outline: none; }
.why { display: none; position: absolute; left: 0; top: calc(100% + 4px); z-index: 5; flex-direction: column; gap: 2px; padding: 6px 8px; min-width: 15rem; background: #15120e; border: 1px solid var(--w-border); border-radius: var(--w-r-sm); box-shadow: 0 4px 12px rgb(0 0 0 / 60%); font-size: var(--w-fs-xs); color: var(--w-dim); white-space: nowrap; }
.lookWrap:hover .why, .lookWrap:focus .why { display: flex; }
.whyRow { display: flex; align-items: center; gap: 6px; }
.whyRow b { color: var(--w-fg); font-weight: 400; min-width: 5.5em; }
.sw { width: 14px; height: 10px; flex: none; border-radius: 2px; }
.sw_border { border: 2px solid var(--c); }
.sw_bg { background: var(--c); outline: 1px solid var(--w-border); }
.sw_text { background: var(--c); height: 3px; }
.sw_size { visibility: hidden; }
.lineRow b { color: var(--w-fg); font-weight: 400; min-width: 2.4em; text-align: right; font-variant-numeric: tabular-nums; }
.range { flex: 1; min-width: 6rem; accent-color: var(--w-accent); }
.terms { display: flex; flex-direction: column; gap: 1px; background: var(--w-panel-2); border-radius: var(--w-r-sm); padding: 4px 6px; }
.term { position: relative; display: flex; align-items: center; gap: 6px; font-size: var(--w-fs-sm, 13px); line-height: 1.6; padding: 0 2px; border-radius: 3px; }
.term > i { width: 14px; text-align: center; color: var(--w-faint); font-size: var(--w-fs-xs); }
.term small { color: var(--w-faint); font-size: var(--w-fs-xs); }
.term .hint { color: var(--w-dim); margin-left: 6px; }
.term.off { opacity: 0.5; }
.term.off .pts { text-decoration: line-through; }
.opener > .grow { cursor: pointer; }
.caret { margin-left: 5px; color: var(--w-faint); font-size: var(--w-fs-xs); }
.tunable:hover, .tunable:focus-within { background: rgb(255 255 255 / 4%); }
.stp { position: absolute; right: 0; top: 50%; transform: translateY(-50%); display: none; align-items: center; gap: 2px; background: var(--w-panel); border: 1px solid var(--w-border); border-radius: 10px; padding: 0 2px; }
.tunable:hover .stp, .tunable:focus-within .stp { display: flex; }
.stp button { border: 0; background: none; color: #f3d48a; width: 18px; cursor: pointer; padding: 0; font-size: var(--w-fs-sm); }
.stp button:hover { color: var(--w-fg); }
.stp button:disabled { opacity: .3; cursor: default; }
.stp span { font-size: var(--w-fs-xs); min-width: 2.2rem; text-align: center; font-variant-numeric: tabular-nums; }
.total { display: flex; align-items: center; gap: 6px; border-top: 1px solid var(--w-line); margin-top: 3px; padding: 3px 2px 0; font-size: var(--w-fs-sm, 13px); }
.chg { font-size: var(--w-fs-xs); color: var(--w-dim); padding: 2px; }
.pts { font-variant-numeric: tabular-nums; min-width: 2.6rem; text-align: right; padding: 0 6px; border-radius: 9px; font-size: var(--w-fs-xs); }
.pts.plus { color: #8fd18a; background: rgba(143, 209, 138, 0.12); }
.pts.minus { color: #e08a8a; background: rgba(224, 138, 138, 0.12); }
.pts.zero { color: var(--w-faint); }
.ranks { display: flex; flex-wrap: wrap; gap: 3px; padding: 2px 0 5px 22px; }
.lane { position: relative; height: 1.5rem; padding: 0 7px 0 16px; font-size: var(--w-fs-xs, 12px); border-radius: var(--w-r-sm); border: 1px solid var(--w-border); background: rgb(0 0 0 / 20%); color: var(--w-text-dim); cursor: pointer; }
.lane::before { content: ''; position: absolute; left: 5px; top: 50%; width: 6px; height: 6px; margin-top: -3px; border-radius: 50%; background: var(--dot); }
.lane:hover { color: var(--w-text); }
.lane[aria-pressed='true'] { border-color: #e0b860; background: rgb(224 184 96 / 16%); color: #f3d48a; }
.link { border: 0; background: none; padding: 0; font: inherit; color: #f3d48a; cursor: pointer; border-bottom: 1px dotted #e0b860; }
.link:hover { color: var(--w-fg); }

.hd { display: flex; align-items: flex-start; gap: 8px; }
.nm { flex: 1; font-family: var(--w-head); color: #ff7; font-size: var(--w-fs-md, 14px); line-height: 1.3; }
.nm small { display: block; font-family: var(--w-body, inherit); color: var(--w-dim); font-size: var(--w-fs-xs); }
.nm small b { color: #f3d48a; font-weight: 600; }
.go { flex: none; border: 1px solid #e0b860; background: none; color: #f3d48a; padding: 1px 8px; border-radius: var(--w-r-sm); font-size: var(--w-fs-xs); cursor: pointer; white-space: nowrap; }
.go:hover { background: rgb(224 184 96 / 12%); }
.box { display: flex; flex-direction: column; gap: 6px; padding: 6px 8px; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); background: rgb(0 0 0 / 18%); }
.crumb { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; font-size: var(--w-fs-sm, 13px); }
.cr { padding: 1px 7px; border: 1px solid transparent; border-radius: var(--w-r-sm); background: none; color: #e0b860; font: inherit; cursor: pointer; }
.cr:hover { border-color: #e0b860; }
.cr.on { background: rgb(224 184 96 / 16%); border-color: #f3d48a; color: #f3d48a; font-weight: 600; cursor: default; }
.cr.ro { color: var(--w-dim); cursor: help; border-style: dashed; border-color: var(--w-line); }
.line { display: flex; align-items: center; gap: 8px; font-size: var(--w-fs-xs); white-space: nowrap; }
.line b { color: var(--w-fg); font-weight: 400; min-width: 2.4em; text-align: right; font-variant-numeric: tabular-nums; }
.status { display: flex; align-items: center; gap: 8px; }
.verdict { font-family: var(--w-head); font-size: var(--w-fs-lg); font-weight: 400; white-space: nowrap; }
.score { font-size: var(--w-fs-sm, 13px); white-space: nowrap; }
.decides { display: flex; align-items: center; gap: 6px; font-size: var(--w-fs-xs); padding: 3px 6px; border-left: 3px solid #e0b860; background: rgb(224 184 96 / 8%); }
.tag { font-size: var(--w-fs-xs); text-transform: uppercase; letter-spacing: .06em; color: #000; background: #e0b860; padding: 0 4px; border-radius: 2px; }
.sh { font-size: var(--w-fs-xs); letter-spacing: .08em; text-transform: uppercase; color: var(--w-faint); padding: 0 2px 2px; }
.cap { display: inline-grid; place-items: center; min-width: 1rem; height: 1rem; border: 1px solid #e0b860; border-radius: 3px; font-size: var(--w-fs-xs); margin-right: 4px; }
</style>
