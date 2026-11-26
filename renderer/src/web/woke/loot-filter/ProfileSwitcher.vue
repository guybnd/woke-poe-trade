<template>
  <span :class="$style.root" data-goto-spot="profiles">
    <template v-if="naming">
      <input ref="field" v-model="draft" class="w-input" :class="[$style.field, { 'w-input-bad': draft && problem }]" :maxlength="PROFILE_NAME_MAX"
        :aria-label="naming.kind === 'rename' ? 'New name' : 'Name of the new profile'" @keydown.enter.prevent="commit" @keydown.esc.prevent.stop="naming = null">
      <WButton size="sm" variant="primary" :disabled="!!problem" :title="problem ?? undefined" @click="commit">{{ naming.kind === 'rename' ? 'Rename' : 'Add' }}</WButton>
      <WButton size="sm" variant="ghost" @click="naming = null">Cancel</WButton>
      <span v-if="draft && problem" class="text-xs" style="color: var(--w-warn);">{{ problem }}</span>
    </template>
    <template v-else-if="deleting">
      <span class="text-xs">Delete <b>{{ deleting.name }}</b>? Its file stays in your filter folder.</span>
      <WButton size="sm" variant="danger" @click="confirmDelete">Delete</WButton>
      <WButton size="sm" variant="ghost" @click="deleting = null">Cancel</WButton>
    </template>
    <button v-else ref="chip" type="button" class="w-btn w-btn--sm w-focusable" :class="$style.chip" :disabled="store.switching.value"
      :title="`Profile in use. It saves to ${fileOf(current)}.\nEach profile is a whole filter of its own; switch, add or rename here.`" @click="open">
      <i class="fas fa-layer-group" aria-hidden="true" />
      <span class="w-trunc">{{ current.name }}</span>
      <i :class="store.switching.value ? 'fas fa-spinner fa-spin' : 'fas fa-caret-down'" aria-hidden="true" />
    </button>
  </span>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { WButton, openMenu, toast } from '../ui'
import type { MenuEntry } from '../ui/layer'
import type { LootFilterStore } from './store'
import type { FilterProfile, LootFilterWidget } from './widget'
import { PROFILE_NAME_MAX } from './widget'
import { activeProfile, addProfile, copyName, newProfileName, profileFile, profileNameProblem, renameProfile } from './profiles'
import { LEVEL_NAMES } from './strictness'

const props = defineProps<{
  config: LootFilterWidget
  store: LootFilterStore
}>()

const chip = ref<HTMLElement | null>(null)
const field = ref<HTMLInputElement | null>(null)
const naming = ref<{ kind: 'new' | 'copy' | 'rename', id?: number } | null>(null)
const draft = ref('')
const deleting = ref<FilterProfile | null>(null)

const current = computed(() => activeProfile(props.config))
const fileOf = (p: FilterProfile) => profileFile(props.config, p)
const problem = computed(() => naming.value ? profileNameProblem(props.config, draft.value, naming.value.kind === 'rename' ? naming.value.id! : null) : null)

// What a row says about a profile: its strictness, or the file it's made from.
function sourceOf (p: FilterProfile): string {
  const d = p.id === props.config.activeProfile ? props.config : (p.data ?? {})
  if (d.neversink?.on) return `NeverSink · ${LEVEL_NAMES[d.neversink.level] ?? ''}`
  return d.sourceOnline ? (d.sourceTitle || 'Online filter') : (d.sourceName?.replace(/\.filter$/i, '') || 'No filter picked')
}

function open () {
  const el = chip.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const cur = current.value
  const items: MenuEntry[] = [
    { separator: true, heading: 'Profiles' },
    ...props.config.profiles.map(p => ({
      label: sourceOf(p) === p.name ? p.name : `${p.name}  ·  ${sourceOf(p)}`,
      checked: p.id === cur.id,
      action: () => { swap(p.id) }
    })),
    { separator: true },
    { label: 'New profile', icon: 'fas fa-plus', action: () => { startNaming('new') } },
    { label: `Duplicate “${cur.name}”`, icon: 'far fa-clone', action: () => { startNaming('copy') } },
    { label: `Rename “${cur.name}”`, icon: 'fas fa-pen', action: () => { startNaming('rename', cur.id) } },
    { label: `Delete “${cur.name}”`, icon: 'fas fa-trash', danger: true, disabled: props.config.profiles.length < 2, action: () => { deleting.value = cur } }
  ]
  openMenu({ x: r.left, y: r.bottom + 2, from: el }, items)
}

async function startNaming (kind: 'new' | 'copy' | 'rename', id?: number) {
  draft.value = kind === 'rename' ? current.value.name : kind === 'copy' ? copyName(props.config, current.value.name) : newProfileName(props.config)
  naming.value = { kind, id }
  await nextTick()
  field.value?.focus()
  field.value?.select()
}

const anchor = () => chip.value?.closest('[id^="widget-"]') ?? null

async function swap (id: number) {
  const ok = await props.store.switchProfile(id)
  if (!ok) return
  const to = current.value.name
  const game = props.store.pendingReload.value
    ? 'It loads in game once you\'re in town or your hideout.'
    : props.config.reloadViaChat && props.store.lastSaved.value != null ? 'The game is on it now.' : ''
  toast(`Switched to ${to}. ${game}`.trim(), { anchor: anchor() })
}

async function commit () {
  const n = naming.value
  if (!n || problem.value) return
  const name = draft.value
  naming.value = null
  if (n.kind === 'rename') {
    const before = fileOf(current.value)
    if (!renameProfile(props.config, n.id!, name)) return
    const after = fileOf(current.value)
    if (before === after) return
    // The game follows it to the new file, as on Save.
    if (n.id === props.config.activeProfile && props.store.doc.value) await props.store.save()
    toast(`Renamed. It saves to ${after} from now on; the old file stays in your folder.`, { anchor: anchor() })
    return
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
  if (props.store.deleteProfile(p.id)) toast(`Deleted ${p.name}. Its file is still in your filter folder.`, { anchor: anchor() })
}
</script>

<style module>
.root {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 12rem;
  border-color: var(--w-accent);
}
.field {
  width: 11rem;
}
</style>
