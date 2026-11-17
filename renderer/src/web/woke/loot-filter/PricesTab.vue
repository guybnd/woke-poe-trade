<template>
  <div :class="$style.wrap" class="w-scroll">
    <div :class="$style.head">
      <WToggle v-model="config.priceTiers.on">Re-tier from poe.ninja prices</WToggle>
      <span class="w-dim text-xs w-num" :title="league ? `League: ${league}` : ''">
        <template v-if="updatedAt">{{ league }} · prices from {{ agoPhrase(updatedAt) }}</template>
        <template v-else>waiting for prices</template>
      </span>
      <span class="grow" />
      <WSegmented :model-value="config.priceTiers.uniqueRule" :options="uniqueOptions" title="A base type can hold several uniques: price it by its best one (never hides a valuable unique) or its cheapest"
        @update:model-value="v => config.priceTiers.uniqueRule = v === 'min' ? 'min' : 'max'" />
    </div>

    <WEmpty v-if="!store.prices.lookup.value" :art="{ item: 'Chaos Orb' }">
      No poe.ninja prices for this league yet. They download in the background the first time something needs them; price check any item to fetch them now.
    </WEmpty>

    <template v-else-if="config.priceTiers.on">
      <!-- Stays in view however long the lists get. -->
      <div :class="$style.applyBar">
        <span v-if="store.pricesTooOld.value"><b>Prices are too old</b> to move anything until they update</span>
        <span v-else><b>{{ moves.length ? `${moves.length} item${moves.length > 1 ? 's' : ''}` : 'Nothing' }}</b> {{ moves.length ? 'would move' : 'to move' }}</span>
        <button v-if="allSkipped.length" type="button" :class="$style.link" class="w-focusable text-xs" title="Prices say these belong in another tier, but they stay put" @click="toSkipped">{{ allSkipped.length }} held back</button>
        <button v-if="movedList.length" type="button" :class="$style.link" class="w-focusable text-xs" :aria-expanded="showMoved" @click="showMoved = !showMoved">{{ movedList.length }} moved so far <i :class="showMoved ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" /></button>
        <span class="grow" />
        <WButton v-if="store.timeline.value.at > 0" size="sm" variant="ghost" icon="fas fa-undo" :title="`Undo: ${lastStep}`" @click="store.undoStep()">Undo <WKbd keys="Ctrl + Z" /></WButton>
        <WButton v-if="moves.length" size="sm" variant="ghost" @click="keepAll">Keep all where they are</WButton>
        <WButton v-if="movedList.length" size="sm" variant="ghost" icon="fas fa-undo" title="Put every price group back on NeverSink's own tiers" @click="reset">Back to NeverSink's tiers</WButton>
        <WButton v-if="moves.length" size="sm" variant="primary" :disabled="!pickedMoves.length" title="Adds these moves to your unsaved changes. Save + reload (Ctrl + S) when you're done." @click="apply">Apply {{ pickedMoves.length }}</WButton>
      </div>
      <template v-if="showMoved">
        <div class="w-group-label" :class="$style.label">Moved by prices</div>
        <div v-for="m in movedList" :key="'d' + m.type + m.base" :class="$style.row">
          <LabelPreview :text="m.base" :actions="lookOf(m.type, m.to)" :extras="false" />
          <button type="button" :class="$style.link" class="w-focusable text-xs w-trunc" :title="`Open ${groupLabel(m.type)} ${m.to} in Rules`" @click="emit('open-rule', { type: m.type, tier: m.to, base: m.base })">{{ groupLabel(m.type) }} <i class="fas fa-external-link-alt" /></button>
          <span class="w-num text-xs w-dim">{{ tierLabel(m.from) }} → {{ tierLabel(m.to) }}</span>
          <span class="grow" />
          <WButton size="sm" variant="ghost" title="Back to NeverSink's tier, and prices leave it there" @click="putBack(m)">Put back</WButton>
        </div>
      </template>
      <div v-if="moves.length" :class="$style.pickBar">
        <input type="checkbox" :class="$style.check" :checked="allPicked" :indeterminate="somePicked" aria-label="Pick every item that would move" title="Pick all or none" @change="pickAllOrNone">
        <span class="w-group-label">Would move · {{ pickedMoves.length }} of {{ moves.length }} picked</span>
        <span class="grow" />
        <span class="text-xs w-dim" :class="$style.quick">
          Pick
          <button type="button" :class="$style.link" class="w-focusable" @click="pickWhere(() => true)">all</button>
          <button type="button" :class="$style.link" class="w-focusable" @click="pickWhere(() => false)">none</button>
          <button v-if="upCount" type="button" :class="$style.link" class="w-focusable" title="Only items moving to a better tier" @click="pickWhere(isUp)">up only · {{ upCount }}</button>
          <button v-if="upCount < moves.length" type="button" :class="$style.link" class="w-focusable" title="Only items moving to a lower tier" @click="pickWhere(m => !isUp(m))">down only · {{ moves.length - upCount }}</button>
          <WInfo text="Shift + click a box to tick or untick every row between it and the last one you clicked." />
        </span>
      </div>
      <div v-for="(m, n) in moves" :key="m.type + m.base" v-item-tip="baseTip(m.type, m.base)" :class="$style.row" @contextmenu="moveMenu($event, m)">
        <input :id="`pm-${m.type}-${m.base}`" :checked="movePicks.isPicked(m)" type="checkbox" :class="$style.check" :aria-label="`Move ${m.base}`" @click="clickPick($event, n)">
        <img v-if="icon(m)" :src="icon(m)!" :class="$style.art" alt="">
        <LabelPreview :text="m.base" :actions="lookOf(m.type, m.to)" :extras="false" />
        <button type="button" :class="$style.link" class="w-focusable text-xs w-trunc" :title="`Open ${groupLabel(m.type)} ${m.from} in Rules`" @click="emit('open-rule', { type: m.type, tier: m.from, base: m.base })">{{ groupLabel(m.type) }} <i class="fas fa-external-link-alt" /></button>
        <span class="w-num text-xs"><span :class="rank(m.to) < rank(m.from) ? $style.up : $style.down">{{ tierLabel(m.from) }} → {{ tierLabel(m.to) }}</span></span>
        <WChip v-if="m.hides" :class="$style.bad" title="This tier is hidden at your strictness. Left unticked so a price alone doesn't hide it.">would hide it</WChip>
        <span class="grow" />
        <span class="w-num text-xs w-dim w-trunc" :title="m.note">{{ m.note ? `${m.note} · ` : '' }}</span>
        <WPrice bulk :chaos="m.chaos" :divine="divine" />
        <WButton size="sm" variant="ghost" icon="fas fa-times" :title="`Keep ${m.base} in ${tierLabel(m.from)}. It stops being suggested, and you can unlock it under Not moved.`" :aria-label="`Keep ${m.base} where it is`" @click="keepOne(m)">Keep</WButton>
      </div>
      <template v-if="allSkipped.length">
        <div ref="skippedEl" class="w-group-label" :class="$style.label">Not moved · {{ allSkipped.length }}</div>
        <div class="text-xs w-dim" :class="$style.why">
          Prices say these belong in another tier, but they stay put.
          <span v-for="r in reasonCounts" :key="r.reason"><b>{{ SKIP_WHY[r.reason].label }}</b>: {{ SKIP_WHY[r.reason].short }}. </span>
          {{ nextStep }}
        </div>
        <div :class="$style.filters">
          <WChip v-for="r in reasonCounts" :key="r.reason" clickable :active="skipReason === r.reason" :title="SKIP_WHY[r.reason].title" @click="skipReason = skipReason === r.reason ? null : r.reason">{{ SKIP_WHY[r.reason].label }} · {{ r.count }}</WChip>
          <span v-if="groupCounts.length > 1" :class="$style.sep" />
          <template v-if="groupCounts.length > 1">
            <WChip v-for="g in groupCounts" :key="g.type" clickable :active="skipGroup === g.type" @click="skipGroup = skipGroup === g.type ? null : g.type">{{ groupLabel(g.type) }} · {{ g.count }}</WChip>
          </template>
        </div>
        <div :class="$style.pickBar">
          <input type="checkbox" :class="$style.check" :checked="skipPicks.all.value" :indeterminate="skipPicks.some.value" aria-label="Pick every item under Not moved" :title="`Pick all ${skipList.length} (with the filters above), or none`" @change="skipPicks.allOrNone">
          <span class="w-group-label">{{ skipPicks.picked.value.length }} of {{ skipList.length }} picked</span>
          <span class="grow" />
          <WButton v-if="pickedLocked.length" size="sm" variant="ghost" icon="fas fa-unlock" title="Prices may move them again. Any move you made by hand goes too." @click="unlockMany(pickedLocked)">Unlock {{ pickedLocked.length }}</WButton>
          <WButton v-if="pickedUnsure.length" size="sm" variant="ghost" title="Move them to the tier their price says, though the price may not be real" @click="moveAnywayMany(pickedUnsure)">Move {{ pickedUnsure.length }} anyway<template v-if="pickedHides"> · {{ pickedHides }} would hide</template></WButton>
        </div>
        <div v-for="(s, n) in skipShown" :key="'s' + s.type + s.base" :class="$style.row">
          <input :checked="skipPicks.isPicked(s)" type="checkbox" :class="$style.check" :aria-label="`Pick ${s.base}`" @click="skipPicks.click($event, n)">
          <LabelPreview :text="s.base" :actions="lookOf(s.type, s.tier)" :extras="false" />
          <button type="button" :class="$style.link" class="w-focusable text-xs" :title="`Open ${groupLabel(s.type)} ${s.tier} in Rules`" @click="emit('open-rule', { type: s.type, tier: s.tier, base: s.base })">{{ groupLabel(s.type) }}, {{ tierLabel(s.tier) }} <i class="fas fa-external-link-alt" /></button>
          <WChip :title="SKIP_WHY[s.reason].title">{{ SKIP_WHY[s.reason].label }}</WChip>
          <WChip v-if="s.hides" :class="$style.bad" title="The tier its price says is hidden at your strictness">would hide it</WChip>
          <span class="grow" />
          <span class="w-faint text-xs">price says {{ tierLabel(s.wanted) }}</span>
          <WButton v-if="s.reason !== 'locked'" size="sm" variant="ghost" title="Move it, though this price may not be real" @click="moveAnywayMany([s])">Move anyway</WButton>
          <WButton v-else size="sm" variant="ghost" title="Let prices move it again" @click="unlockMany([s])">Unlock</WButton>
          <WPrice bulk :chaos="s.chaos" :divine="divine" />
        </div>
        <div v-if="!skipList.length" class="w-dim text-xs" :class="$style.more">Nothing matches both filters.</div>
        <button v-if="skipList.length > skipShown.length" type="button" :class="[$style.link, $style.more]" class="w-focusable text-xs" @click="skipLimit = skipList.length">Show all {{ skipList.length }}</button>
      </template>
    </template>

    <div :class="$style.net">
      <div class="flex items-center gap-2">
        <WToggle v-model="config.safetyNet.on">Always show anything worth</WToggle>
        <WField v-model.number="minChaos" type="number" suffix="c" style="width: 5.5rem;" aria-label="Safety net value in chaos" />
        <span class="w-dim text-xs">{{ config.safetyNet.on ? netCaughtText : 'off' }}</span>
        <WInfo :text="'One rule at the top of your filter, white on red with a short red beam and an alert sound, for valuable items the rest of the filter would hide.\n\nThin markets count, since a junk price only costs you a click. It can\'t judge rares, gems, cluster jewels or maps, which have no one price for a base.'" />
      </div>
      <WToggle :model-value="dockNotice" @update:model-value="setDockNotice">Tell me on the dock icon</WToggle>
    </div>

    <div class="w-group-label" :class="$style.label">Valuable items your filter hides or shows small</div>
    <WEmpty v-if="!shown.length" icon="fas fa-check">Nothing worth {{ Math.min(config.safetyNet.minChaos, 10) }}c or more is hidden or shown small.</WEmpty>
    <div v-if="shown.length" class="w-dim text-xs" :class="$style.summary">
      {{ hiddenCount }} hidden<template v-if="caughtCount">; your {{ config.safetyNet.minChaos }}c safety net still shows {{ caughtCount }}</template>
      <WInfo text="Click one to see what you'd get." />
    </div>
    <template v-for="r in shown" :key="r.key">
      <div v-if="done.has(r.key)" :class="[$style.row, $style.doneRow]">
        <img v-if="r.icon" :src="r.icon" :class="$style.art" alt="">
        <span class="w-trunc text-sm">{{ r.v.base }}</span>
        <i class="fas fa-check w-faint text-xs" />
        <span class="w-dim text-xs w-trunc">{{ done.get(r.key)?.text }}</span>
        <span class="grow" />
        <WButton size="sm" variant="ghost" icon="fas fa-undo" :aria-label="`Undo for ${r.v.base}`" @click="undoDone(r.key)">Undo</WButton>
      </div>
      <button v-else v-item-tip="baseTip(r.v.group.type, r.v.base)" type="button" class="w-focusable" :class="[$style.row, $style.healthRow, { [$style.open]: openRow === r.key }]" :aria-expanded="openRow === r.key" @click="openRow = openRow === r.key ? null : r.key">
        <img v-if="r.icon" :src="r.icon" :class="$style.art" alt="">
        <LabelPreview :text="r.v.base" :actions="r.v.block?.actions ?? []" :visibility="r.v.state === 'hidden' ? 'Hide' : 'Show'" :extras="false" />
        <span class="w-trunc text-xs" :class="$style.who">
          <b v-if="r.top && r.top !== r.v.base">{{ r.top }}</b>
          <span v-else>{{ groupLabel(r.v.group.type) }}</span>
          <span v-if="r.items.length > 1" class="w-dim"> highest priced of {{ r.items.length }}</span>
        </span>
        <span v-if="r.trash" :class="$style.trash" class="text-xs">{{ r.trash }} trash</span>
        <span class="grow" />
        <WChip :class="r.v.state === 'hidden' && !caught(r.v) ? $style.bad : ''">{{ r.v.state === 'hidden' ? (caught(r.v) ? 'safety net shows it' : 'hidden') : 'small label' }}</WChip>
        <WPrice bulk :chaos="r.v.chaos" :divine="divine" />
        <i :class="openRow === r.key ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" class="w-faint text-xs" />
      </button>
      <div v-if="openRow === r.key && !done.has(r.key)" :class="$style.detail">
        <div class="min-w-0">
          <div class="text-sm" :class="$style.detailHead">{{ r.items.length > 1 ? `What you'd get: ${r.items.length} uniques on this base` : 'What you\'d get' }}</div>
          <div v-for="i in r.items" :key="i.name" :class="$style.priceRow">
            <img v-if="itemIcon(r.v, i.name)" :src="itemIcon(r.v, i.name)!" :class="$style.bigArt" alt="">
            <span v-else :class="$style.bigArt" />
            <span v-item-tip="{ name: i.name }" class="w-trunc text-sm">{{ i.name }}</span>
            <span :class="$style.bar"><i :class="$style[`g_${i.grade}`]" :style="{ width: `${priceBar(i.chaos, r.most)}%` }" /></span>
            <span class="w-num text-xs" :class="$style[`${i.grade}Text`]">{{ i.chaos != null ? `${Math.round(i.chaos)}c` : 'no price' }}</span>
            <span class="text-xs" :class="$style[`${i.grade}Text`]">{{ GRADE_LABEL[i.grade] }}{{ i.thin ? ', thin market' : '' }}</span>
          </div>
          <div v-if="r.trash" class="w-dim text-xs flex items-center gap-1" style="margin-top: 5px;">{{ r.trash }} of {{ r.items.length }} {{ r.trash === 1 ? 'is' : 'are' }} trash <WInfo text="A trash drop looks the same on the ground until you identify it." /></div>
        </div>
        <div class="min-w-0">
          <div class="text-sm" :class="$style.detailHead">"Show it" will</div>
          <div v-for="(line, n) in r.effect" :key="n" class="w-dim text-xs">{{ line }}</div>
          <div class="flex flex-wrap items-center gap-1" style="margin-top: 6px;">
            <WButton size="sm" variant="primary" @click="showIt(r)">Show it</WButton>
            <WButton size="sm" variant="ghost" :title="r.v.state === 'hidden' ? 'Stays hidden, and off this list, until its price doubles' : 'Off this list until its price doubles'" @click="dismiss(r)">Not for me</WButton>
            <WButton v-if="r.v.block?.type && r.v.block.tier" size="sm" variant="ghost" icon="fas fa-external-link-alt" @click="emit('open-rule', { type: r.v.block!.type!, tier: r.v.block!.tier!, base: r.v.base })">Open the rule</WButton>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useFold } from '../ui/fold'
