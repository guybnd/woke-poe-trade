<template>
  <Widget :config="mode === 'card' ? { ...config, anchor: cardAnchor } : config"
    :move-handles="mode === 'card' ? 'none' : 'corners'" :inline-edit="false" :readonly="true">
    <!-- Strictness and anything that needs you, behind one dock icon. -->
    <DockItem ref="dockRef" id="loot-filter" :art="dockArt" title="Loot filter" :show="dockShow"
      :badge="dockBadge" :tone="dockTone" :wm-id="config.wmId" card-width="22rem">
      <template #card>
        <div :class="$style.dock">
          <template v-if="config.neversink.on">
            <div class="flex items-center gap-2">
              <span>{{ LEVEL_NAMES[config.neversink.level] }}</span>
              <span class="w-faint text-xs">{{ config.strictAuto.on ? (config.strictAuto.paused ? 'auto paused' : 'auto') : 'manual' }}</span>
              <span class="grow" />
              <span class="w-faint text-xs w-num">NeverSink {{ config.neversink.version }}</span>
            </div>
            <div v-if="config.strictAuto.on" :class="$style.ladder">
              <div v-for="(step, i) in sortedLadder" :key="i" :class="{ [$style.stepOn]: step.level === config.neversink.level }">
                <b>{{ stepLabel(config.strictAuto.ladder, i) }}</b><span>{{ LEVEL_NAMES[step.level] }}</span>
              </div>
            </div>
            <div v-if="config.looserHotkey || config.stricterHotkey" class="flex items-center gap-1 text-xs w-dim">
              <WKbd v-if="config.looserHotkey" :keys="config.looserHotkey" /><WKbd v-if="config.stricterHotkey" :keys="config.stricterHotkey" /> looser / stricter
            </div>
          </template>
          <div v-for="n in dockNotes" :key="n.text" class="text-xs" :style="n.warn ? 'color: var(--w-warn)' : ''">{{ n.text }}</div>
          <div v-if="config.editorHotkey" class="w-faint text-xs">Open the editor with <WKbd :keys="config.editorHotkey" /></div>
        </div>
      </template>
    </DockItem>
    <template v-if="mode === 'card'">
      <SampleCard v-if="sample && match" :store="store" :config="config" :facts="sample" :match="match" :area-level="effectiveAreaLevel"
        @close="close" @open-editor="openEditorFromCard" @area-level="areaOverride = $event" />
      <WPanel v-else title="Filter rule for this item" icon="wisdom" width="24rem" :resizable="false">
        <template #actions><button class="w-icon-btn" title="Close" @click="close"><i class="fas fa-times" /></button></template>
        <template v-if="store.error.value" #banner>
          <WBanner>{{ store.error.value }}<template #actions><WButton size="sm" @click="retry">Retry</WButton></template></WBanner>
        </template>
        <WSkeleton v-if="store.loading.value" :rows="3" />
        <WEmpty v-else-if="!store.error.value" :art="{ item: 'Orb of Scouring' }">
          No filter picked yet. Open the editor and choose your NeverSink filter.
        </WEmpty>
        <template #footer><WButton size="sm" variant="primary" @click="mode = 'editor'">Open editor</WButton></template>
      </WPanel>
    </template>
    <FilterEditor v-else :store="store" :config="config" :focus="focus" @close="close" />
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { LOOT_FILTER_TYPE } from './widget'

