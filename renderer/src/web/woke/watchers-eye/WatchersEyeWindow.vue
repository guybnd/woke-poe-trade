<template>
  <WPanel size-key="watchers-eye" title="Watcher's Eye finder" :icon="itemArt({ name: WATCHERS_EYE }) ?? undefined" width="34rem" max-height="80vh">
    <div :class="$style.wrap" data-qa="watchers-eye">
      <div :class="$style.row">
        <span :class="$style.dim" class="w-trunc" data-qa="we-source">{{ sourceLabel }}</span>
        <span :class="$style.saves">
          <WSelect v-if="config.saved.length" :model-value="''" :options="savedOptions" data-qa="we-saved" title="Load a saved setup"
            @update:model-value="loadSaved($event)" />
          <input v-if="naming" ref="nameBox" v-model="saveName" class="w-input" :class="$style.nameInput" placeholder="Name it…" aria-label="Setup name" data-qa="we-save-name"
            @keydown.enter.prevent="saveSetup" @keydown.esc.stop="naming = false" @blur="saveSetup">
          <WButton v-else size="sm" variant="ghost" icon="fas fa-save" :disabled="!shown.size" data-qa="we-save"
            title="Save these auras and picks to look at again" @click="startSave">Save</WButton>
          <WButton v-if="current" size="sm" variant="ghost" icon="fas fa-trash" :title="`Remove ${current}`" data-qa="we-remove-saved" @click="removeSaved" />
        </span>
        <WInfo text="Pick the auras you run, then the mods you want on your Watcher's Eye.
