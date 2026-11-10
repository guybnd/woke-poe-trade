<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- Town and hideout: your hotkeyed strings at a glance. -->
    <DockItem :menu="dockMenu" id="regex-library" title="Regex library" :show="dockShow" :wm-id="config.wmId" card-width="20rem">
      <template #card>
        <div style="padding: 4px 0 6px;">
          <button v-for="e in glance" :key="e.id" type="button" class="w-row w-full text-left" style="grid-template-columns: minmax(0, 1fr) auto;"
            :title="effectiveText(e)" @click="stashSearch(effectiveText(e))">
            <span class="w-trunc">{{ e.name || effectiveText(e) }}</span>
            <WKbd v-if="e.hotkey && config.enableHotkeys" :keys="e.hotkey" />
          </button>
          <div class="w-faint text-xs" style="padding: 2px var(--w-pad);">Click to search your stash</div>
        </div>
      </template>
    </DockItem>
    <!-- One click listener for the panel's own buttons and every row's pencil and bin (data-act). -->
    <WPanel ref="panel" :title="config.wmTitle || 'Regex library'" icon="stash" width="22rem" max-height="70vh" @click="onAction">
      <template #toolbar>
        <WField v-model="filter" icon="fas fa-search" placeholder="Filter by name, tag, category…" class="grow" />
        <WButton size="sm" icon="fas fa-plus" title="Add a search string" data-qa="regex-new" data-act="new">New</WButton>
      </template>

      <RegexEntryForm v-if="editing === 'new'" :key="'new'" :entry="newDraft" @save="saveEntry" @cancel="editing = null" />

      <template v-for="group in groups" :key="group.category">
        <div class="w-group-label">{{ group.category }}</div>
        <template v-for="entry in group.entries" :key="entry.id">
        <RegexEntryForm v-if="editing === entry.id" :entry="entry" @save="saveEntry" @cancel="editing = null" />
        <WListItem v-else :class="$style.row" :title="tooltip(entry)" @select="stashSearch(effectiveText(entry))"
          @contextmenu="rowMenu($event, entry)" @keydown.c.ctrl.prevent="copy(entry)" @keydown.delete.prevent="remove(entry)">
          <span class="w-trunc">{{ entry.name || effectiveText(entry) }}</span>
          <WChip v-if="entry.negate && canNegate(entry.text)" title="Highlights items WITHOUT this">not</WChip>
          <WChip v-for="tag in entry.tags.slice(0, 2)" :key="tag">{{ tag }}</WChip>
          <span v-if="effectiveText(entry).length > MAX_SEARCH_LENGTH" class="w-down text-xs shrink-0" title="Too long: the game cuts the search off at 250 characters">{{ effectiveText(entry).length }}/{{ MAX_SEARCH_LENGTH }}</span>
          <WKbd v-if="entry.hotkey && config.enableHotkeys" :keys="entry.hotkey" class="ml-auto" />
          <template v-if="entry.name" #sub><span class="w-mono">{{ effectiveText(entry) }}</span></template>
          <template #actions>
            <button :class="$style.hoverOnly" class="w-icon-btn" title="Edit" data-qa="regex-edit" data-act="edit" :data-id="entry.id">
              <i class="fas fa-pen" />
            </button>
            <button :class="$style.hoverOnly" class="w-icon-btn" title="Remove (Undo for a moment after)" data-qa="regex-remove" data-act="remove" :data-id="entry.id">
              <i class="far fa-trash-alt" />
            </button>
            <button @click="copy(entry)" class="w-icon-btn" :class="{ 'w-up': copied === String(entry.id) }" title="Copy to clipboard">
              <i :class="copied === String(entry.id) ? 'fas fa-check' : 'far fa-copy'" />
            </button>
          </template>
        </WListItem>
        </template>
      </template>
      <WEmpty v-if="!groups.length && config.entries.length" icon="fas fa-filter">
        Nothing matches "{{ filter }}".
        <template #actions><WButton size="sm" @click="filter = ''">Clear search</WButton></template>
      </WEmpty>
      <WEmpty v-else-if="!groups.length && editing !== 'new'" :art="{ mechanic: 'stash' }">
        No saved searches yet. Add one, or build one on poe.re and save it from there.
        <template #actions>
          <WButton size="sm" icon="fas fa-plus" data-act="new">New</WButton>
          <WButton size="sm" data-act="poe-re">Open poe.re</WButton>
        </template>
      </WEmpty>

      <template #footer>
        <button type="button" class="ml-auto w-accent hover:underline" data-qa="regex-poe-re" title="Opens poe.re inside the app; save what you build straight to this list"
          data-act="poe-re">Generate on poe.re</button>
      </template>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { REGEX_LIBRARY_TYPE, starterEntries } from './widget'