export default {
  widget: {
    type: LOOT_FILTER_TYPE,
    instances: 'multi',
    trNameKey: 'Loot filter'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { computed, inject, onUnmounted, ref, shallowRef, watch } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { parseClipboard } from '@/parser'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WEmpty, WButton, WBanner, WSkeleton, WKbd, gameIcon, toast } from '../ui'
import DockItem from '../dock/DockItem.vue'
import { LEVEL_NAMES, LEVEL_SHORT, stepLabel } from './strictness'
import SampleCard from './SampleCard.vue'
import FilterEditor from './FilterEditor.vue'
import { useLootFilter } from './store'
import { pressedKeys, sortKeys } from './hotkey-match'
import { itemFacts } from './item-facts'
import type { ItemFacts } from './item-facts'
import { matchItem } from './match'
import { LOOT_FILTER_SAMPLE_TARGET, initLootFilterWidget, normalizeLootFilterWidget, parseEditorHotkeyTarget, parseStrictnessTarget } from './widget'
import type { LootFilterWidget } from './widget'

const props = defineProps<{
  config: LootFilterWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  initLootFilterWidget(props.config)
  wm.show(props.config.wmId)
}
normalizeLootFilterWidget(props.config)
// Left over if the app closed while the sample card was open.
if (props.config.wmZorder === 'exclusive') props.config.wmZorder = null
props.config.wmFlags = props.config.wmFlags.filter(f => f !== 'hide-on-blur')
// Settings can swap in a whole new config object; fill in any new fields.
watch(() => props.config, (c) => normalizeLootFilterWidget(c))

const store = useLootFilter(() => props.config)
const mode = ref<'card' | 'editor'>('editor')
const sample = shallowRef<ItemFacts | null>(null)
const samplePosition = shallowRef({ x: 1, y: 1 })
const focus = shallowRef<{ type: string, tier: string } | null>(null)
const areaOverride = ref<number | null>(null)

// The card shows alone, not with every open panel, and closes when you go back
// to the game. The editor is an ordinary window.
watch(mode, (m) => {
  const w = props.config
  wm.setFlag(w.wmId, 'hide-on-blur', m === 'card')
  if (m === 'card') {
    w.wmZorder = 'exclusive'
  } else if (w.wmZorder === 'exclusive') {
    w.wmZorder = null
    if (w.wmWants === 'show') wm.bringToTop(w.wmId)
  }
}, { flush: 'sync' })

const effectiveAreaLevel = computed(() => areaOverride.value ?? store.areaLevel.value ?? props.config.fallbackAreaLevel)

const match = computed(() => {
  const doc = store.doc.value
  if (!doc || !sample.value) return null
  return matchItem(doc, { ...sample.value, areaLevel: effectiveAreaLevel.value })
})

// One load at a time: store.loading only turns on after listFiles resolves.
let loading: Promise<void> | null = null
function ensureLoaded () {
  if (store.doc.value || store.loading.value || loading) return loading
  loading = (async () => {
    try {
      await store.listFiles()
      await store.load()
    } finally {
      loading = null
    }
  })()
  return loading
}
// Never set up: read nothing until it's first used, so an overlay you haven't
// touched stays quiet.
if (props.config.sourceName || props.config.neversink.on || props.config.wmWants === 'show') ensureLoaded()

async function retry () {
  await store.listFiles()
  await store.load()
}

const itemEvents = MainProcess.onEvent('MAIN->CLIENT::item-text', (e) => {
  if (e.target !== LOOT_FILTER_SAMPLE_TARGET) return
  samplePosition.value = e.position
  const parsed = parseClipboard(e.clipboard).unwrapOr(null)
  sample.value = itemFacts(e.clipboard, parsed)
  areaOverride.value = null
  mode.value = 'card'
  wm.show(props.config.wmId)
  ensureLoaded()
})

const itemFailed = MainProcess.onEvent('MAIN->CLIENT::item-text-failed', (e) => {
  if (e.target === LOOT_FILTER_SAMPLE_TARGET) toast('The game gave no item text for what is under the mouse.')
})

// Hotkeys only reach the game while it has focus: say so instead of nothing.
function onOverlayKey (e: KeyboardEvent) {
  const key = props.config.sampleHotkey
  if (!key || e.repeat || props.config.wmWants !== 'show') return
  // Typing or recording a hotkey somewhere in the overlay, not trying to sample.
  const t = e.target as HTMLElement | null
  if (t?.closest?.('input, textarea, select, [contenteditable]')) return
  if (pressedKeys(e) === sortKeys(key)) toast(`Click into the game first, hover the item, then press ${key}.`)
}
window.addEventListener('keydown', onOverlayKey)

const hotkeys = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  const step = parseStrictnessTarget(e.target)
  if (step && step.wmId === props.config.wmId) {
    store.stepLevel(step.dir === 'stricter' ? 1 : -1).catch(() => {})
    return
  }
  if (parseEditorHotkeyTarget(e.target) !== props.config.wmId) return
  if (props.config.wmWants === 'show' && mode.value === 'editor') {
    wm.hide(props.config.wmId)
    return
  }
  mode.value = 'editor'
  wm.show(props.config.wmId)
  ensureLoaded()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onOverlayKey)
  itemFailed.abort()
  itemEvents.abort()
  hotkeys.abort()
})