- Auras in your **PoB build** start ticked. Click a chip to drop it.
- **Add aura**: type to pick another; your build's come first.
- **Save** keeps the auras and picks under a name; load one from the list next to it.
- A mod matches **any roll**. Type a number to ask for at least that roll.
- **Price check** runs one trade search for a jewel with all your picks.
- With 3 or more picks, **Any 2** finds jewels with some of them, on the trade site." />
      </div>

      <div :class="$style.chips" data-qa="we-auras">
        <WChip v-for="a in shownList" :key="a" clickable active v-item-tip="{ name: a }" data-item-tip
          :data-qa="`we-aura-${a}`" :title="`Remove ${a}`" @click="toggleAura(a)">
          <WIcon :src="itemArt({ name: a }) ?? undefined" fallback="fas fa-circle" size="sm" />{{ a }}<span v-if="fromBuild.has(a)" :class="$style.pob" title="In your PoB build">PoB</span><i class="fas fa-times" :class="$style.x" />
        </WChip>
        <div :class="$style.add" @focusout="onAddBlur">
          <input v-model="addText" class="w-input" :class="$style.addInput" placeholder="Add aura…" aria-label="Add aura" data-qa="we-add-aura"
            @focus="addOpen = true" @input="addOpen = true; addAt = 0" @keydown.down.prevent="moveAdd(1)" @keydown.up.prevent="moveAdd(-1)"
            @keydown.enter.prevent="pickAdd(addList[addAt])" @keydown.esc.stop="addOpen = false">
          <div v-if="addOpen && addList.length" :class="$style.drop" role="listbox" data-qa="we-add-list">
            <button v-for="(a, i) in addList" :key="a" type="button" role="option" :aria-selected="i === addAt" tabindex="-1"
              :class="[$style.opt, { [$style.optOn]: i === addAt }]" v-item-tip="{ name: a }" data-item-tip :data-qa="`we-add-${a}`"
              @mousedown.prevent @mouseenter="addAt = i" @click="pickAdd(a)">
              <WIcon :src="itemArt({ name: a }) ?? undefined" fallback="fas fa-circle" size="sm" /><span>{{ a }}</span>
              <span v-if="fromBuild.has(a)" :class="$style.pob">In your build</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="!mods.length" :class="$style.dim">{{ loadNote }}</div>
      <div v-else-if="!groups.length" :class="$style.dim">Add an aura to see its mods.</div>

      <section v-for="g in groups" :key="g.aura" :ref="el => groupRef(g.aura, el)" :class="$style.sec" data-qa="we-group">
        <div :class="$style.head">
          <WIcon :src="itemArt({ name: g.aura }) ?? undefined" fallback="fas fa-circle" size="sm" />
          <span v-item-tip="{ name: g.aura }" data-item-tip>{{ g.aura }}</span>
          <span :class="$style.count">{{ g.mods.length }}</span>
        </div>
        <div v-for="m in g.mods" :key="m.id" :class="[$style.mrow, { [$style.on]: picked(m), [$style.focus]: marked === m.id }]"
          role="checkbox" :aria-checked="picked(m)" tabindex="0" data-qa="we-mod"
          @click="toggle(m)" @keydown.enter.prevent="toggle(m)" @keydown.space.prevent="toggle(m)">
          <span :class="$style.box" />
          <span v-mod-tip="modTip(m)" :class="$style.line">{{ m.line }}</span>
          <input v-if="picked(m) && m.tunable" :class="$style.min" class="w-input w-num" inputmode="decimal" :placeholder="`${m.ranges[0].lo}+`"
            :value="minOf(m) ?? ''" :title="`At least this roll (${m.ranges[0].lo} to ${m.ranges[0].hi}). Empty: any roll.`" data-qa="we-min"
            @click.stop @keydown.stop @change="setMin(m, ($event.target as HTMLInputElement).value)">
        </div>
      </section>
    </div>
    <template #footer>
      <div :class="$style.bar" data-qa="we-bar">
        <span :class="$style.dim">{{ active.length ? `${active.length} picked` : 'Pick mods to search' }}</span>
        <WSelect v-if="active.length >= 3" :model-value="String(config.atLeast ?? 'all')" :options="matchOptions" data-qa="we-match"
          @update:model-value="config.atLeast = $event === 'all' ? null : Number($event)" />
        <WButton size="sm" variant="ghost" :disabled="!active.length" @click="clearPicks">Clear</WButton>
        <span :class="$style.end" />
        <WButton size="sm" icon="fas fa-external-link-alt" :disabled="!active.length" data-qa="we-trade"
          title="Opens the trade site with these mods. No search from the app." @click="openTrade">Trade site</WButton>
        <WButton size="sm" variant="primary" :disabled="!active.length || anyOf" data-qa="we-price"
          :title="anyOf ? 'Any of: the price check searches all picks. Use Trade site.' : 'One trade search for a Watcher\'s Eye with all picked mods'"
          @click="priceCheck">Price check</WButton>
      </div>
    </template>
  </WPanel>
</template>

<script setup lang="ts">
// The Watcher's Eye finder: tick your auras (the PoB build's start ticked),
// see every mod Watcher's Eye can roll for them, pick some, and price a jewel
// with them, in the price check or on the trade site.
import { computed, nextTick, shallowRef, watch } from 'vue'
import { ITEM_BY_REF } from '@/assets/data'
import { poeWebApi } from '@/web/Config'
import { useLeagues } from '@/web/background/Leagues'
import { WButton, WChip, WIcon, WInfo, WPanel, WSelect, itemArt, vItemTip } from '../ui'
import { vModTip } from '../ui/tooltip/mod-line-tip'
import type { ModLine } from '../ui/tooltip/mod-line-tip'
import { elementPoint, openPriceCheck } from '../ui/tooltip/item-price-check'
import { loadTipUniques } from '../ui/tooltip/item-tip'
import { priceCheckTradeStatus } from '../shared/trade-status'
import { useActiveBuild } from '../pob-builds/active'
import { loadoutOf } from '../pob-builds/build-model'
import { WATCHERS_EYE, WATCHERS_EYE_BASE, WE_AURAS, auraOfGem, byAura, clampMin, weItemText, weMods, weTradeQuery } from './mods'
import type { WeAura, WeMod } from './mods'
import { weStatId } from './trade'
import type { WatchersEyeWidget } from './widget'