import { WButton, WChip, WEmpty, WField, WInfo, WKbd, WPrice, WSegmented, WToggle, agoPhrase, gameIcon, ninjaIcon, openMenu, toast, vItemTip } from '../ui'
import { TURN_OFF_IDS } from './notices'
import { gradeItems, GRADE_LABEL, healthKey, isDismissed, priceBar, showEffect, trashCount } from './health'
import { usePoeninja } from '@/web/background/Prices'
import LabelPreview from './LabelPreview.vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import { ECONOMY_GROUPS, NET_GROUPS, livePriceMoves, lockKey, tierRank } from './economy'
import type { PriceMove, PriceSkip } from './economy'
import { conditionSignature } from './edits'
import { baseTipRef } from './base-tip'
import { SAFETY_LOOK } from './safety'
import type { BaseVerdict } from './safety'
import { groupName } from './groups'
import type { FilterAction } from './parse'
import { tierLabel } from './names'
import { usePicks } from './picks'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  anchor?: Element | null
}>()

const ninja = usePoeninja()
const divine = computed(() => ninja.xchgRate.value ?? null)
const updatedAt = computed(() => props.store.prices.updatedAt.value)
const league = computed(() => props.store.prices.league.value)
const plan = computed(() => props.store.plan.value)
const moves = computed(() => plan.value?.moves ?? [])
const allSkipped = computed(() => plan.value?.skipped ?? [])

