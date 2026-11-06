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
        <span v-else><b>{{ moves.length ? `${moves.length} item${moves.length > 1 ? 's' : ''}` : 'Nothing' }}</b> {{ moves.length ? 'would move' : 'to move: tiers match today\'s prices' }}</span>
        <button v-if="config.priceTiers.moves.length" type="button" :class="$style.link" class="w-focusable text-xs" :aria-expanded="showMoved" @click="showMoved = !showMoved">{{ config.priceTiers.moves.length }} moved so far <i :class="showMoved ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" /></button>
        <span class="grow" />
        <WButton v-if="moves.length" size="sm" variant="ghost" @click="keepAll">Keep all where they are</WButton>
        <WButton v-if="config.priceTiers.moves.length" size="sm" variant="ghost" icon="fas fa-undo" title="Put every price group back on NeverSink's own tiers" @click="reset">Back to NeverSink's tiers</WButton>
        <WButton v-if="moves.length" size="sm" variant="primary" :disabled="!pickedMoves.length" @click="apply">Apply {{ pickedMoves.length }} and save</WButton>
      </div>
      <template v-if="showMoved">
        <div class="w-group-label" :class="$style.label">Moved by prices</div>
        <div v-for="m in config.priceTiers.moves" :key="'d' + m.type + m.base" :class="$style.row">
          <LabelPreview :text="m.base" :actions="lookOf(m.type, m.to)" :extras="false" />
          <button type="button" :class="$style.link" class="w-focusable text-xs w-trunc" :title="`Open ${groupLabel(m.type)} ${m.to} in Rules`" @click="emit('open-rule', { type: m.type, tier: m.to, base: m.base })">{{ groupLabel(m.type) }} <i class="fas fa-external-link-alt" /></button>
          <span class="w-num text-xs w-dim">{{ tierLabel(m.from) }} → {{ tierLabel(m.to) }}</span>
          <span class="grow" />
          <WButton size="sm" variant="ghost" title="Back to NeverSink's tier, and prices leave it there" @click="putBack(m)">Put back</WButton>
        </div>
      </template>
      <div v-if="moves.length" class="w-group-label" :class="$style.label">Would move</div>
      <div v-for="m in moves" :key="m.type + m.base" v-item-tip="baseTip(m.type, m.base)" :class="$style.row" @contextmenu="moveMenu($event, m)">
        <input :id="`pm-${m.type}-${m.base}`" v-model="picked[pickKey(m)]" type="checkbox" :class="$style.check" :aria-label="`Move ${m.base}`">
        <img v-if="icon(m)" :src="icon(m)!" :class="$style.art" alt="">
        <LabelPreview :text="m.base" :actions="lookOf(m.type, m.to)" :extras="false" />
        <button type="button" :class="$style.link" class="w-focusable text-xs w-trunc" :title="`Open ${groupLabel(m.type)} ${m.from} in Rules`" @click="emit('open-rule', { type: m.type, tier: m.from, base: m.base })">{{ groupLabel(m.type) }} <i class="fas fa-external-link-alt" /></button>
        <span class="w-num text-xs"><span :class="rank(m.to) < rank(m.from) ? $style.up : $style.down">{{ tierLabel(m.from) }} → {{ tierLabel(m.to) }}</span></span>
        <WChip v-if="m.hides" :class="$style.bad" title="This tier is hidden at your strictness. Left unticked so a price alone doesn't hide it.">would hide it</WChip>
        <span class="grow" />
        <span class="w-num text-xs w-dim w-trunc" :title="m.note">{{ m.note ? `${m.note} · ` : '' }}</span>
        <WPrice :chaos="m.chaos" :divine="divine" />
        <WButton size="sm" variant="ghost" icon="fas fa-times" :title="`Keep ${m.base} in ${tierLabel(m.from)}. It stops being suggested, and you can unlock it under Not moved.`" :aria-label="`Keep ${m.base} where it is`" @click="keepOne(m)">Keep</WButton>
      </div>
      <template v-if="skipped.length">
        <div class="w-group-label" :class="$style.label">Not moved · {{ allSkipped.length }}</div>
        <div v-for="s in skipped" :key="'s' + s.type + s.base" :class="$style.row">
          <span :class="$style.check" />
          <LabelPreview :text="s.base" :actions="lookOf(s.type, s.tier)" :extras="false" />
          <button type="button" :class="$style.link" class="w-focusable text-xs" :title="`Open ${groupLabel(s.type)} ${s.tier} in Rules`" @click="emit('open-rule', { type: s.type, tier: s.tier, base: s.base })">{{ groupLabel(s.type) }}, {{ tierLabel(s.tier) }} <i class="fas fa-external-link-alt" /></button>
          <WChip :title="SKIP_WHY[s.reason].title">{{ SKIP_WHY[s.reason].label }}</WChip>
          <span class="grow" />
          <span class="w-faint text-xs">price says {{ tierLabel(s.wanted) }}</span>
          <WButton v-if="s.reason !== 'locked'" size="sm" variant="ghost" title="Move it, though this price may not be real" @click="moveAnyway(s)">Move anyway</WButton>
          <WButton v-else size="sm" variant="ghost" title="Let prices move it again" @click="unlock(s)">Unlock</WButton>
          <WPrice :chaos="s.chaos" :divine="divine" />
        </div>
      </template>
    </template>

    <div :class="$style.net">
      <div class="flex items-center gap-2">
        <WToggle v-model="config.safetyNet.on">Always show anything worth</WToggle>
        <WField v-model.number="minChaos" type="number" suffix="c" style="width: 5.5rem;" aria-label="Safety net value in chaos" />
        <span class="w-dim text-xs">{{ config.safetyNet.on ? `${store.safetyCount.value} hidden item${store.safetyCount.value === 1 ? '' : 's'} caught right now` : 'off' }}</span>
        <WInfo :text="'One rule at the top of your filter, white on red with a short red beam and an alert sound, for valuable items the rest of the filter would hide.\n\nThin markets count, since a junk price only costs you a click. It can\'t judge rares, gems, cluster jewels or maps, which have no one price for a base.'" />
      </div>
      <WToggle :model-value="dockNotice" @update:model-value="setDockNotice">Tell me on the dock icon</WToggle>
    </div>

    <div class="w-group-label" :class="$style.label">Valuable items your filter hides or shows small</div>
    <WEmpty v-if="!rows.length" icon="fas fa-check">Nothing worth {{ Math.min(config.safetyNet.minChaos, 10) }}c or more is hidden or shown small.</WEmpty>
    <div v-if="rows.length" class="w-dim text-xs" :class="$style.summary">
      {{ hiddenCount }} hidden<template v-if="caughtCount">; your {{ config.safetyNet.minChaos }}c safety net still shows {{ caughtCount }}</template>
      <WInfo text="Click one to see what you'd get." />
    </div>
    <template v-for="r in rows" :key="r.key">
      <button v-item-tip="baseTip(r.v.group.type, r.v.base)" type="button" class="w-focusable" :class="[$style.row, $style.healthRow, { [$style.open]: openRow === r.key }]" :aria-expanded="openRow === r.key" @click="openRow = openRow === r.key ? null : r.key">
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
        <WPrice :chaos="r.v.chaos" :divine="divine" />
        <i :class="openRow === r.key ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" class="w-faint text-xs" />
      </button>
      <div v-if="openRow === r.key" :class="$style.detail">
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
            <WButton size="sm" variant="primary" @click="showIt(r.v)">Show it</WButton>
            <WButton size="sm" variant="ghost" :title="r.v.state === 'hidden' ? 'Stays hidden, and off this list, until its price doubles' : 'Off this list until its price doubles'" @click="dismiss(r.v)">Not for me</WButton>
            <WButton v-if="r.v.block?.type && r.v.block.tier" size="sm" variant="ghost" icon="fas fa-external-link-alt" @click="emit('open-rule', { type: r.v.block!.type!, tier: r.v.block!.tier!, base: r.v.base })">Open the rule</WButton>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { WButton, WChip, WEmpty, WField, WInfo, WPrice, WSegmented, WToggle, agoPhrase, gameIcon, ninjaIcon, openMenu, toast, vItemTip } from '../ui'