const props = defineProps<{ config: WatchersEyeWidget }>()
const config = props.config

const leagues = useLeagues()
const active$ = useActiveBuild()

// ---- the mod list ----
const mods = shallowRef<WeMod[]>([])
const loadNote = shallowRef('Reading the mod list…')
loadTipUniques().then(u => {
  const v = u?.[WATCHERS_EYE]?.v ?? []
  mods.value = weMods(v.flatMap(r => r.e ?? []))
  if (!mods.value.length) loadNote.value = "Couldn't read Watcher's Eye's mods from the item data."
}).catch(() => { loadNote.value = "Couldn't read Watcher's Eye's mods from the item data." })

// ---- auras ----
const fromBuild = computed(() => {
  const d = active$.details.value
  const out = new Set<WeAura>()
  if (!d) return out
  const set = loadoutOf(d, active$.level.value, active$.act.value, active$.loadout.value).skillSet?.item
  for (const g of set?.groups ?? []) {
    if (!g.enabled) continue
    for (const gem of g.gems) {
      if (!gem.enabled || gem.support) continue
      const a = auraOfGem(gem.name)
      if (a) out.add(a)
    }
  }
  return out
})
const shown = computed(() => new Set<string>([
  ...[...fromBuild.value].filter(a => !config.offAuras.includes(a)),
  ...config.auras
]))
const sourceLabel = computed(() => {
  const path = active$.relPath.value
  if (!path) return 'No PoB build in use: add the auras you run.'
  const name = path.replace(/\.xml$/i, '').split(/[/\\]/).pop()
  if (!active$.details.value) return `Reading ${name}…`
  return fromBuild.value.size ? `${name}: ${[...fromBuild.value].join(', ')}` : `${name} runs no aura Watcher's Eye has mods for.`
})

function toggleAura (a: WeAura) {
  if (shown.value.has(a)) {
    config.auras = config.auras.filter(x => x !== a)
    if (fromBuild.value.has(a) && !config.offAuras.includes(a)) config.offAuras = [...config.offAuras, a]
  } else {
    config.offAuras = config.offAuras.filter(x => x !== a)
    if (!fromBuild.value.has(a)) config.auras = [...config.auras, a]
  }
}
function showAura (a: WeAura) {
  if (!shown.value.has(a)) toggleAura(a)
}

const groups = computed(() => byAura(mods.value, [...shown.value]))
const shownList = computed(() => WE_AURAS.filter(a => shown.value.has(a)))

// ---- the Add aura box: type to filter, your build's auras first ----
const addText = shallowRef('')
const addOpen = shallowRef(false)
const addAt = shallowRef(0)
const addList = computed(() => {
  const q = addText.value.trim().toLowerCase()
  const left = WE_AURAS.filter(a => !shown.value.has(a) && (!q || a.toLowerCase().split(' ').some(w => w.startsWith(q)) || a.toLowerCase().startsWith(q)))
  return [...left.filter(a => fromBuild.value.has(a)), ...left.filter(a => !fromBuild.value.has(a))]
})
function moveAdd (d: number) {
  addOpen.value = true
  const n = addList.value.length
  if (n) addAt.value = (addAt.value + d + n) % n
}
function pickAdd (a: WeAura | undefined) {
  if (!a) return
  showAura(a)
  addText.value = ''
  addAt.value = 0
}
function onAddBlur (e: FocusEvent) {
  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) addOpen.value = false
}

