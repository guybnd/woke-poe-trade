<template>
  <!-- Profiles as one chip in the title bar (Guy's P1, 2026-11-28): the one in
       use, ▾ for the others and for new, copy, rename and remove. -->
  <div ref="root" :class="$style.strip" data-goto-spot="profiles">
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
    <button v-else type="button" class="w-focusable" :class="$style.chip" :disabled="store.switching.value" aria-haspopup="menu"
      :aria-label="`Profile ${current.name}: switch, add, rename, share or remove`" :title="tipOf(current)" data-profile-chip @click="profileMenu" @contextmenu.prevent="profileMenu">
      <i v-if="switchingTo != null" class="fas fa-spinner fa-spin" aria-hidden="true" />
      <span class="w-trunc">{{ current.name }}</span>
      <i class="fas fa-caret-down" aria-hidden="true" />
    </button>
    <div v-if="sharing" :class="$style.pop">
      <ShareBox :key="`${sharing.mode}-${sharing.id ?? ''}`" :config="config" :store="store" :mode="sharing.mode" :profile-id="sharing.id" :anchor="anchor()" @close="sharing = null" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, ref } from 'vue'
import { WButton, openMenu, toast } from '../ui'
import type { LootFilterStore } from './store'
import type { FilterProfile, LootFilterWidget } from './widget'
import { PROFILE_NAME_MAX } from './widget'
import { activeProfile, addProfile, copyName, newProfileName, profileFile, profileNameProblem, renameProfile } from './profiles'
import { LEVEL_NAMES } from './strictness'

// Loaded when opened: it pulls in the Loot tab's item list.
const ShareBox = defineAsyncComponent(() => import('./ShareBox.vue'))

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
const sharing = ref<{ mode: 'share' | 'import', id?: number } | null>(null)

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
  const lead = p.id === props.config.activeProfile ? 'In use. Click for your other profiles, or to add, rename, share or remove one.' : 'Switch to it; the game loads it too.'
  return `${p.name} · ${sourceOf(p)}\nSaves to ${fileOf(p)}\n${lead}`
}

function profileMenu (e: MouseEvent) {
  if (props.store.switching.value) return
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  const me = current.value
  openMenu({ x: r.left, y: r.bottom + 2, from: el }, [
    ...props.config.profiles.map(p => ({
      label: p.name,
      icon: p.id === me.id ? 'fas fa-check' : 'fas fa-exchange-alt',
      title: tipOf(p),
      disabled: p.id === me.id,
      action: () => { swap(p.id) }
    })),
    { separator: true },
    { label: 'New profile', icon: 'fas fa-plus', action: () => { startNaming('new') } },
    { label: `Copy of “${me.name}”`, icon: 'far fa-clone', action: () => { startNaming('copy', undefined, me.id) } },
    { label: `Rename “${me.name}”`, icon: 'fas fa-pen', action: () => { startNaming('rename', me.id) } },
    { label: `Share “${me.name}”…`, icon: 'fas fa-share-alt', action: () => { sharing.value = { mode: 'share', id: me.id } } },
    { label: 'Import a shared filter…', icon: 'fas fa-file-import', action: () => { sharing.value = { mode: 'import' } } },
    { label: `Remove “${me.name}”`, icon: 'fas fa-trash', danger: true, disabled: props.config.profiles.length < 2, action: () => { deleting.value = me } }
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
.strip { position: relative; display: flex; align-items: center; gap: 4px; min-width: 0; }
/* The share box opens under the chip, over the editor. */
.pop {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 20;
  width: 34rem;
  max-width: 80vw;
  background: var(--w-panel-solid);
  border-radius: var(--w-r-md);
  box-shadow: 0 6px 18px rgb(0 0 0 / 0.5);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 14rem;
  padding: 1px 9px;
  font-size: var(--w-fs-sm);
  color: var(--w-tab-on, #f2d79e);
  background: color-mix(in srgb, var(--w-accent) 18%, var(--w-panel-solid));
  border: 1px solid color-mix(in srgb, var(--w-accent) 70%, transparent);
  border-radius: var(--w-r-md);
}
.chip:hover:not(:disabled) { border-color: var(--w-accent); }
.chip:disabled { opacity: 0.6; cursor: default; }
.field { width: 11rem; }
</style>