const emit = defineEmits<{ (e: 'open-rule', rule: { type: string, tier: string, base: string }): void }>()

const SKIP_WHY = {
  locked: { label: 'kept by you', short: 'you pressed Keep, or moved it by hand', title: 'You pressed Keep, or moved it yourself in Rules. Unlock lets prices move it again.' },
  thin: { label: 'thin market', short: 'too few trades to trust the price', title: 'poe.ninja had no price on 3 or more of the last 7 days, so this price is easy to fake' },
  volatile: { label: 'price jumped', short: 'waits for the price to settle', title: 'It tripled or fell to a third this week, or doubled or halved in a day. It moves once the price settles.' }
} as const

const openRow = ref<string | null>(null)
const showMoved = useFold('filter-prices.moved')

function baseTip (type: string, base: string) {
  return baseTipRef(props.store.prices.breakdown.value, props.config.safetyNet.minChaos, type, base)
}

const health = computed(() => props.store.health.value.filter(v => !isDismissed(props.config.healthDismissed, v)))
const rows = computed(() => {
  const breakdown = props.store.prices.breakdown.value
  const line = props.config.safetyNet.minChaos
  return health.value.slice(0, 40).map(v => {
    const items = gradeItems(breakdown(v.group, v.base), line)
    return {
      key: healthKey(v),
      v,
      items,
      // The one that set the row's price: the best or the cheapest, as you chose.
      top: (items.find(i => i.chaos === v.chaos) ?? items[0])?.name,
      trash: trashCount(items),
      most: items[0]?.chaos ?? 0,
      effect: showEffect(v, items),
      icon: itemIcon(v, items[0]?.name ?? v.base)
    }
  })
})
const hiddenCount = computed(() => health.value.filter(v => v.state === 'hidden').length)
const caughtCount = computed(() => health.value.filter(v => v.state === 'hidden' && caught(v)).length)
// Small stacks the net shows aren't in the list below: say them apart.
const netCaughtText = computed(() => {
  const stacks = props.store.safetyStackCount.value
  const items = props.store.safetyCount.value - stacks
  const parts = [`${items} hidden item${items === 1 ? '' : 's'}`]
  if (stacks) parts.push(`${stacks} small stack${stacks === 1 ? '' : 's'}`)
  return `${parts.join(' and ')} caught right now`
})