// ---- picks ----
const byId = computed(() => new Map(mods.value.map(m => [m.id, m])))
// Picks of auras still ticked, in list order.
const active = computed(() => config.picks.filter(p => { const m = byId.value.get(p.id); return m && shown.value.has(m.aura) }))
function picked (m: WeMod): boolean { return config.picks.some(p => p.id === m.id) }
function minOf (m: WeMod): number | null { return clampMin(m, config.picks.find(p => p.id === m.id)?.min) }
function toggle (m: WeMod) {
  config.picks = picked(m) ? config.picks.filter(p => p.id !== m.id) : [...config.picks, { id: m.id, min: null }]
}
function setMin (m: WeMod, raw: string) {
  const n = raw.trim() === '' ? null : Number(raw.replace(',', '.'))
  const min = clampMin(m, n)
  config.picks = config.picks.map(p => p.id === m.id ? { ...p, min } : p)
}
function clearPicks () {
  config.picks = config.picks.filter(p => !active.value.includes(p))
  config.atLeast = null
}
const anyOf = computed(() => config.atLeast != null && config.atLeast < active.value.length)
const matchOptions = computed(() => [
  { value: 'all', label: 'Has all' },
  ...Array.from({ length: active.value.length - 2 }, (_, i) => ({ value: String(i + 2), label: `Any ${i + 2}` }))
])
// A count no longer below the picks reads as "all".
watch(() => active.value.length, (n) => { if (config.atLeast != null && config.atLeast >= n) config.atLeast = null })

// ---- saved setups ----
const naming = shallowRef(false)
const saveName = shallowRef('')
const nameBox = shallowRef<HTMLInputElement | null>(null)
// The setup loaded or saved last, while nothing changed since.
const current = shallowRef<string | null>(null)
const savedOptions = computed(() => [
  { value: '', label: current.value ?? 'Saved…' },
  ...config.saved.map(s => ({ value: s.name, label: s.name }))
])
async function startSave () {
  saveName.value = current.value ?? ''
  naming.value = true
  await nextTick()
  nameBox.value?.focus()
  nameBox.value?.select()
}
function saveSetup () {
  if (!naming.value) return
  naming.value = false
  const name = saveName.value.trim()
  if (!name) return
  const entry = { name, auras: [...shownList.value], picks: active.value.map(p => ({ ...p })), atLeast: config.atLeast }
  config.saved = [...config.saved.filter(s => s.name !== name), entry].sort((a, b) => a.name.localeCompare(b.name))
  setCurrent(name)
}
function loadSaved (name: string) {
  const s = config.saved.find(s => s.name === name)
  if (!s) return
  const want = new Set(s.auras)
  config.auras = s.auras.filter(a => !fromBuild.value.has(a as WeAura))
  config.offAuras = [...fromBuild.value].filter(a => !want.has(a))
  config.picks = s.picks.map(p => ({ ...p }))
  config.atLeast = s.atLeast
  setCurrent(name)
}
function removeSaved () {
  config.saved = config.saved.filter(s => s.name !== current.value)
  current.value = null
}
// What the setup looks like when saved or loaded: a change after that drops the name.
let currentShape = ''
const shape = () => JSON.stringify([shownList.value, active.value, config.atLeast])
function setCurrent (name: string) { current.value = name; currentShape = shape() }
watch(shape, (now) => { if (current.value && now !== currentShape) current.value = null })

// ---- the row the search palette asked for ----
const sections = new Map<string, HTMLElement>()
function groupRef (aura: string, el: unknown) { if (el instanceof HTMLElement) sections.set(aura, el); else sections.delete(aura) }
const marked = shallowRef<string | null>(null)
watch([() => config.focus, mods], async ([focus]) => {
  if (!focus || !mods.value.length) return
  config.focus = null
  let aura: WeAura | null = null
  if (focus.startsWith('aura:')) {
    aura = (WE_AURAS as readonly string[]).includes(focus.slice(5)) ? focus.slice(5) as WeAura : null
  } else if (focus.startsWith('mod:')) {
    const m = byId.value.get(focus.slice(4))
    if (m) {
      aura = m.aura
      if (!picked(m)) toggle(m)
      marked.value = m.id
    }
  }
  if (!aura) return
  showAura(aura)
  await nextTick()
  sections.get(aura)?.scrollIntoView({ block: 'start' })
}, { immediate: true })

