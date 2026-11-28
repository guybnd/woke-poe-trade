<template>
  <div ref="root" :class="$style.strip" data-goto-spot="profiles" role="tablist" aria-label="Profiles">
    <button v-for="p in config.profiles" :key="p.id" type="button" role="tab" class="w-focusable" :aria-selected="p.id === config.activeProfile" :aria-label="`Profile ${p.name}`"
      :class="[$style.tab, { [$style.on]: p.id === config.activeProfile }]" :disabled="store.switching.value && p.id !== config.activeProfile"
      :title="tipOf(p)" @click="swap(p.id)" @contextmenu="tabMenu($event, p)">
      <i v-if="switchingTo === p.id" class="fas fa-spinner fa-spin" aria-hidden="true" />
      <span class="w-trunc">{{ p.name }}</span>
    </button>
    <template v-if="naming">
      <input ref="field" v-model="draft" class="w-input" :class="[$style.field, { 'w-input-bad': draft && problem }]" :maxlength="PROFILE_NAME_MAX"
        :aria-label="naming.kind === 'rename' ? 'New name' : 'Name of the new profile'" @keydown.enter.prevent="commit" @keydown.esc.prevent.stop="naming = null">
      <WButton size="sm" variant="primary" :disabled="!!problem" :title="problem ?? undefined" @click="commit">{{ naming.kind === 'rename' ? 'Rename' : 'Add' }}</WButton>
      <WButton size="sm" variant="ghost" @click="naming = null">Cancel</WButton>
      <span v-if="draft && problem" class="text-xs" style="color: var(--w-warn);">{{ problem }}</span>
    </template>
    <template v-else-if="deleting">
      <span class="text-xs">Remove <b>{{ deleting.name }}</b>? Its file stays in your filter folder.</span>
      <WButton size="sm" variant="danger" @click="confirmDelete">Remove</WButton>
      <WButton size="sm" variant="ghost" @click="deleting = null">Cancel</WButton>
    </template>
    <button v-else type="button" class="w-focusable" :class="[$style.tab, $style.add]" :disabled="store.switching.value"
      aria-label="New profile" title="New profile: a fresh one, or a copy of the one in use" @click="addMenu">
      <i class="fas fa-plus" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { WButton, openMenu, toast } from '../ui'
import type { LootFilterStore } from './store'
import type { FilterProfile, LootFilterWidget } from './widget'
import { PROFILE_NAME_MAX } from './widget'
import { activeProfile, addProfile, copyName, newProfileName, profileFile, profileNameProblem, renameProfile } from './profiles'
import { LEVEL_NAMES } from './strictness'

// Profiles as a row of tabs above the editor's own (Guy's pick B): click one to
// switch, + to add, right-click for duplicate, rename and remove.
const props = defineProps<{
  config: LootFilterWidget
  store: LootFilterStore
}>()

const root = ref<HTMLElement | null>(null)
const field = ref<HTMLInputElement | null>(null)
const naming = ref<{ kind: 'new' | 'copy' | 'rename', id?: number, from?: number } | null>(null)
const draft = ref('')
const deleting = ref<FilterProfile | null>(null)
const switchingTo = ref<number | null>(null)

const current = computed(() => activeProfile(props.config))
const byId = (id: number) => props.config.profiles.find(p => p.id === id)
const fileOf = (p: FilterProfile) => profileFile(props.config, p)
const problem = computed(() => naming.value ? profileNameProblem(props.config, draft.value, naming.value.kind === 'rename' ? naming.value.id! : null) : null)

// What a profile is made from: NeverSink and its strictness, or the file.
function sourceOf (p: FilterProfile): string {
  const d = p.id === props.config.activeProfile ? props.config : (p.data ?? {})
  if (d.ownBase) return `Our filter · ${LEVEL_NAMES[d.neversink?.level ?? 2] ?? ''}`
  if (d.neversink?.on) return `NeverSink · ${LEVEL_NAMES[d.neversink.level] ?? ''}`
  return d.sourceOnline ? (d.sourceTitle || 'Online filter') : (d.sourceName?.replace(/\.filter$/i, '') || 'No filter picked')
}

function tipOf (p: FilterProfile): string {
  const lead = p.id === props.config.activeProfile ? 'In use' : 'Click to switch to it; the game loads it too'
  return `${p.name} · ${sourceOf(p)}\nSaves to ${fileOf(p)}\n${lead}. Right-click to duplicate, rename or remove.`
}

