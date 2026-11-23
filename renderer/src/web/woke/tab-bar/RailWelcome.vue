<template>
  <welcome-card v-if="cardOn && cardPos" :pos="cardPos" @done="endCard" @net-worth="netWorth" />
  <template v-if="labelsOn">
    <div v-for="l in labels" :key="l.text" data-rail-label :class="[$style.label, { [$style.left]: l.left, [$style.flat]: flat }]"
      :style="{ left: `${l.x}px`, top: `${l.y}px` }">
      {{ l.text }}<w-kbd v-if="l.keys" :keys="l.keys" />
    </div>
  </template>
</template>

<script setup lang="ts">
// First-run help beside the rail (welcome.ts): the welcome card on the first
// open after setup, then the rail's buttons named for a few opens. Loaded
// only while there's some to show, so it costs nothing at startup after that.
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { AppConfig, saveConfigQuietly } from '@/web/Config'
import { WKbd } from '../ui'
import { openSettingsPage } from '../dock/dock'
import { SEARCH_TYPE } from '../search/widget'
import WelcomeCard from './WelcomeCard.vue'
import { ICON_TOOL_NAMES } from './tools'
import { dismissWelcome, labelsShown, welcomePhase } from './welcome'

const props = defineProps<{
  rail: HTMLElement | null
  flat: boolean
  onRight: boolean
  // A rail popup is up (hides the card and labels).
  busy: boolean
  // Also a hover tip or a dragged icon (hides the labels only).
  labelsBusy: boolean
  // A tool window is open (not Settings or search).
  toolOpen: boolean
  // Changes when the rail moves or resizes.
  layout: unknown
}>()

const wm = inject<WidgetManager>('wm')!

const state = computed(() => AppConfig().woke?.welcome)
const phase = computed(() => welcomePhase(state.value))
const exclusiveUp = computed(() => wm.widgets.value.some(w => w.wmZorder === 'exclusive' && w.wmWants === 'show'))
const cardOn = computed(() => wm.active.value && phase.value === 'card' && !exclusiveUp.value && !props.busy)
// Not on the open the card was on: the labels start with the next one.
const cardThisOpen = ref(false)
const labelsOn = computed(() => wm.active.value && phase.value === 'labels' && !cardThisOpen.value && !exclusiveUp.value && !props.labelsBusy)
const cardPos = ref<Record<string, string> | null>(null)
const labels = ref<Array<{ text: string, keys: string | null, x: number, y: number, left: boolean }>>([])
let labelsSeen = false

const CARD_W = 380
const TIP_ROOM = 100

function placeCard () {
  const r = props.rail?.getBoundingClientRect()
  if (!r?.width) { cardPos.value = null; return }
  if (props.flat) {
    const below = r.top < window.innerHeight / 2
    const left = Math.max(8, Math.min(window.innerWidth - CARD_W - 8, r.left))
    cardPos.value = below ? { left: `${left}px`, top: `${r.bottom + 8}px` } : { left: `${left}px`, bottom: `${window.innerHeight - r.top + 8}px` }
    return
  }
  const left = props.onRight ? Math.max(8, r.left - CARD_W - 8) : Math.min(window.innerWidth - CARD_W - 8, r.right + 8)
  // A rail low on the screen: the card grows up from its foot instead, so Got it stays on screen.
  cardPos.value = r.top > window.innerHeight / 2
    ? { left: `${left}px`, bottom: `${Math.max(8, window.innerHeight - r.bottom)}px` }
    : { left: `${left}px`, top: `${Math.max(8, r.top)}px` }
}

function placeLabels () {
  const rail = props.rail
  const r = rail?.getBoundingClientRect()
  if (!rail || !r?.width) { labels.value = []; return }
  const search = AppConfig().widgets.find(w => w.wmType === SEARCH_TYPE) as { hotkey?: string | null } | undefined
  const wanted: Array<{ label: string, text: string, keys: string | null }> = [
    { label: 'All tools', text: 'All tools', keys: null },
    { label: ICON_TOOL_NAMES.settings, text: 'Settings', keys: null },
    { label: ICON_TOOL_NAMES['item-search'], text: 'Search', keys: search?.hotkey ?? null }
  ]
  const out: typeof labels.value = []
  for (const w of wanted) {
    const b = rail.querySelector<HTMLElement>(`button[aria-label="${w.label}"]`)?.getBoundingClientRect()
    if (!b?.width) continue
    if (props.flat) {
      const below = r.top < window.innerHeight / 2
      const x = Math.max(TIP_ROOM, Math.min(window.innerWidth - TIP_ROOM, b.left + b.width / 2))
      out.push({ text: w.text, keys: w.keys, left: !below, x, y: below ? r.bottom + 18 + out.length * 30 : r.top - 18 - out.length * 30 })
    } else {
      out.push({ text: w.text, keys: w.keys, left: props.onRight, x: props.onRight ? r.left - 6 : r.right + 6, y: b.top + b.height / 2 })
    }
  }
  labels.value = out
}

function place () {
  if (cardOn.value) placeCard()
  if (labelsOn.value) placeLabels()
}

watch([cardOn, labelsOn, () => props.flat, () => props.onRight, () => props.layout], () => {
  // After the rail has been laid out where it is now.
  nextTick(() => {
    if (cardOn.value) cardThisOpen.value = true
    if (labelsOn.value) labelsSeen = true
    place()
  })
}, { immediate: true, deep: true })

watch(() => wm.active.value, active => {
  if (active) return
  cardThisOpen.value = false
  if (!labelsSeen) return
  labelsSeen = false
  labelsShown(state.value)
})
window.addEventListener('resize', place)
onBeforeUnmount(() => { window.removeEventListener('resize', place) })

// Opening a tool from the overlay means they've found their way: the card is
// done. Not a window a hotkey opened during play, before they saw the card.
watch(() => props.toolOpen, open => {
  if (open && wm.active.value && cardOn.value) endCard()
})

// Saved now: an open Settings window holds back the usual save until it closes.
function endCard () {
  dismissWelcome(state.value)
  saveConfigQuietly()
}
function netWorth () {
  endCard()
  openSettingsPage(wm, 'All modules')
}
</script>

<style module>
/* The rail's hover tip, held open. */
.label {
  position: fixed;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: var(--w-s2);
  padding: 4px 10px;
  transform: translateY(-50%);
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line-strong);
  background: var(--w-tip-bg);
  color: var(--w-fg);
  font-family: var(--w-head);
  font-size: var(--w-fs-lg);
  letter-spacing: var(--w-head-track);
  white-space: nowrap;
  pointer-events: none;
}
.left { transform: translate(-100%, -50%); }
.flat { transform: translate(-50%, -50%); }
</style>
