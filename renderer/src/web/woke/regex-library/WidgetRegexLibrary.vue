<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- Town and hideout: your hotkeyed strings at a glance. -->
    <DockItem id="regex-library" title="Regex library" :show="dockShow" :wm-id="config.wmId" card-width="20rem" interactive>
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
    <WPanel ref="panel" :title="config.wmTitle || 'Regex library'" icon="stash" width="22rem" max-height="70vh">
      <template #actions>
        <WChip v-if="hasHotkeys" clickable :active="config.enableHotkeys" title="Use each entry's hotkey"
          @click="config.enableHotkeys = !config.enableHotkeys"><i class="fas fa-keyboard" /> Hotkeys</WChip>
      </template>
      <template #toolbar>
        <WField v-model="filter" icon="fas fa-search" placeholder="Filter by name, tag, category…" class="grow" />
      </template>

      <template v-for="group in groups" :key="group.category">
        <div class="w-group-label">{{ group.category }}</div>
        <WListItem v-for="entry in group.entries" :key="entry.id" :title="tooltip(entry)" @select="stashSearch(effectiveText(entry))"
          @contextmenu="rowMenu($event, entry)" @keydown.c.ctrl.prevent="copy(entry)" @keydown.delete.prevent="remove(entry)">
          <span class="w-trunc">{{ entry.name || effectiveText(entry) }}</span>
          <WChip v-if="entry.negate && canNegate(entry.text)" title="Highlights items WITHOUT this">not</WChip>
          <WChip v-for="tag in entry.tags.slice(0, 2)" :key="tag">{{ tag }}</WChip>
          <span v-if="effectiveText(entry).length > MAX_SEARCH_LENGTH" class="w-down text-xs shrink-0" title="Too long: the game cuts the search off at 250 characters">{{ effectiveText(entry).length }}/{{ MAX_SEARCH_LENGTH }}</span>
          <WKbd v-if="entry.hotkey && config.enableHotkeys" :keys="entry.hotkey" class="ml-auto" />
          <template v-if="entry.name" #sub><span class="w-mono">{{ effectiveText(entry) }}</span></template>
          <template #actions>
            <button @click="copy(entry)" class="w-icon-btn" :class="{ 'w-up': copied === String(entry.id) }" title="Copy to clipboard">
              <i :class="copied === String(entry.id) ? 'fas fa-check' : 'far fa-copy'" />
            </button>
          </template>
        </WListItem>
      </template>
      <WEmpty v-if="!groups.length && config.entries.length" icon="fas fa-filter">
        Nothing matches "{{ filter }}". Search looks at names, tags and categories.
        <template #actions><WButton size="sm" @click="filter = ''">Clear search</WButton></template>
      </WEmpty>
      <WEmpty v-else-if="!groups.length" :art="{ mechanic: 'stash' }">
        No saved strings yet. Add them in this widget's settings, or make one on poe.re and paste it there.
        <template #actions><WButton size="sm" href="https://poe.re/">Open poe.re</WButton></template>
      </WEmpty>

      <template #footer>
        <span>Click to search stash · right-click for more</span>
        <a href="https://poe.re/" target="_blank" class="ml-auto w-accent hover:underline">Generate on poe.re</a>
      </template>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
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
      anchor: { pos: 'tl', x: 35, y: 30 },
      enableHotkeys: true,
      entries: starterEntries()
    }]
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { inject, computed, watch, shallowRef } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { pushHostConfig } from '@/web/Config'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WField, WChip, WKbd, WEmpty, WListItem, WButton, openMenu, toast } from '../ui'
import { useCopy } from '../ui/copy'
import { MAX_SEARCH_LENGTH, canNegate, effectiveText, groupByCategory, matchesFilter } from './widget'
import type { RegexEntry } from './widget'
import DockItem from '../dock/DockItem.vue'
import { useZone } from '../shared/zone'

const props = defineProps<{
  config: RegexLibraryWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Regex library'
  props.config.anchor = { pos: 'tl', x: 30, y: 30 }
  props.config.enableHotkeys = true
  props.config.entries = starterEntries()
  wm.show(props.config.wmId)
}

const filter = shallowRef('')
const { copied, copy: copyText } = useCopy(1200)

const groups = computed(() => groupByCategory(
  props.config.entries.filter(e => matchesFilter(e, filter.value))))

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

// No "are you sure": remove now, offer Undo (P9).
function remove (entry: RegexEntry) {
  const before = props.config.entries
  props.config.entries = before.filter(e => e.id !== entry.id)
  pushHostConfig()
  toast(`Removed "${entry.name || effectiveText(entry)}"`, {
    anchor: panel.value?.el,
    undo: () => { props.config.entries = before; pushHostConfig() }
  })
}

function rowMenu (e: MouseEvent, entry: RegexEntry) {
  openMenu(e, [
    { label: 'Search stash', icon: 'fas fa-search', keys: 'Enter', action: () => stashSearch(effectiveText(entry)) },
    { label: 'Copy string', icon: 'far fa-copy', keys: 'Ctrl + C', action: () => { copy(entry) } },
    ...(entry.tags.length ? [{ label: `Filter by "${entry.tags[0]}"`, icon: 'fas fa-filter', action: () => { filter.value = entry.tags[0] } }] : []),
    { separator: true },
    { label: 'Remove', icon: 'fas fa-trash', keys: 'Del', danger: true, action: () => remove(entry) }
  ])
}

function tooltip (entry: RegexEntry) {
  return [effectiveText(entry), entry.tags.length ? `Tags: ${entry.tags.join(', ')}` : '', entry.notes]
    .filter(Boolean).join('\n')
}
</script>
