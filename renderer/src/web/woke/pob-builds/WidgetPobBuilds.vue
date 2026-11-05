<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <div class="flex gap-2 min-h-0 items-start">
      <WPanel :title="config.wmTitle || 'PoB builds'" icon="wisdom" :busy="loading && builds.length > 0" width="20rem" max-height="70vh">
        <template #actions>
          <button @click="importOpen = !importOpen" class="w-icon-btn" :class="{ 'w-icon-btn--on': importOpen }" title="Import a pobb.in / pastebin link or PoB code">
            <i class="fas fa-file-import" />
          </button>
          <button @click="refresh" class="w-icon-btn" title="Reload builds folder">
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }" />
          </button>
        </template>
        <template #toolbar>
          <div v-if="importOpen" class="flex gap-1 w-full">
            <WField v-model="importText" icon="fas fa-link" placeholder="pobb.in link, pastebin link or PoB code" class="grow" @keydown.enter="doImport" />
            <WButton size="sm" variant="primary" :disabled="importing || !importText.trim()" @click="doImport">{{ importing ? '…' : 'Import' }}</WButton>
          </div>
          <WField v-else v-model="filter" icon="fas fa-search" placeholder="Filter by name, class, skill, folder…" class="grow" />
        </template>
        <template v-if="error" #banner>
          <WBanner><span :title="error">{{ errorText }}</span><template #actions><WButton size="sm" @click="refresh">Retry</WButton></template></WBanner>
        </template>
        <template v-if="importMsg" #meta>
          <span :class="importOk ? 'w-up' : 'w-down'">{{ importMsg }}</span>
        </template>

        <WSkeleton v-if="loading && !builds.length" :rows="6" />

        <WListItem v-for="b in shown" :key="b.relPath" :active="selected === b.relPath" :title="b.relPath" @select="select(b)"
          @contextmenu="buildMenu($event, b)" @keydown.p.prevent="togglePin(b.relPath)">
          <i v-if="config.activeBuild === b.relPath" class="fas fa-check-circle w-up" title="Active build" />
          <span class="w-trunc">{{ b.name }}</span>
          <template #sub>{{ describe(b) }}<template v-if="b.folder"> · {{ b.folder }}</template></template>
          <template #actions>
            <button @click="togglePin(b.relPath)" class="w-icon-btn" :class="{ 'w-icon-btn--on': isPinned(b.relPath) }"
              :title="isPinned(b.relPath) ? 'Unpin' : 'Pin to top'">
              <i class="fas fa-thumbtack" />
            </button>
          </template>
        </WListItem>
        <WEmpty v-if="!loading && !shown.length && !error && builds.length" icon="fas fa-filter">
          Nothing matches "{{ filter }}".
          <template #actions><WButton size="sm" @click="filter = ''">Clear search</WButton></template>
        </WEmpty>
        <WEmpty v-else-if="!loading && !shown.length && !error" icon="fas fa-folder-open">
          No builds in {{ dir || 'the builds folder' }}. Save one in Path of Building, or import a pobb.in link with the button above.
          <template #actions><WButton size="sm" @click="importOpen = true">Import a build</WButton></template>
        </WEmpty>
      </WPanel>

      <BuildDetail v-if="selectedBuild" :config="config" :entry="selectedBuild" :details="details" @close="selected = null" />
      <WPanel v-if="selectedBuild && detailsError" size-key="detail" title="Couldn't read the build" width="20rem">
        <div class="w-down" style="padding: var(--w-pad);">{{ detailsError }}</div>
      </WPanel>
    </div>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { POB_BUILDS_TYPE } from './widget'
import type { PobBuildsWidget } from './widget'