import type { RegexLibraryWidget } from './widget'

export default {
  widget: {
    type: REGEX_LIBRARY_TYPE,
    instances: 'multi',
    trNameKey: 'Regex library',
    defaultInstances: (): RegexLibraryWidget[] => [{
      wmId: 0,
      wmType: REGEX_LIBRARY_TYPE,
      wmTitle: 'Regex library',
      wmWants: 'hide',
      wmZorder: null,
      wmFlags: ['invisible-on-blur'],
      anchor: popupAnchor(),
      enableHotkeys: true,
      entries: starterEntries()
    }]
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { inject, computed, watch, shallowRef, defineAsyncComponent } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { pushHostConfig, saveConfig } from '@/web/Config'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WField, WChip, WKbd, WEmpty, WListItem, WButton, openMenu, toast } from '../ui'
import { openPoeReWindow } from './poe-re'
import { useCopy } from '../ui/copy'
import { MAX_SEARCH_LENGTH, canNegate, effectiveText, emptyEntry, groupByCategory, matchesFilter } from './widget'
import type { RegexEntry } from './widget'
import DockItem from '../dock/DockItem.vue'
import { saveDock } from '../dock/dock'
import type { DockMenuAction } from '../dock/dock'
import { useZone } from '../shared/zone'

const props = defineProps<{
  config: RegexLibraryWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Regex library'
  props.config.anchor = popupAnchor()
  props.config.enableHotkeys = true
  props.config.entries = starterEntries()
  wm.show(props.config.wmId)
}

// The edit form's code loads the first time a form opens.
const RegexEntryForm = defineAsyncComponent(() => import('./RegexEntryForm.vue'))

const filter = shallowRef('')
// The entry open in the form: an id, 'new' for one being added, or none.
const editing = shallowRef<number | 'new' | null>(null)
const newDraft = shallowRef<RegexEntry>(emptyEntry([]))
const { copied, copy: copyText } = useCopy(1200)

// The entry open in the form stays listed while you filter, so its edits aren't lost.
const groups = computed(() => groupByCategory(
  props.config.entries.filter(e => e.id === editing.value || matchesFilter(e, filter.value))))

const zone = useZone()
const dockShow = computed(() => props.config.entries.length > 0 && (zone.kind === 'town' || zone.kind === 'hideout'))
// Strings with a hotkey first, then the rest, six at most.
const glance = computed(() => [...props.config.entries]
  .sort((a, b) => Number(b.hotkey != null) - Number(a.hotkey != null))
  .slice(0, 6))

const hasHotkeys = computed(() => props.config.entries.some(e => e.hotkey != null))

watch(() => props.config.enableHotkeys, () => { pushHostConfig() })

function stashSearch (text: string) {
  MainProcess.sendEvent({
    name: 'CLIENT->MAIN::user-action',
    payload: { action: 'stash-search', text }
  })
}

async function copy (entry: RegexEntry) {
  await copyText(effectiveText(entry), String(entry.id))
}

const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)

function startNew () {
  // A new entry lands in the category you're filtering by, if that's one.
  const cats = new Set(props.config.entries.map(e => e.category).filter(Boolean))
  const draft = emptyEntry(props.config.entries)
  if (cats.has(filter.value.trim())) draft.category = filter.value.trim()
  newDraft.value = draft
  editing.value = 'new'
}