function close () {
  wm.hide(props.config.wmId)
}

function openEditorFromCard (at?: { type: string, tier: string }) {
  const b = match.value?.final?.block
  focus.value = at ?? (b?.type && b.tier ? { type: b.type, tier: b.tier } : null)
  mode.value = 'editor'
}

// ---- dock icon ----

const dockRef = shallowRef<InstanceType<typeof DockItem> | null>(null)
const dockArt = computed(() => gameIcon('Orb of Scouring', 'ITEM'))
const sortedLadder = computed(() => [...props.config.strictAuto.ladder].sort((a, b) => a.from - b.from))
const dockNotes = computed(() => {
  const out: Array<{ text: string, warn?: boolean }> = []
  const ready = store.updateReady.value
  if (ready) out.push({ text: `NeverSink ${ready.version} is ready: ${ready.ok} of ${ready.total} changes fit. Update in the editor.` })
  const moves = store.plan.value?.moves.length ?? 0
  if (moves) out.push({ text: `${moves} item${moves > 1 ? 's' : ''} would move to match today's prices.` })
  if (store.safetyCount.value) out.push({ text: `Safety net shows ${store.safetyCount.value} valuable item${store.safetyCount.value > 1 ? 's' : ''} the filter hides.` })
  if (store.gameFilter.value.loaded === false) out.push({ text: 'The game couldn\'t load your filter. Open the editor and save again.', warn: true })
  else if (store.wrongFilterInGame.value) out.push({ text: `The game is using "${store.gameFilter.value.name}", not your saved copy.`, warn: true })
  if (store.failed.value.length) out.push({ text: `${store.failed.value.length} change(s) need a new home after a NeverSink update.`, warn: true })
  if (store.pendingReload.value) out.push({ text: 'Saved. Reloads when you\'re next in town or your hideout.' })
  return out
})
const dockShow = computed(() => Boolean(store.doc.value) && (props.config.neversink.on || dockNotes.value.length > 0))
const dockBadge = computed(() => props.config.neversink.on ? LEVEL_SHORT[props.config.neversink.level] : (dockNotes.value.length || null))
const dockTone = computed(() => dockNotes.value.some(n => n.warn) ? 'warn' : (store.updateReady.value ? 'accent' : undefined))

// Say it briefly when the strictness changes.
watch(() => props.config.neversink.level, (l, old) => {
  if (old != null && l !== old) dockRef.value?.peek(LEVEL_NAMES[l])
})

// The card is a one-off; showing the widget again from the menu opens the editor.
watch(() => props.config.wmWants, (wants) => {
  if (wants === 'hide') mode.value = 'editor'
  else ensureLoaded()
})

// Same placement as APT's item info: next to the stash or inventory panel,
// on the side away from the hovered item.
const cardAnchor = computed(() => {
  const width = wm.size.value.width
  const poePanelWidth = wm.poePanelWidth.value
  const side = samplePosition.value.x > (window.screenX + width / 2) ? 'inventory' : 'stash'
  return {
    pos: side === 'stash' ? 'cl' : 'cr',
    y: 50,
    x: side === 'stash'
      ? (poePanelWidth / width) * 100
      : ((width - poePanelWidth) / width) * 100
  }
})
</script>

<style module>
.dock {
  padding: 6px var(--w-pad) 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ladder {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 3px;
  font-size: var(--w-fs-xs);
}
.ladder div {
  display: flex;
  flex-direction: column;
  border-top: 3px solid var(--w-line);
  padding-top: 2px;
  color: var(--w-dim);
}
.ladder b { font-weight: 600; }
.stepOn {
  border-color: var(--w-accent) !important;
  color: var(--w-fg) !important;
}
</style>