export default {
  widget: {
    type: POB_BUILDS_TYPE,
    instances: 'multi',
    trNameKey: 'PoB builds'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { inject, computed, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WField, WButton, WEmpty, WListItem, WBanner, WSkeleton, openMenu } from '../ui'
import { saveConfig } from '@/web/Config'
import BuildDetail from './BuildDetail.vue'
import { useActiveBuild } from './active'
import { buildMatches, describe, migratePobWidget, pobApi, sortBuilds } from './widget'
import type { PobBuildEntry, PobDetails } from './widget'

const props = defineProps<{
  config: PobBuildsWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'PoB builds'
  props.config.anchor = popupAnchor()
  props.config.buildsDir = ''
  props.config.pobExe = ''
  props.config.pinned = []
  props.config.activeBuild = null
  props.config.followChars = {}
  props.config.loadouts = {}
  wm.show(props.config.wmId)
}
migratePobWidget(props.config)

const builds = shallowRef<PobBuildEntry[]>([])
const dir = shallowRef('')
const loading = shallowRef(false)
const error = shallowRef('')
// A missing folder is a setting to fix, so it does not need the system's error text.
const errorText = computed(() => error.value.includes('ENOENT')
  ? 'No builds folder found. Set it in Settings.'
  : `Couldn't read the builds folder: ${error.value}`)
const filter = shallowRef('')
const selected = shallowRef<string | null>(null)
const details = shallowRef<PobDetails | null>(null)
const detailsError = shallowRef('')
const importOpen = shallowRef(false)
const importText = shallowRef('')
const importing = shallowRef(false)
const importMsg = shallowRef('')
const importOk = shallowRef(false)

const active = useActiveBuild()

// Follow the character Client.txt shows levelling: a build linked to that
// name (or, failing that, one whose file name contains it) becomes active.
watch(active.charName, (name) => {
  if (!name) return
  let rel: string | undefined = props.config.followChars[name]
  if (!rel && name.length >= 4) {
    const lower = name.toLowerCase()
    rel = builds.value.find(b => b.name.toLowerCase().includes(lower))?.relPath
    if (rel) props.config.followChars = { ...props.config.followChars, [name]: rel }
  }
  if (rel && rel !== props.config.activeBuild) {
    props.config.activeBuild = rel
    saveConfig()
  }
})
// The name match needs the build list, which loads after mount: try it once
// the list is in for a character that has no build linked yet.
watch(builds, (list) => {
  const name = active.charName.value
  if (!name || name.length < 4 || props.config.followChars[name] || !list.length) return
  const lower = name.toLowerCase()
  const rel = list.find(b => b.name.toLowerCase().includes(lower))?.relPath
  if (!rel) return
  props.config.followChars = { ...props.config.followChars, [name]: rel }
  if (rel !== props.config.activeBuild) {
    props.config.activeBuild = rel
    saveConfig()
  }
})

async function doImport () {
  const input = importText.value.trim()
  if (!input || importing.value) return
  importing.value = true
  importMsg.value = ''
  try {
    const { relPath } = await pobApi.import(props.config, input)
    importOk.value = true
    importMsg.value = `Saved to ${relPath}`
    importText.value = ''
    importOpen.value = false
    await refresh()
    selected.value = relPath
  } catch (err) {
    importOk.value = false
    importMsg.value = (err as Error).message
  } finally {
    importing.value = false
  }
}

const shown = computed(() => sortBuilds(builds.value, props.config.pinned)
  .filter(b => buildMatches(b, filter.value)))
const selectedBuild = computed(() => builds.value.find(b => b.relPath === selected.value) ?? null)

async function refresh () {
  loading.value = true
  error.value = ''
  try {
    const res = await pobApi.list(props.config)
    builds.value = res.builds
    dir.value = res.dir
    // PoB may have saved the active build meanwhile.
    active.reload()
  } catch (err) {
    builds.value = []
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

function select (b: PobBuildEntry) {
  selected.value = selected.value === b.relPath ? null : b.relPath
}

watch(selected, async (relPath) => {
  details.value = null
  detailsError.value = ''
  if (!relPath) return
  try {
    const d = await pobApi.read(props.config, relPath)
    if (selected.value === relPath) details.value = d
  } catch (err) {
    if (selected.value === relPath) detailsError.value = (err as Error).message
  }
})

// Reload when the folder changes, and whenever the widget is shown, so
// builds saved in PoB meanwhile appear.
watch(() => props.config.buildsDir, refresh, { immediate: true })
watch(() => props.config.wmWants, (wants) => { if (wants === 'show') refresh() })

function isPinned (relPath: string) {
  return props.config.pinned.includes(relPath)
}

function buildMenu (e: MouseEvent, b: PobBuildEntry) {
  const pinned = isPinned(b.relPath)
  const active = props.config.activeBuild === b.relPath
  openMenu(e, [
    { label: selected.value === b.relPath ? 'Hide details' : 'Show details', icon: 'fas fa-info-circle', keys: 'Enter', action: () => select(b) },
    { label: active ? 'Active build' : 'Make active build', icon: 'fas fa-check-circle', disabled: active, action: () => { props.config.activeBuild = b.relPath; saveConfig() } },
    { label: pinned ? 'Unpin' : 'Pin to top', icon: 'fas fa-thumbtack', keys: 'P', action: () => togglePin(b.relPath) }
  ])
}

function togglePin (relPath: string) {
  props.config.pinned = isPinned(relPath)
    ? props.config.pinned.filter(p => p !== relPath)
    : [...props.config.pinned, relPath]
}

</script>
