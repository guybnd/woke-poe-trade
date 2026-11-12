<template>
  <div :class="$style.picker">
    <WSkeleton v-if="loading" :rows="5" />
    <WEmpty v-else-if="!list" icon="fas fa-layer-group">
      {{ failed }}
      <template #actions><WButton size="sm" @click="load">Try again</WButton></template>
    </WEmpty>
    <template v-else>
      <div :class="$style.head">
        <span :class="$style.caps">Tabs to read</span>
        <span class="w-dim text-xs">{{ list.league }}</span>
      </div>
      <div :class="$style.chips">
        <WChip v-for="t in TEMPLATES" :key="t" clickable :active="isPicked({ kind: 'template', template: t })" :title="TEMPLATE_HINT[t]" @click="pick({ kind: 'template', template: t })">
          {{ TEMPLATE_LABEL[t] }}
        </WChip>
        <WChip v-for="s in list.sets" :key="'set:' + s.name" clickable :active="isPicked({ kind: 'set', name: s.name })" @click="pick({ kind: 'set', name: s.name })">
          {{ s.name }}<i class="fas fa-times" :class="$style.del" :title="`Delete ${s.name}`" @click.stop="removeSet(s.name)" />
        </WChip>
        <WChip v-if="picked.kind === 'custom'" active>Your ticks</WChip>
      </div>
      <div :class="$style.tools">
        <WField v-model="query" type="search" icon="fas fa-search" placeholder="Find a tab" />
        <WSelect v-model="kind" :options="KIND_OPTIONS" />
      </div>
      <ul :class="$style.list">
        <li v-for="t in shown" :key="t.id">
          <label :class="$style.row">
            <input type="checkbox" :checked="ticked.has(t.id)" @change="tick(t.id, ($event.target as HTMLInputElement).checked)">
            <span :class="$style.swatch" :style="{ background: t.colour ?? 'transparent' }" />
            <span class="w-trunc">{{ t.name || `Tab ${t.index + 1}` }}</span>
            <span class="w-dim text-xs">{{ typeLabel(t.type) }}</span>
          </label>
        </li>
        <li v-if="!shown.length" class="w-dim text-xs" :class="$style.none">No tabs match.</li>
      </ul>
      <div :class="$style.save">
        <WField v-model="setName" placeholder="Name these ticks to save them (saves and picks them)" />
        <WButton size="sm" :disabled="!setName.trim() || !ticked.size || busy" @click="saveAsSet">Save set</WButton>
      </div>
      <div :class="$style.foot">
        <span class="w-dim text-xs">{{ ticked.size }} of {{ list.tabs.length }} tabs<template v-if="removeOnly"> · {{ removeOnly }} remove-only left out</template></span>
        <span :class="$style.btns">
          <WButton v-if="canCancel" size="sm" variant="ghost" :disabled="busy" @click="emit('done')">Cancel</WButton>
          <WButton size="sm" variant="primary" :disabled="!ticked.size || busy || running" :title="running ? 'Wait for the read under way to finish' : undefined" @click="readThese">Read these tabs</WButton>
        </span>
      </div>
      <WBanner v-if="error" tone="error">{{ error }}</WBanner>
    </template>
  </div>
</template>

<script setup lang="ts">
// Which tabs the reader reads (picks L1, T1-T4, F1, N1): a template, a saved
// set or your own ticks. Shown before a league's first read, then from the
// window's tab button.
import { computed, onMounted, shallowRef } from 'vue'
import { WBanner, WButton, WChip, WEmpty, WField, WSelect, WSkeleton } from '../ui'
import { hostRequest } from '../shared/host'
import {
  KIND_OPTIONS, TEMPLATE_HINT, TEMPLATE_LABEL, choiceOf, shownTabs, startingPick, ticksFor, typeLabel
} from './tab-picker'
import type { Picked, SavedSet, TabChoice, TabKind, TabList, TabTemplate } from './tab-picker'

const props = defineProps<{ canCancel: boolean, removeOnly: number, running: boolean }>()
const emit = defineEmits<{ (e: 'done'): void }>()

const TEMPLATES: TabTemplate[] = ['reasonable', 'currency', 'league']