// ---- searching ----
const picksFor = () => active.value.map(p => ({ id: p.id, min: p.min ?? null }))

function priceCheck (e: MouseEvent) {
  openPriceCheck({ name: WATCHERS_EYE, text: weItemText(mods.value, picksFor()) }, elementPoint(e)).catch(() => {})
}

function openTrade () {
  const league = leagues.selectedId.value
  if (!league) return
  const q = weTradeQuery(mods.value, picksFor(), weStatId, { atLeast: config.atLeast, status: priceCheckTradeStatus().option })
  const host = poeWebApi()
  // The international site takes English names, a regional one its own.
  if (host !== 'www.pathofexile.com') {
    q.query.name = ITEM_BY_REF('UNIQUE', WATCHERS_EYE)?.[0]?.name ?? WATCHERS_EYE
    q.query.type = ITEM_BY_REF('ITEM', WATCHERS_EYE_BASE)?.[0]?.name ?? WATCHERS_EYE_BASE
  }
  window.open(`https://${host}/trade/search/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(q))}`)
}

// ---- tooltip ----
function modTip (m: WeMod): ModLine {
  return {
    head: `Watcher's Eye · ${m.aura}`,
    text: m.line,
    notes: [
      m.ranges.length ? `Rolls ${m.ranges.map(r => `${r.lo} to ${r.hi}`).join(', ')}.` : 'A fixed roll.',
      `Only while you have ${m.aura} up.`,
      weStatId(m) ? null : 'Not found on the trade site: left out of the trade search.'
    ]
  }
}
</script>

<style module>
.wrap { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; font-size: var(--w-fs-sm); }
.row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.saves { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; flex: none; }
.nameInput { width: 8rem; }
.end { margin-left: auto; }
.dim { color: var(--w-dim); }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chips :global(.w-chip) { display: inline-flex; align-items: center; gap: 4px; }
.pob { color: var(--w-gold-hi); font-size: 0.8em; margin-left: 2px; }
.x { font-size: 0.75em; opacity: 0.6; margin-left: 2px; }
.add { position: relative; }
.addInput { width: 9rem; }
.drop { position: absolute; z-index: 5; top: calc(100% + 2px); left: 0; min-width: 14rem; max-height: 16rem; overflow-y: auto; background: var(--w-panel-solid-base); border: 1px solid var(--w-frame, var(--w-line)); display: grid; padding: 2px 0; }
.opt { display: flex; align-items: center; gap: 6px; padding: 3px 8px; text-align: left; color: var(--w-fg); background: none; border: 0; cursor: pointer; }
.opt .pob { margin-left: auto; }
.optOn { background: var(--w-well); }
.sec { display: grid; gap: 1px; scroll-margin-top: 4px; }
.head { display: flex; align-items: center; gap: 6px; color: var(--w-label); border-bottom: 1px solid var(--w-line); padding-bottom: 2px; }
.count { color: var(--w-dim); font-size: 0.85em; }
.mrow { display: flex; align-items: center; gap: 8px; min-height: 24px; padding: 1px 4px; cursor: pointer; border-bottom: 1px solid var(--w-line-soft); }
.mrow:hover, .mrow:focus-visible { background: var(--w-well); outline: none; }
.mrow.on { background: var(--w-well); }
.mrow.focus { box-shadow: inset 2px 0 0 var(--w-gold-hi); }
.box { flex: none; width: 11px; height: 11px; border: 1px solid var(--w-chip-line, var(--w-line)); }
.mrow.on .box { background: var(--w-gold-hi); border-color: var(--w-gold-hi); }
.line { flex: 1 1 auto; min-width: 0; color: var(--w-r-magic, #8888ff); }
.min { flex: none; width: 3.5rem; text-align: right; }
.bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 6px var(--w-pad); }
</style>
