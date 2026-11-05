<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false" :readonly="true">
    <div class="flex gap-2 min-h-0 items-start">
      <!-- While you play: an icon in the dock, only in a zone with a mechanic;
           resting the mouse on it shows the glance card. -->
      <DockItem id="mechanics" :art="mechanicIcon(mech.id).src" :icon="mech.icon" :title="mech.label" :show="dockShow" :wm-id="config.wmId"
        card-width="19rem" interactive @activate="config.expanded = true">
        <template #card>
          <div v-if="wm.active.value" class="flex justify-end gap-1" style="padding: 2px 6px 0;">
            <button class="w-icon-btn" title="Previous mechanic" @click="step(-1)"><i class="fas fa-chevron-left" /></button>
            <button class="w-icon-btn" title="Next mechanic" @click="step(1)"><i class="fas fa-chevron-right" /></button>
            <button class="w-icon-btn" title="Expand" @click="config.expanded = true"><i class="fas fa-expand-alt" /></button>
          </div>
          <WBanner v-if="!hasPrices" tone="info">Waiting for poe.ninja prices…</WBanner>
          <template v-if="mech.id === 'betrayal' && goals.length">
            <div class="w-group-label">Goals · {{ goalsDone }} of {{ goals.length }} in place</div>
            <div v-for="g in goalRows.filter(r => !r.done)" :key="g.member" class="w-row" :class="$style.glanceBtr">
              <span class="w-trunc"><span class="w-accent">{{ g.member }}</span> → {{ DIVISIONS[g.di] }}</span>
              <span class="w-dim text-xs">{{ g.nowLabel }}</span>
            </div>
          </template>
          <template v-else-if="mech.id === 'betrayal'">
            <div class="w-group-label">{{ starredGlance.length ? 'Starred slots' : 'Most valuable slots' }}</div>
            <div v-for="row in glanceBetrayal" :key="row.key" class="w-row" :class="$style.glanceBtr">
              <span class="w-trunc"><span class="w-accent">{{ row.member }}</span> · {{ row.reward }}</span>
              <WPrice :chaos="row.chaos" :divine="divine" class="justify-end" />
            </div>
          </template>
          <MechanicPrices v-else :mech="mech" :items="items" :divine="divine" :top="3" />
          <div v-if="scarabs.length" :class="$style.chips">
            <WChip v-for="s in scarabs.slice(0, 2)" :key="s.item.name" :title="s.item.name">
              <span class="w-trunc" style="max-width: 10rem;">{{ shortScarab(s.item.name) }}</span>
              <WPrice :chaos="s.chaos" :divine="divine" />
            </WChip>
          </div>
        </template>
      </DockItem>

      <!-- Expanded: rail of mechanics, prices, then scarabs and tips. -->
      <WPanel v-if="config.expanded" :icon="mech.id" :title="config.wmTitle || 'League mechanics'" :updated="prices.snapshot.value?.ts ?? null" :fresh-min="40" :stale-min="180" width="40rem" max-height="70vh" :scroll="false">
        <template #actions>
          <button class="w-icon-btn" :class="{ 'w-icon-btn--on': config.autoSwitch }" @click="config.autoSwitch = !config.autoSwitch"
            :title="config.autoSwitch ? 'Switches mechanic when you enter its zone. Click to turn off.' : 'Click to switch mechanic when you enter its zone'">
            <i class="fas fa-location-arrow" />
          </button>
          <button class="w-icon-btn" title="Collapse to icon" @click="collapse"><i class="fas fa-compress-alt" /></button>
        </template>
        <div :class="$style.split">
          <div :class="$style.rail" class="w-scroll" role="tablist">
            <button v-for="m in visible" :key="m.id" type="button" role="tab" :aria-selected="m.id === mech.id"
              :class="[$style.railBtn, { [$style.railOn]: m.id === mech.id }]" :title="m.label" @click="config.tab = m.id">
              <WIcon :mechanic="m.id" :fallback="m.icon" size="md" /><span>{{ m.short }}</span>
              <i v-if="m.id === zoneMech" :class="$style.dot" title="Your current zone" />
            </button>
          </div>

          <div class="w-scroll" :class="$style.col">
            <WBanner v-if="!hasPrices" tone="info">Waiting for poe.ninja prices. They load on their own within a minute or two.</WBanner>
            <template v-if="mech.id === 'betrayal'">
              <div :class="$style.toolbar">
                <WSegmented v-model="division" :options="DIVISIONS.map((d, i) => ({ value: String(i), label: d.slice(0, 5) }))" />
              </div>
              <div v-for="row in betrayalRows" :key="row.key" class="w-row" :class="$style.btrGrid">
                <button class="w-icon-btn" :class="{ 'w-icon-btn--on': row.starred }" @click="toggleStar(row.key)" :title="row.starred ? 'Unstar' : 'Star this slot'">
                  <i :class="row.starred ? 'fas fa-star' : 'far fa-star'" />
                </button>
                <span class="w-trunc">{{ row.member }}</span>
                <span class="w-trunc w-dim" :title="rewardTitle(row)">{{ row.reward }}</span>
                <WPrice :chaos="row.chaos" :divine="divine" class="justify-end" :class="{ 'w-up': isHot(row.chaos) }" />
              </div>
            </template>
            <MechanicPrices v-else :mech="mech" :items="items" :divine="divine" />
          </div>

          <div class="w-scroll" :class="$style.col">
            <div v-if="mech.id === 'betrayal'" :class="$style.toolbar">
              <WButton size="sm" icon="fas fa-th" @click="showBoard = !showBoard">{{ showBoard ? 'Hide board' : 'Full board' }}</WButton>
            </div>
            <template v-if="mech.id === 'betrayal'">
              <div class="w-group-label">Goals <span class="w-faint">(starred slots)</span></div>
              <div v-if="!goals.length" class="w-dim text-xs" :class="$style.pad">Star the slots you want (left) and this turns into a to-do list.</div>
              <div v-for="g in goalRows" :key="g.member" :class="$style.goal">
                <span class="w-trunc"><i :class="g.done ? 'fas fa-check-circle w-up' : 'far fa-circle w-accent'" /> {{ g.member }} → {{ DIVISIONS[g.di] }}</span>
                <span :class="$style.where" :title="`Where is ${g.member} now?`">
                  <button v-for="(d, di) in DIVISIONS" :key="d" type="button" :title="d"
                    :class="[$style.whereBtn, { [$style.whereOn]: betrayalAt[g.member] === di }]"
                    @click="setAt(g.member, di)">{{ d[0] }}</button>
                </span>
              </div>
              <template v-if="goals.length">
                <div class="w-group-label">When you meet</div>
                <div :class="$style.pad">
                  <WSelect v-model="metMember" :options="MEMBERS.map(m => ({ value: m, label: m }))" />
                  <div class="text-xs mt-1" :class="ADVICE_CLASS[metAdvice.kind]">{{ metAdvice.text }}</div>
                  <div class="flex items-center gap-1 mt-1 text-xs w-dim">
                    <span>{{ metMember }} is now in</span>
                    <button v-for="(d, di) in DIVISIONS" :key="d" type="button" :title="d"
                      :class="[$style.whereBtn, { [$style.whereOn]: betrayalAt[metMember] === di }]"
                      @click="setAt(metMember, di)">{{ d[0] }}</button>
                  </div>
                </div>
              </template>
            </template>
            <template v-if="scarabs.length">
              <div class="w-group-label">Scarabs</div>
              <div v-for="s in scarabs" :key="s.item.name" class="w-row" :class="$style.scarabGrid">
                <span class="w-trunc" :title="s.item.name">{{ shortScarab(s.item.name) }}</span>
                <WPrice :chaos="s.chaos" :divine="divine" class="justify-end" />
              </div>
            </template>
            <div class="w-group-label">Rules of thumb</div>
            <ul :class="$style.tips">
              <li v-for="tip in mech.tips" :key="tip">{{ tip }}</li>
            </ul>
          </div>
        </div>
        <template #footer>
          <span>Prices from poe.ninja</span>
        </template>
      </WPanel>

      <WPanel v-if="config.expanded && mech.id === 'betrayal' && showBoard" size-key="board" title="Syndicate board" width="auto" :class="$style.boardPanel">
        <template #actions>
          <WField v-model="boardQuery" icon="fas fa-search" placeholder="Search rewards" style="width: 12rem;" />
          <button class="w-icon-btn" @click="showBoard = false" title="Close"><i class="fas fa-times" /></button>
        </template>
        <div :class="$style.board">
          <span />
          <span v-for="m in MEMBERS" :key="m" :class="$style.boardHead">{{ m }}</span>
          <template v-for="(d, di) in DIVISIONS" :key="d">
            <span :class="$style.boardDiv">{{ d }}</span>
            <button v-for="m in MEMBERS" :key="m" type="button"
              :class="[$style.cell, {
                [$style.cellOn]: config.betrayalStars.includes(slotKey(m, di)),
                [$style.cellDim]: !boardMatch(m, d, rewardText(m, di))
              }]"
              @click="toggleStar(slotKey(m, di))">
              <span>{{ rewardText(m, di) }}</span>
              <span v-if="boardPrice(m, di) != null" class="text-xs" :class="isHot(boardPrice(m, di)) ? 'w-up' : 'w-faint'">
                <WPrice :chaos="boardPrice(m, di)" :divine="divine" />
              </span>
            </button>
          </template>
        </div>
        <template #footer><span>Click a slot to star it. Rewards from the 3.24 sheet; green = top 10% by value now.</span></template>
      </WPanel>
    </div>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { MECHANICS_TYPE } from './widget'