const list = shallowRef<TabList | null>(null)
const loading = shallowRef(true)
const failed = shallowRef('')
const picked = shallowRef<Picked>({ kind: 'template', template: 'reasonable' })
const ticked = shallowRef(new Set<string>())
const query = shallowRef('')
const kind = shallowRef<TabKind>('all')
const setName = shallowRef('')
const busy = shallowRef(false)
const error = shallowRef<string | null>(null)

const shown = computed(() => list.value ? shownTabs(list.value.tabs, query.value, kind.value, ticked.value) : [])
const removeOnly = computed(() => props.removeOnly)

async function load () {
  loading.value = true
  failed.value = ''
  try {
    const r = await hostRequest<TabList | { error: string } | null>('stash-tab-list', null, 5 * 60_000)
    const l = r && !('error' in r) ? r : null
    if (!l) failed.value = r && 'error' in r ? r.error : "Couldn't get your tab list."
    list.value = l
    if (l) ({ picked: picked.value, ticked: ticked.value } = startingPick(l))
  } catch {
    failed.value = "Couldn't get your tab list."
  } finally {
    loading.value = false
  }
}
onMounted(load)

function isPicked (p: Picked) {
  const c = picked.value
  return c.kind === p.kind && (c.kind !== 'template' || p.kind !== 'template' || c.template === p.template) &&
    (c.kind !== 'set' || p.kind !== 'set' || c.name === p.name)
}

function pick (p: Picked) {
  if (!list.value) return
  picked.value = p
  ticked.value = ticksFor(list.value, p, ticked.value)
}

// Ticking by hand makes it your own list: it no longer follows a template.
function tick (id: string, on: boolean) {
  const next = new Set(ticked.value)
  if (on) next.add(id)
  else next.delete(id)
  ticked.value = next
  picked.value = { kind: 'custom' }
}

async function run (fn: () => Promise<void>) {
  busy.value = true
  error.value = null
  try { await fn() } catch { error.value = "Couldn't save that. Try again." } finally { busy.value = false }
}

function takeSets (r: { sets: SavedSet[], choice: TabChoice | null } | null) {
  if (!r) throw new Error('league changed')
  if (list.value) list.value = { ...list.value, sets: r.sets, choice: r.choice }
}

function saveAsSet () {
  const name = setName.value.trim().slice(0, 40)
  const ids = [...ticked.value]
  const league = list.value?.league
  run(async () => {
    takeSets(await hostRequest('stash-tab-set-save', { league, name, ids }))
    picked.value = { kind: 'set', name }
    setName.value = ''
  }).catch(() => {})
}

function removeSet (name: string) {
  run(async () => {
    takeSets(await hostRequest('stash-tab-set-delete', { league: list.value?.league, name }))
    if (picked.value.kind === 'set' && picked.value.name === name) picked.value = { kind: 'custom' }
  }).catch(() => {})
}

function readThese () {
  const l = list.value
  if (!l) return
  run(async () => {
    const saved = await hostRequest('stash-tab-choice', { league: l.league, ...choiceOf(picked.value, ticked.value, l.tabs) })
    if (!saved) throw new Error('league changed')
    hostRequest('stash-reader-read', null, 15 * 60_000).catch(() => {})
    emit('done')
  }).catch(() => {})
}
</script>

<style module>
.picker { display: flex; flex-direction: column; gap: var(--w-s2); padding: var(--w-s2) var(--w-pad); }
.head { display: flex; justify-content: space-between; align-items: baseline; }
.caps { font-family: var(--w-caps-face); text-transform: var(--w-caps-case); font-size: var(--w-fs-caps); color: var(--w-dim); }
.chips { display: flex; flex-wrap: wrap; gap: var(--w-s1); }
.del { margin-left: 6px; opacity: .6; }
.del:hover { opacity: 1; }
.tools { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--w-s1); }
.list { list-style: none; margin: 0; padding: 0; max-height: 40vh; overflow-y: auto; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); }
.row { display: grid; grid-template-columns: auto 10px minmax(0, 1fr) auto; gap: var(--w-s2); align-items: center; padding: 4px var(--w-s2); cursor: pointer; font-size: var(--w-fs-sm); }
.row:hover { background: var(--w-panel-2); }
.swatch { width: 10px; height: 10px; border-radius: 2px; border: 1px solid var(--w-line-strong); }
.none { padding: var(--w-s2); }
.save { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--w-s1); }
.foot { display: flex; justify-content: space-between; align-items: center; gap: var(--w-s2); }
.btns { display: flex; gap: var(--w-s1); }
</style>