import { TURN_OFF_IDS } from './notices'
import { gradeItems, GRADE_LABEL, healthKey, isDismissed, priceBar, showEffect, trashCount } from './health'
import { usePoeninja } from '@/web/background/Prices'
import LabelPreview from './LabelPreview.vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import { ECONOMY_GROUPS, NET_GROUPS, lockKey, tierRank } from './economy'
import type { PriceMove, PriceSkip } from './economy'
import { conditionSignature } from './edits'
import { baseTipRef } from './base-tip'
import { SAFETY_LOOK } from './safety'
import type { BaseVerdict } from './safety'
import { groupName } from './groups'
import type { FilterAction } from './parse'
import { tierLabel } from './names'

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
const skipped = computed(() => allSkipped.value.slice(0, 20))

const emit = defineEmits<{ (e: 'open-rule', rule: { type: string, tier: string, base: string }): void }>()

const SKIP_WHY = {
  thin: { label: 'thin market', title: 'poe.ninja had no price on 3 or more of the last 7 days, so this price is easy to fake' },
  volatile: { label: 'price jumped', title: 'It tripled or fell to a third this week, or doubled or halved in a day. It moves once the price settles.' },
  locked: { label: 'your tier, locked', title: 'You placed this item yourself' }
}

const openRow = ref<string | null>(null)
const showMoved = ref(false)

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