function itemIcon (v: { group: { unique?: boolean, ninja: string[] } }, name: string): string | null {
  return v.group.unique ? gameIcon(name, 'UNIQUE') : ninjaIcon(v.group.ninja[0], name)
}

// Show it and Not for me act in place: the row stays as a done line with Undo,
// and the next one opens. Their saves hold the game's reload (Reload now in the
// footer): typing /itemfilter hands focus to the game, which closes this window.
type HealthRow = (typeof rows.value)[number]
interface Done { row: HealthRow, at: number, text: string, undo: () => void, live: () => boolean }
const done = reactive(new Map<string, Done>())
// A done line whose step something else took back (history, Reset, an edit)
// goes, and the live row shows again.
const doneNow = computed(() => [...done.entries()].filter(([, d]) => d.live()))
watch(doneNow, (list) => {
  if (list.length === done.size) return
  const keep = new Set(list.map(([k]) => k))
  for (const k of [...done.keys()]) if (!keep.has(k)) done.delete(k)
})
const shown = computed(() => {
  const keys = new Set(doneNow.value.map(([k]) => k))
  const list: HealthRow[] = rows.value.filter(r => !keys.has(r.key))
  for (const [, d] of doneNow.value.slice().sort(([, a], [, b]) => a.at - b.at)) list.splice(Math.min(d.at, list.length), 0, d.row)
  return list
})