function addMenu (e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  openMenu({ x: r.left, y: r.bottom + 2, from: el }, [
    { label: 'New profile', icon: 'fas fa-plus', action: () => { startNaming('new') } },
    { label: `Copy of “${current.value.name}”`, icon: 'far fa-clone', action: () => { startNaming('copy', undefined, current.value.id) } }
  ])
}

function tabMenu (e: MouseEvent, p: FilterProfile) {
  if (props.store.switching.value) return
  openMenu(e, [
    ...(p.id === props.config.activeProfile ? [] : [{ label: 'Switch to it', icon: 'fas fa-exchange-alt', action: () => { swap(p.id) } }]),
    { label: 'Duplicate', icon: 'far fa-clone', action: () => { startNaming('copy', undefined, p.id) } },
    { label: 'Rename', icon: 'fas fa-pen', action: () => { startNaming('rename', p.id) } },
    { label: 'Remove', icon: 'fas fa-trash', danger: true, disabled: props.config.profiles.length < 2, action: () => { deleting.value = p } }
  ])
}

async function startNaming (kind: 'new' | 'copy' | 'rename', id?: number, from?: number) {
  const named = byId(id ?? from ?? current.value.id) ?? current.value
  draft.value = kind === 'rename' ? named.name : kind === 'copy' ? copyName(props.config, named.name) : newProfileName(props.config)
  deleting.value = null
  naming.value = { kind, id, from }
  await nextTick()
  field.value?.focus()
  field.value?.select()
}

const anchor = () => root.value?.closest('[id^="widget-"]') ?? null

async function swap (id: number) {
  if (id === props.config.activeProfile) return
  switchingTo.value = id
  try {
    if (!await props.store.switchProfile(id)) return
  } finally {
    switchingTo.value = null
  }
  const game = props.store.pendingReload.value
    ? 'It loads in game once you\'re in town or your hideout.'
    : props.config.reloadViaChat && props.store.lastSaved.value != null ? 'The game is on it now.' : ''
  toast(`Switched to ${current.value.name}. ${game}`.trim(), { anchor: anchor() })
}

async function commit () {
  const n = naming.value
  if (!n || problem.value) return
  const name = draft.value
  naming.value = null
  if (n.kind === 'rename') {
    const p = byId(n.id!)
    if (!p) return
    const before = fileOf(p)
    if (!renameProfile(props.config, p.id, name)) return
    const after = fileOf(byId(p.id)!)
    if (before === after) return
    // The game follows the one in use to its new file, as on Save.
    if (p.id === props.config.activeProfile && props.store.doc.value) await props.store.save()
    toast(`Renamed. It saves to ${after} from now on; the old file stays in your folder.`, { anchor: anchor() })
    return
  }
  // A copy of another profile: switch to that one first, then copy it.
  if (n.kind === 'copy' && n.from != null && n.from !== props.config.activeProfile) {
    if (!await props.store.switchProfile(n.from, { gameToo: false })) return
  }
  const p = addProfile(props.config, name, n.kind === 'copy' ? 'copy' : 'blank')
  await swap(p.id)
}

async function confirmDelete () {
  const p = deleting.value
  deleting.value = null
  if (!p) return
  if (p.id === props.config.activeProfile) {
    const other = props.config.profiles.find(x => x.id !== p.id)
    if (!other) return
    if (!await props.store.switchProfile(other.id)) return
  }
  if (props.store.deleteProfile(p.id)) toast(`Removed ${p.name}. Its file is still in your filter folder.`, { anchor: anchor() })
}
</script>

<style module>
/* A slim row of tabs over the editor's own: smaller, so the two rows read as
   "which filter" above "which part of it". */
.strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  padding-bottom: 6px;
  min-width: 0;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 12rem;
  padding: 2px 10px;
  font-size: var(--w-fs-sm);
  color: var(--w-dim);
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-md);
}
.tab:hover:not(:disabled) { color: var(--w-fg); border-color: var(--w-line-strong); }
.tab:disabled { opacity: 0.6; cursor: default; }
.on, .on:hover {
  color: var(--w-tab-on, #f2d79e);
  border-color: color-mix(in srgb, var(--w-accent) 70%, transparent);
  background: color-mix(in srgb, var(--w-accent) 22%, var(--w-panel-solid));
}
.add { color: var(--w-accent); padding: 2px 8px; }
.field { width: 11rem; }
</style>