function itemIcon (v: { group: { unique?: boolean, ninja: string[] } }, name: string): string | null {
  return v.group.unique ? gameIcon(name, 'UNIQUE') : ninjaIcon(v.group.ninja[0], name)
}

function dismiss (v: BaseVerdict) {
  const key = healthKey(v)
  const before = props.config.healthDismissed
  const netBefore = props.config.netDismissed
  props.config.healthDismissed = { ...before, [key]: v.chaos }
  const undo = () => {
    props.config.healthDismissed = before
    props.config.netDismissed = netBefore
  }
  // Only a hidden item has a net rule to take back, and that's in the file.
  if (v.state === 'hidden') {
    props.config.netDismissed = { ...netBefore, [key]: v.chaos }
    moved(`${v.base} stays hidden until its price doubles`, undo)
  } else {
    toast(`${v.base} is off this list until its price doubles`, { anchor: props.anchor, undo })
  }
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
const picked = reactive<Record<string, boolean>>({})
// A row that starts hiding at another strictness is a new choice.
const pickKey = (m: PriceMove) => `${m.type}|${m.base}|${m.hides ? 'hides' : ''}`
watch(moves, (list) => {
  for (const m of list) if (picked[pickKey(m)] === undefined) picked[pickKey(m)] = !m.hides
}, { immediate: true })
const pickedMoves = computed(() => moves.value.filter(m => picked[pickKey(m)]))

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

function lookOf (type: string, tier: string): FilterAction[] {
  const b = props.store.doc.value?.blocks.find(x => x.type === type && x.tier === tier && !x.disabled)
  return b?.actions ?? []
}

function icon (m: { type: string, base: string }): string | null {
  const g = ECONOMY_GROUPS.find(x => x.type === m.type)
  if (!g || g.unique) return null
  return ninjaIcon(g.ninja[0], m.base)
}

function caught (v: BaseVerdict): boolean {
  return props.config.safetyNet.on && v.chaos >= props.config.safetyNet.minChaos
}

// Moves save right away: tiers that only changed in the editor do nothing. The
// reload follows your setting (town or hideout, if you chose that), and a save
// the game would refuse shows its reason in the window's footer.
function moved (text: string, undo: () => void) {
  props.store.save().catch(() => {})
  toast(text, { anchor: props.anchor, undo: () => { undo(); props.store.save().catch(() => {}) } })
}

function apply () {
  const list = pickedMoves.value
  moved(`Moved ${list.length} item${list.length > 1 ? 's' : ''} to match today's prices`, props.store.applyPrices(list))
}

function moveAnyway (s: PriceSkip) {
  moved(`Moved ${s.base} to ${tierLabel(s.wanted)}`, props.store.applyPrices([{ type: s.type, base: s.base, from: s.tier, to: s.wanted, chaos: s.chaos }]))
}

function putBack (m: PriceMove) {
  moved(`${m.base} is back in ${tierLabel(m.from)}`, props.store.unmovePrice(m.type, m.base))
}

function unlock (s: PriceSkip) {
  const key = lockKey(s.type, s.base)
  // Your own move is what locks it, if you made one, so that goes too. Say so.
  const ownMove = props.config.edits.some(e => e.kind === 'move' && e.type === s.type && e.base === s.base)
  const undo = props.store.changeWithUndo(c => {
    c.priceTiers.locks = c.priceTiers.locks.filter(k => k !== key)
    c.edits = c.edits.filter(e => !(e.kind === 'move' && e.type === s.type && e.base === s.base))
  })
  // Only your own move changes the file.
  if (ownMove) moved(`Dropped your move of ${s.base}, so prices can move it again`, undo)
  else toast(`Prices can move ${s.base} again`, { anchor: props.anchor, undo })
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
function showIt (v: BaseVerdict) {
  const b = v.block
  if (!b?.type || !b.tier) return
  moved(`${v.base} now shows`, props.store.editWithUndo({ kind: 'item', type: b.type, tier: b.tier, base: v.base, visibility: 'Show', patch: v.state === 'hidden' ? SAFETY_LOOK : { fontSize: 40 }, anchor: conditionSignature(b), pin: true }))
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
.bar { height: 6px; background: var(--w-panel-3); border-radius: 3px; overflow: hidden; }
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