import type { MechanicsWidget } from './widget'

export default {
  widget: {
    type: MECHANICS_TYPE,
    instances: 'multi',
    trNameKey: 'League mechanics'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { inject, computed, shallowRef } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WSegmented, WButton, WPrice, WChip, WField, WSelect, WBanner, WIcon } from '../ui'
import { usePriceIndex } from '../market/price-index'
import DockItem from '../dock/DockItem.vue'
import { mechanicIcon } from '../ui/game-icons'
import { hideWhilePlaying } from '../dock/dock'
import MechanicPrices from './MechanicPrices.vue'
import { MECHANICS, mechanicById, priceScarabs } from './data'
import { DIVISIONS, MEMBERS, REWARDS, adviceFor, goalsFromStars, priceReward, slotKey } from './betrayal'
import type { AdviceKind } from './betrayal'
import { useMechanicZone } from './zone'

const props = defineProps<{
  config: MechanicsWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'League mechanics'
  // Above the stash and inventory panels, so the glance never covers them.
  props.config.anchor = { pos: 'tl', x: 2, y: 8 }
  props.config.posChecked = true
  props.config.tab = 'delve'
  props.config.expanded = false
  props.config.autoSwitch = true
  props.config.hidden = []
  props.config.betrayalStars = []
  props.config.betrayalOverrides = {}
  wm.show(props.config.wmId)
}

// The expanded window shows only with the overlay open; the dock covers play.
hideWhilePlaying(props.config)

// Icons placed before: the old default spot (left edge, 30% down) is inside
// the stash grid. Move it above, once.
if (!props.config.posChecked) {
  const a = props.config.anchor
  if (a && a.pos === 'tl' && a.x < 30 && a.y >= 12 && a.y <= 85) props.config.anchor = { ...a, y: 8 }
  props.config.posChecked = true
}

const prices = usePriceIndex()
const items = computed(() => prices.snapshot.value?.items ?? [])
const divine = computed(() => prices.snapshot.value?.divine ?? null)
const hasPrices = computed(() => items.value.length > 0)

const visible = computed(() => MECHANICS.filter(m => !props.config.hidden.includes(m.id)))
const mech = computed(() => {
  const m = mechanicById(props.config.tab)
  return (m && !props.config.hidden.includes(m.id)) ? m : (visible.value[0] ?? MECHANICS[0])
})

function step (dir: number) {
  const list = visible.value
  if (!list.length) return
  const i = list.findIndex(m => m.id === mech.value.id)
  props.config.tab = list[(i + dir + list.length) % list.length].id
}

const zoneMech = shallowRef<string | null>(null)
useMechanicZone((id) => {
  zoneMech.value = id
  if (id && props.config.autoSwitch && !props.config.hidden.includes(id)) props.config.tab = id
})
// The icon is contextual: it shows only in a zone with a mechanic.
const dockShow = computed(() => zoneMech.value != null && !props.config.hidden.includes(zoneMech.value))

function collapse () {
  props.config.expanded = false
}

const scarabs = computed(() => mech.value.scarabs ? priceScarabs(mech.value.scarabs, items.value) : [])

function shortScarab (name: string) {
  return name.replace(/ Scarab( of)?/, ':').replace(/:$/, '')
}

// ---- Betrayal ----
const division = shallowRef('2')
const showBoard = shallowRef(false)
const boardQuery = shallowRef('')

function rewardText (member: string, di: number) {
  return props.config.betrayalOverrides[slotKey(member, di)] || REWARDS[member][di]
}

const slots = computed(() => MEMBERS.flatMap(member => DIVISIONS.map((_, di) => {
  const key = slotKey(member, di)
  const reward = rewardText(member, di)
  const priced = priceReward(reward, items.value)
  return { key, member, di, reward, chaos: priced.chaos ?? null, bestName: priced.bestName, upTo: priced.upTo, count: priced.count, starred: props.config.betrayalStars.includes(key) }
})))
const slotByKey = computed(() => new Map(slots.value.map(s => [s.key, s])))

const hotCut = computed(() => {
  const vals = slots.value.map(s => s.chaos).filter((c): c is number => c != null).sort((a, b) => b - a)
  return vals.length ? vals[Math.max(0, Math.ceil(vals.length * 0.1) - 1)] : Infinity
})
function rewardTitle (row: { bestName?: string, upTo?: number, count?: number, chaos: number | null }) {
  if (!row.bestName || row.upTo == null) return undefined
  if ((row.count ?? 1) <= 1) return row.bestName
  return `Typical value (median of ${row.count} possible items). Up to ${Math.round(row.upTo)}c: ${row.bestName}`
}

function boardPrice (m: string, di: number) { return slotByKey.value.get(slotKey(m, di))?.chaos ?? null }
function isHot (chaos: number | null) { return chaos != null && chaos >= hotCut.value }

const betrayalRows = computed(() => slots.value
  .filter(s => s.di === Number(division.value))
  .sort((a, b) => Number(b.starred) - Number(a.starred) || (b.chaos ?? -1) - (a.chaos ?? -1)))

const starredGlance = computed(() => slots.value.filter(s => s.starred))
const glanceBetrayal = computed(() => (starredGlance.value.length
  ? [...starredGlance.value]
  : slots.value.filter(s => s.chaos != null)
).sort((a, b) => (b.chaos ?? -1) - (a.chaos ?? -1)).slice(0, 4))

function toggleStar (key: string) {
  const stars = props.config.betrayalStars
  props.config.betrayalStars = stars.includes(key) ? stars.filter(k => k !== key) : [...stars, key]
}

const goals = computed(() => goalsFromStars(props.config.betrayalStars))
const betrayalAt = computed(() => props.config.betrayalAt ?? {})
const goalRows = computed(() => goals.value.map(g => {
  const now = betrayalAt.value[g.member]
  return { ...g, done: now === g.di, nowLabel: now == null ? 'where now?' : `now ${DIVISIONS[now]}` }
}))
const goalsDone = computed(() => goalRows.value.filter(g => g.done).length)
function setAt (member: string, di: number) {
  props.config.betrayalAt = { ...betrayalAt.value, [member]: di }
}
const metMember = shallowRef<string>(MEMBERS[0])
const metAdvice = computed(() => adviceFor(metMember.value, goals.value, betrayalAt.value))
const ADVICE_CLASS: Record<AdviceKind, string> = { move: 'w-accent', keep: 'w-up', execute: 'w-down', any: 'w-dim' }

function boardMatch (member: string, div: string, reward: string) {
  const q = boardQuery.value.trim().toLowerCase()
  if (!q) return true
  return member.toLowerCase().includes(q) || div.toLowerCase().includes(q) || reward.toLowerCase().includes(q)
}
</script>

<style module>
.glanceBtr { grid-template-columns: minmax(0, 1fr) 64px; }
.pad { padding: 4px var(--w-pad) 8px; }
.goal { display: flex; align-items: center; gap: 6px; padding: 3px var(--w-pad); font-size: var(--w-fs-md); }
.goal > :first-child { flex: 1; min-width: 0; }
.where { display: inline-flex; gap: 2px; }
.whereBtn {
  width: 20px;
  height: 20px;
  font-size: var(--w-fs-xs);
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line);
  color: var(--w-dim);
  background: var(--w-panel-2);
}
.whereOn { color: var(--w-accent-fg); background: var(--w-accent); border-color: var(--w-accent); }
.chips { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px var(--w-pad) 8px; }
.split {
  display: grid;
  grid-template-columns: 52px minmax(0, 1.3fr) minmax(0, 1fr);
  min-height: 0;
  height: 60vh;
  max-height: 30rem;
}
.rail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 4px;
  border-right: 1px solid var(--w-line);
}
.railBtn {
  position: relative;
  width: 42px;
  min-height: 38px;
  display: grid;
  place-items: center;
  gap: 1px;
  padding: 3px 0;
  border-radius: var(--w-r-sm);
  color: var(--w-dim);
  font-size: var(--w-fs-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
}
.railBtn > i:first-child { font-size: var(--w-fs-lg); }
.railBtn:hover { color: var(--w-fg); background: var(--w-panel-3); }
.railOn { color: var(--w-accent); background: var(--w-accent-soft); }
.dot { position: absolute; top: 4px; right: 5px; width: 6px; height: 6px; border-radius: 50%; background: var(--w-up); }
.col { min-height: 0; }
.col + .col { border-left: 1px solid var(--w-line); }
.toolbar { display: flex; align-items: center; gap: 8px; padding: 8px var(--w-pad) 4px; }
.btrGrid { grid-template-columns: 22px 70px minmax(0, 1fr) 60px; }
.scarabGrid { grid-template-columns: minmax(0, 1fr) 64px; }
.tips {
  margin: 2px var(--w-pad) 10px;
  padding: 6px 10px 6px 24px;
  list-style: disc;
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  display: grid;
  gap: 4px;
}
.tips li::marker { color: var(--w-accent); }
.boardPanel { max-width: 70vw; }
.board {
  display: grid;
  grid-template-columns: 96px repeat(17, minmax(80px, 1fr));
  font-size: var(--w-fs-sm);
  overflow-x: auto;
}
.boardHead {
  padding: 6px 4px;
  text-align: center;
  font-family: var(--w-head);
  border-bottom: 1px solid var(--w-line);
  position: sticky;
  top: 0;
  background: var(--w-panel-2);
}
.boardDiv {
  padding: 6px 8px;
  color: var(--w-accent);
  font-family: var(--w-head);
  border-right: 1px solid var(--w-line);
  position: sticky;
  left: 0;
  background: var(--w-panel-2);
}
.cell {
  display: grid;
  gap: 2px;
  align-content: start;
  text-align: left;
  min-height: 56px;
  padding: 5px;
  border-right: 1px solid var(--w-line-soft);
  border-bottom: 1px solid var(--w-line-soft);
}
.cell:hover { background: var(--w-accent-soft); }
.cellOn { background: var(--w-accent-soft); box-shadow: inset 0 0 0 1px var(--w-line-strong); }
.cellDim { opacity: 0.28; }
</style>