// Writes this one step at once, but only when nothing else waits unsaved: price
// moves you applied (and not saved yet) stay yours to save with Save + reload.
function quietSave (clean: boolean) {
  if (clean) props.store.save({ auto: true }).catch(() => {})
}
const isClean = () => !props.store.userDirty()

// Where the row sits and which one opens next, read before the step changes
// the list.
function placeOf (r: HealthRow): { at: number, next: string | null } {
  const list = shown.value
  const at = list.findIndex(x => x.key === r.key)
  const open = (x: HealthRow) => x.key !== r.key && !done.has(x.key)
  const next = (at < 0 ? undefined : list.slice(at + 1).find(open)) ?? list.find(open)
  return { at: at < 0 ? list.length : at, next: next?.key ?? null }
}

function markDone (r: HealthRow, place: { at: number, next: string | null }, d: Omit<Done, 'row' | 'at'>) {
  done.set(r.key, { row: r, at: place.at, ...d })
  openRow.value = place.next
}

function undoDone (key: string) {
  const d = done.get(key)
  if (!d) return
  done.delete(key)
  d.undo()
  openRow.value = key
}

// Puts back only this one key, so undoing one row keeps later rows' steps.
function restoreKey (map: Record<string, number>, key: string, had: boolean, was: number | undefined): Record<string, number> {
  const next = Object.fromEntries(Object.entries(map).filter(([k]) => k !== key))
  if (had && was != null) next[key] = was
  return next
}

function dismiss (r: HealthRow) {
  const v = r.v
  const key = healthKey(v)
  const place = placeOf(r)
  const had = key in props.config.healthDismissed
  const was = props.config.healthDismissed[key]
  const netHad = key in props.config.netDismissed
  const netWas = props.config.netDismissed[key]
  const clean = isClean()
  props.config.healthDismissed = { ...props.config.healthDismissed, [key]: v.chaos }
  // Only a hidden item has a net rule to take back, and that's in the file.
  const inFile = v.state === 'hidden'
  if (inFile) {
    props.config.netDismissed = { ...props.config.netDismissed, [key]: v.chaos }
    quietSave(clean)
  }
  markDone(r, place, {
    text: inFile ? 'stays hidden till its price doubles' : 'off the list till its price doubles',
    // Read props.config when it runs: Settings can swap the whole object.
    live: () => key in props.config.healthDismissed,
    undo: () => {
      const cleanNow = isClean()
      props.config.healthDismissed = restoreKey(props.config.healthDismissed, key, had, was)
      if (inFile) {
        props.config.netDismissed = restoreKey(props.config.netDismissed, key, netHad, netWas)
        quietSave(cleanNow)
      }
    }
  })
}