function edit (entry: RegexEntry) {
  editing.value = entry.id
}

function onAction (e: MouseEvent) {
  const btn = (e.target as Element).closest<HTMLElement>('[data-act]')
  if (!btn) return
  if (btn.dataset.act === 'new') { startNew(); return }
  if (btn.dataset.act === 'poe-re') { openPoeRe(); return }
  const entry = props.config.entries.find(x => String(x.id) === btn.dataset.id)
  if (!entry) return
  if (btn.dataset.act === 'edit') edit(entry)
  else if (btn.dataset.act === 'remove') remove(entry)
}

function saveEntry (entry: RegexEntry) {
  const list = props.config.entries
  if (editing.value === 'new') {
    // Ids can move on while the form is open (a save from poe.re): take a fresh one.
    props.config.entries = [...list, { ...entry, id: emptyEntry(list).id }]
  } else if (list.some(e => e.id === entry.id)) {
    props.config.entries = list.map(e => e.id === entry.id ? entry : e)
  } else {
    // Removed (in Settings, say) while the form was open: keep the edit as a new entry.
    props.config.entries = [...list, { ...entry, id: emptyEntry(list).id }]
  }
  editing.value = null
  // A new entry must show even if the filter would hide it.
  if (!matchesFilter(entry, filter.value)) filter.value = ''
  saveConfig()
  pushHostConfig()
}

function openPoeRe () {
  openPoeReWindow(wm, props.config.wmId, panel.value?.el)
}

// No "are you sure": remove now, offer Undo (P9).
function remove (entry: RegexEntry) {
  if (editing.value === entry.id) editing.value = null
  const at = props.config.entries.findIndex(e => e.id === entry.id)
  if (at < 0) return
  const removed = props.config.entries[at]
  props.config.entries = props.config.entries.filter(e => e.id !== entry.id)
  pushHostConfig()
  toast(`Removed "${entry.name || effectiveText(entry)}"`, {
    anchor: panel.value?.el,
    // Puts back just this entry: edits and saves made since stay.
    undo: () => {
      const list = props.config.entries
      if (list.some(e => e.id === removed.id)) return
      props.config.entries = [...list.slice(0, at), removed, ...list.slice(at)]
      pushHostConfig()
    }
  })
}

function rowMenu (e: MouseEvent, entry: RegexEntry) {
  openMenu(e, [
    { label: 'Search stash', icon: 'fas fa-search', keys: 'Enter', action: () => stashSearch(effectiveText(entry)) },
    { label: 'Copy string', icon: 'far fa-copy', keys: 'Ctrl + C', action: () => { copy(entry) } },
    { label: 'Edit', icon: 'fas fa-pen', action: () => edit(entry) },
    ...(entry.tags.length ? [{ label: `Filter by "${entry.tags[0]}"`, icon: 'fas fa-filter', action: () => { filter.value = entry.tags[0] } }] : []),
    { separator: true },
    { label: 'Remove', icon: 'fas fa-trash', keys: 'Del', danger: true, action: () => remove(entry) }
  ])
}

function tooltip (entry: RegexEntry) {
  return [effectiveText(entry), entry.tags.length ? `Tags: ${entry.tags.join(', ')}` : '', entry.notes]
    .filter(Boolean).join('\n')
}

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => [
  // Each types one stash search, from this click.
  ...glance.value.slice(0, 3).map(e => ({
    label: `Search stash: ${e.name || effectiveText(e)}`,
    icon: 'fas fa-search',
    action: () => { stashSearch(effectiveText(e)) }
  })),
  ...(hasHotkeys.value
    ? [{
        label: 'Entry hotkeys',
        icon: 'far fa-keyboard',
        checked: !!props.config.enableHotkeys,
        action: () => { props.config.enableHotkeys = !props.config.enableHotkeys; saveDock() }
      }]
    : [])
])
</script>

<style module>
/* Mock A: pencil and bin show on the row under the mouse (or with focus). */
.hoverOnly { visibility: hidden; }
.row:hover .hoverOnly, .row:focus-within .hoverOnly { visibility: visible; }
</style>