const dockNotice = computed(() => !TURN_OFF_IDS.every(id => props.config.noticesOff.includes(id)))
function setDockNotice (on: boolean) {
  props.config.noticesOff = on
    ? props.config.noticesOff.filter(id => !TURN_OFF_IDS.includes(id))
    : [...new Set([...props.config.noticesOff, ...TURN_OFF_IDS])]
}

const uniqueOptions = [
  { value: 'max', label: 'Best unique' },
  { value: 'min', label: 'Cheapest unique' }
]

// Ticked by default, except what a price alone would hide. Unticked rows stay
// put this time.
// Stored moves that still apply (an old move of a tier's namesake doesn't).
const movedList = computed(() => livePriceMoves(props.config.priceTiers.moves))
// A row that starts hiding at another strictness is a new choice.
const pickKey = (m: PriceMove) => `${m.type}|${m.base}|${m.hides ? 'hides' : ''}`
const movePicks = usePicks(() => moves.value, pickKey, m => !m.hides)
const { picked: pickedMoves, all: allPicked, some: somePicked, where: pickWhere, allOrNone: pickAllOrNone, click: clickPick } = movePicks
const isUp = (m: PriceMove) => rank(m.to) < rank(m.from)
const upCount = computed(() => moves.value.filter(isUp).length)

// ---- not moved ----
// Filtered by why and by group, in pages: a new league can hold back a few hundred.
const SKIP_PAGE = 40
const skipReason = ref<PriceSkip['reason'] | null>(null)
const skipGroup = ref<string | null>(null)
const skipLimit = ref(SKIP_PAGE)
const reasonCounts = computed(() => (['locked', 'thin', 'volatile'] as const)
  .map(reason => ({ reason, count: allSkipped.value.filter(s => s.reason === reason).length }))
  .filter(r => r.count))
const groupCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const s of allSkipped.value) counts.set(s.type, (counts.get(s.type) ?? 0) + 1)
  return [...counts].map(([type, count]) => ({ type, count }))
})
// A filter whose last item went (unlocked, moved) lets go.
watch([reasonCounts, groupCounts], () => {
  if (skipReason.value && !reasonCounts.value.some(r => r.reason === skipReason.value)) skipReason.value = null
  if (skipGroup.value && !groupCounts.value.some(g => g.type === skipGroup.value)) skipGroup.value = null
})
watch([skipReason, skipGroup], () => { skipLimit.value = SKIP_PAGE })
const skipList = computed(() => allSkipped.value.filter(s =>
  (!skipReason.value || s.reason === skipReason.value) && (!skipGroup.value || s.type === skipGroup.value)))
const skipShown = computed(() => skipList.value.slice(0, skipLimit.value))
const skipPicks = usePicks(() => skipList.value, s => `${s.type}|${s.base}|${s.reason}`)
const pickedLocked = computed(() => skipPicks.picked.value.filter(s => s.reason === 'locked'))
const pickedUnsure = computed(() => skipPicks.picked.value.filter(s => s.reason !== 'locked'))
const pickedHides = computed(() => pickedUnsure.value.filter(s => s.hides).length)
const nextStep = computed(() => {
  const locked = reasonCounts.value.some(r => r.reason === 'locked')
  const unsure = reasonCounts.value.some(r => r.reason !== 'locked')
  return `Tick some to ${locked && unsure ? 'unlock them or move them now' : locked ? 'unlock them' : 'move them now'}, or leave them.`
})
const skippedEl = ref<HTMLElement | null>(null)
function toSkipped () {
  skippedEl.value?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

const lastStep = computed(() => {
  const t = props.store.timeline.value
  return t.steps[t.at - 1]?.label ?? ''
})

const minChaos = computed({
  get: () => props.config.safetyNet.minChaos,
  set: (v: number) => { if (Number.isFinite(v) && v > 0) props.config.safetyNet.minChaos = v }
})

function groupLabel (type: string): string {
  return NET_GROUPS.find(g => g.type === type)?.label ?? groupName(type)
}

function rank (tier: string): number {
  return tierRank(tier, [], ECONOMY_GROUPS.find(g => g.extraTiers?.[tier] != null)) ?? 99
}

// The first live block of each tier, worked out once per doc: long lists ask per row.
const tierLooks = computed(() => {
  const out = new Map<string, FilterAction[]>()
  for (const b of props.store.doc.value?.blocks ?? []) {
    if (b.disabled || !b.type || !b.tier) continue
    const k = `${b.type}|${b.tier}`
    if (!out.has(k)) out.set(k, b.actions)
  }
  return out
})
function lookOf (type: string, tier: string): FilterAction[] {
  return tierLooks.value.get(`${type}|${tier}`) ?? []
}

function icon (m: { type: string, base: string }): string | null {
  const g = ECONOMY_GROUPS.find(x => x.type === m.type)
  if (!g || g.unique) return null
  return ninjaIcon(g.ninja[0], m.base)
}

function caught (v: BaseVerdict): boolean {
  return props.config.safetyNet.on && v.chaos >= props.config.safetyNet.minChaos
}

// Moves join your unsaved changes (Guy works through a long list in batches),
// and the window's Save + reload (Ctrl+S) writes them all once.
function moved (text: string, undo: () => void) {
  toast(`${text} · not saved yet`, { anchor: props.anchor, undo })
}

function apply () {
  const list = pickedMoves.value
  moved(`Moved ${list.length} item${list.length > 1 ? 's' : ''} to match today's prices`, props.store.applyPrices(list))
}

// Moves held-back items to where their price says, as one step.
function moveAnywayMany (list: PriceSkip[]) {
  if (!list.length) return
  skipPicks.forget(list)
  const undo = props.store.applyPrices(list.map(s => ({ type: s.type, base: s.base, from: s.tier, to: s.wanted, chaos: s.chaos })))
  moved(list.length === 1 ? `Moved ${list[0].base} to ${tierLabel(list[0].wanted)}` : `Moved ${list.length} held-back items`, undo)
}

function putBack (m: PriceMove) {
  moved(`${m.base} is back in ${tierLabel(m.from)}`, props.store.unmovePrice(m.type, m.base))
}

// Lets prices move these again, as one step. Your own move is what locks an
// item, if you made one, so that goes too. Say so: that changes the file.
function unlockMany (list: PriceSkip[]) {
  if (!list.length) return
  skipPicks.forget(list)
  const keys = new Set(list.map(s => lockKey(s.type, s.base)))
  const ownMoves = new Set(props.config.edits.flatMap(e => e.kind === 'move' && keys.has(lockKey(e.type, e.base)) ? [lockKey(e.type, e.base)] : [])).size
  const undo = props.store.changeWithUndo(c => {
    c.priceTiers.locks = c.priceTiers.locks.filter(k => !keys.has(k))
    c.edits = c.edits.filter(e => !(e.kind === 'move' && keys.has(lockKey(e.type, e.base))))
  })
  const what = list.length === 1 ? list[0].base : `${list.length} items`
  if (ownMoves) moved(`Prices can move ${what} again; dropped ${ownMoves === 1 ? 'your move' : `${ownMoves} of your moves`}`, undo)
  else toast(`Prices can move ${what} again`, { anchor: props.anchor, undo })
}

function keepOne (m: PriceMove) {
  const undo = props.store.lockItem(m.type, m.base)
  toast(`${m.base} stays in ${tierLabel(m.from)}`, { anchor: props.anchor, undo })
}

function keepAll () {
  const undos = moves.value.map(m => props.store.lockItem(m.type, m.base))
  toast(`Kept ${undos.length} items where they are`, { anchor: props.anchor, undo: () => undos.forEach(u => u()) })
}

function reset () {
  moved('Price groups are back on NeverSink\'s tiers', props.store.resetPrices())
}

function moveMenu (e: MouseEvent, m: PriceMove) {
  openMenu(e, [
    { label: `Move ${m.base} to ${tierLabel(m.to)}`, icon: 'fas fa-exchange-alt', action: () => { moved(`Moved ${m.base} to ${tierLabel(m.to)}`, props.store.applyPrices([m])) } },
    { label: 'Keep it where it is', icon: 'fas fa-lock', action: () => { const undo = props.store.lockItem(m.type, m.base); toast(`${m.base} stays in ${tierLabel(m.from)}`, { anchor: props.anchor, undo }) } }
  ])
}

// Own rule for the base: shown, in the safety net's look.
function showIt (r: HealthRow) {
  const v = r.v
  const b = v.block
  if (!b?.type || !b.tier) return
  const place = placeOf(r)
  const before = props.config.edits
  const clean = isClean()
  props.store.editWithUndo({ kind: 'item', type: b.type, tier: b.tier, base: v.base, visibility: 'Show', patch: v.state === 'hidden' ? SAFETY_LOOK : { fontSize: 40 }, anchor: conditionSignature(b), pin: true })
  const step = editStep(before, props.config.edits)
  quietSave(clean)
  markDone(r, place, {
    text: 'shows now',
    live: () => props.config.edits.some(e => step.ids.has(e.id)),
    undo: () => {
      const cleanNow = isClean()
      props.store.changeWithUndo(c => { c.edits = undoEditStep(c.edits, step) })
      quietSave(cleanNow)
    }
  })
}

// What one step did to the edit list, by id: edits it added or changed (with
// what they were), and edits it dropped.
interface EditStep<T> { ids: Set<number>, was: Map<number, T>, dropped: Array<{ at: number, e: T }> }
function editStep<T extends { id: number }> (before: T[], after: T[]): EditStep<T> {
  const old = new Map(before.map(e => [e.id, e]))
  const afterIds = new Set(after.map(e => e.id))
  const changed = after.filter(e => old.get(e.id) !== e)
  return {
    ids: new Set(changed.map(e => e.id)),
    was: new Map(changed.filter(e => old.has(e.id)).map(e => [e.id, old.get(e.id)!])),
    dropped: before.flatMap((e, at) => afterIds.has(e.id) ? [] : [{ at, e }])
  }
}

// Takes back only that step: anything changed after it stays as it is.
function undoEditStep<T extends { id: number }> (now: T[], step: EditStep<T>): T[] {
  const out = now.flatMap(e => !step.ids.has(e.id) ? [e] : step.was.has(e.id) ? [step.was.get(e.id)!] : [])
  for (const { at, e } of step.dropped) if (!out.some(x => x.id === e.id)) out.splice(Math.min(at, out.length), 0, e)
  return out
}
</script>

<style module>
.wrap {
  max-height: min(36rem, calc(70vh / var(--w-ui-scale, 1)));
  padding: 6px 0 10px;
  display: flex;
  flex-direction: column;
}
.head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px var(--w-pad) 8px;
  border-bottom: 1px solid var(--w-line-soft);
}
.label {
  padding: 10px var(--w-pad) 4px;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px var(--w-pad);
  border-bottom: 1px solid var(--w-line-soft);
  min-width: 0;
}
.check {
  width: 14px;
  flex: none;
  accent-color: var(--w-accent);
}
/* The game's coin checkbox is wider: the "Not moved" rows' blank keeps step. */
:global(:root[data-woke-art]) .check { width: calc(20px * var(--w-text-scale, 1)); }
.pickBar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px var(--w-pad) 4px;
}
.quick {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.art {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex: none;
}
.up { color: var(--w-up); }
.down { color: var(--w-down); }
.bad { color: var(--w-down); }
.applyBar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 6px var(--w-pad);
  background: var(--w-panel-3);
  border-bottom: 1px solid var(--w-line-strong);
}
.link {
  background: none;
  border: 0;
  padding: 0;
  color: var(--w-accent);
  cursor: pointer;
  text-align: left;
}
.link:hover { text-decoration: underline; }
.link i { font-size: 0.8em; opacity: 0.7; }
.summary { padding: 0 var(--w-pad) 4px; }
/* Clear of the sticky apply bar when "held back" scrolls here. */
.label { scroll-margin-top: 3rem; }
.why { padding: 0 var(--w-pad) 6px; line-height: 1.45; }
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 0 var(--w-pad);
}
.sep { width: 1px; align-self: stretch; margin: 0 4px; background: var(--w-line); }
.more { padding: 6px var(--w-pad); }
.healthRow {
  width: 100%;
  background: none;
  border-width: 0 0 1px;
  color: var(--w-fg);
  text-align: left;
  cursor: pointer;
}
.healthRow:hover { background: var(--w-panel-2); }
.open { background: var(--w-accent-soft); }
.who { min-width: 0; }
.doneRow { opacity: 0.75; }
.trash { color: var(--w-down); white-space: nowrap; }
.detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  padding: 8px var(--w-pad) 10px;
  border-bottom: 1px solid var(--w-line);
  background: var(--w-panel-2);
}
.detailHead { font-weight: 600; margin-bottom: 3px; }
.priceRow {
  display: grid;
  grid-template-columns: 26px minmax(0, 10rem) minmax(2rem, 1fr) 3rem 5.5rem;
  align-items: center;
  gap: 7px;
  margin-top: 3px;
}
.bigArt { width: 26px; height: 26px; object-fit: contain; display: block; }
.bar { height: 6px; background: var(--w-panel-3); border-radius: var(--w-r-sm); overflow: hidden; }
.bar i { display: block; height: 100%; }
.g_high { background: var(--w-accent); }
.g_mid { background: var(--w-dim); }
.g_trash { background: var(--w-down); }
.g_unknown { background: var(--w-faint); }
.highText { color: var(--w-accent); }
.midText { color: var(--w-dim); }
.trashText { color: var(--w-down); }
.unknownText { color: var(--w-faint); }
.net {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 8px var(--w-pad) 0;
  padding: 8px 10px;
  background: var(--w-panel-2);
  border-radius: var(--w-r-sm);
}
</style>
