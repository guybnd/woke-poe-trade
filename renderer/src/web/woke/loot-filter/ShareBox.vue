<template>
  <div :class="$style.box" data-share-box>
    <div class="flex items-center gap-2">
      <i :class="mode === 'share' ? 'fas fa-share-alt' : 'fas fa-file-import'" class="w-dim" aria-hidden="true" />
      <span class="w-group-label" style="padding: 0;">{{ mode === 'share' ? `Share “${profile?.name}”` : 'Import a shared filter' }}</span>
      <WInfo :text="mode === 'share' ? 'A code or file other Woke players can import. Folders, hotkeys and prices stay out.' : 'Paste a code from another Woke player, or open their file. Nothing changes until you pick where it goes.'" />
      <span class="grow" />
      <WButton size="sm" variant="ghost" icon="fas fa-times" aria-label="Close" @click="emit('close')" />
    </div>

    <template v-if="mode === 'import'">
      <div class="flex items-center gap-2">
        <WField v-model="input" placeholder="Paste a code (WOKEF1.…)" aria-label="Share code" style="flex: 1; min-width: 0;" @keydown.enter.prevent="read" />
        <WButton size="sm" :disabled="!input.trim()" @click="read">Read</WButton>
        <WButton size="sm" variant="ghost" icon="far fa-folder-open" @click="openFile">Open file…</WButton>
      </div>
      <div v-if="code" class="text-xs w-dim">{{ code.name ? `Profile “${code.name}”` : 'A shared filter' }} · {{ inCode.length }} part{{ inCode.length === 1 ? '' : 's' }}</div>
    </template>

    <div v-if="mode === 'share' || code" :class="$style.parts" role="group" aria-label="Parts">
      <label v-for="p in shownParts" :key="p.key" :class="$style.part">
        <input type="checkbox" :checked="picked.has(p.key)" :data-share-part="p.key" @change="tick(p.key, ($event.target as HTMLInputElement).checked)">
        <span class="grow min-w-0 w-trunc">{{ p.label }}</span>
        <span class="w-faint text-xs w-num">{{ counts[p.key] ? `${counts[p.key]} set` : 'default' }}</span>
      </label>
    </div>

    <div v-if="mode === 'import' && missing.length" class="text-xs" style="color: var(--w-warn);" data-no-item-tip="a list of names in a warning sentence">
      {{ missing.length }} item{{ missing.length === 1 ? ' isn\'t' : 's aren\'t' }} in your filter and do nothing: {{ missing.slice(0, 5).join(', ') }}{{ missing.length > 5 ? '…' : '' }}
    </div>

    <div v-if="mode === 'share'" class="flex items-center gap-2 flex-wrap">
      <WButton size="sm" variant="primary" :icon="copied === 'code' ? 'fas fa-check' : 'fas fa-copy'" :disabled="!picked.size" @click="copyCode">{{ copied === 'code' ? 'Copied' : 'Copy code' }}</WButton>
      <WButton size="sm" icon="far fa-save" :disabled="!picked.size" @click="saveFile">Save file…</WButton>
      <span v-if="size" class="text-xs w-faint w-num">{{ size }}</span>
    </div>
    <div v-else-if="code" class="flex items-center gap-2 flex-wrap">
      <WButton size="sm" variant="primary" :disabled="!picked.size" @click="asNew">As a new profile</WButton>
      <WButton size="sm" :disabled="!picked.size" title="Each ticked part replaces yours; the rest stays. Undo works." @click="intoCurrent">Into “{{ current.name }}”</WButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { WButton, WField, WInfo, toast, useCopy } from '../ui'
import { hostRequest } from '../shared/host'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import { cleanProfileName } from './widget'
import { activeProfile, addProfile, profileNameProblem } from './profiles'
import { defaultPresets, normalizePresets } from './presets'
import type { Presets } from './presets'
import { decodeChanges, encodeChanges } from './share'
import type { SharedChanges } from './share'
import { ALL_PARTS, SHARE_PARTS, mergeParts, partCounts } from './share-parts'
import type { CatOf, SharePart } from './share-parts'
import { CURRENCY_TYPE, currencyItems } from './currency-weights'
import { cardFacts, loadCardFacts } from './card-facts'
import { gemLinesOf } from './gem-classes'
import { nextEditId } from './edits'
import type { FilterEdit } from './edits'
import type { OwnRule } from './rules'

// Share a profile (or some of its parts) as a code or file, or bring one in
// as a new profile or into the one in use. Opened from the profile tabs.
const props = defineProps<{
  config: LootFilterWidget
  store: LootFilterStore
  mode: 'share' | 'import'
  // The profile to share; the one in use when unset.
  profileId?: number
  anchor?: Element | null
}>()
const emit = defineEmits<{ close: [] }>()

const EXT = ['wokefilter', 'txt']
const { copied, copy } = useCopy()
const current = computed(() => activeProfile(props.config))
const profile = computed(() => props.config.profiles.find(p => p.id === props.profileId) ?? current.value)

// Item name → Loot section, from the filter in use.
const cats = computed(() => {
  const doc = props.store.doc.value
  const lookup = props.store.prices.lootLookup.value
  const out = new Map<string, string>()
  if (!doc || !lookup) return out
  loadCardFacts()
  const items = currencyItems({ ...doc, blocks: doc.blocks.filter(b => b.type !== CURRENCY_TYPE) }, lookup, {}, cardFacts.value, gemLinesOf(props.store.prices.items.value))
  for (const it of items) if (!out.has(it.name)) out.set(it.name, it.cat)
  return out
})
const catOf: CatOf = n => cats.value.get(n)

interface Source { presets: Presets, edits: FilterEdit[], rules: OwnRule[], locks: string[] }
const source = computed<Source>(() => {
  const p = profile.value
  if (p.id === props.config.activeProfile) {
    const c = props.config
    return { presets: c.presets, edits: c.edits, rules: c.rules, locks: c.priceTiers.locks }
  }
  const d = p.data ?? {}
  return { presets: normalizePresets(d.presets), edits: d.edits ?? [], rules: d.rules ?? [], locks: d.priceTiers?.locks ?? [] }
})

// ---- import ----
const input = ref('')
const code = ref<SharedChanges | null>(null)
const inCode = computed<SharePart[]>(() => code.value?.parts ?? ALL_PARTS)

const counts = computed(() => props.mode === 'share'
  ? partCounts(source.value.presets, catOf, source.value.edits.length + source.value.rules.length + source.value.locks.length)
  : code.value ? partCounts(code.value.presets, catOf, code.value.edits.length + code.value.rules.length + code.value.locks.length) : partCounts(defaultPresets(), catOf))
const shownParts = computed(() => props.mode === 'share' ? SHARE_PARTS : SHARE_PARTS.filter(p => inCode.value.includes(p.key)))

const picked = ref(new Set<SharePart>())
function defaults () {
  // What's set, and All loot always; an import ticks all it holds.
  picked.value = props.mode === 'share'
    ? new Set(ALL_PARTS.filter(k => k === 'loot' || counts.value[k] > 0))
    : new Set(inCode.value)
}
watch(() => [props.mode, props.profileId, code.value], defaults, { immediate: true })

function tick (k: SharePart, on: boolean) {
  const next = new Set(picked.value)
  if (on) next.add(k)
  else next.delete(k)
  picked.value = next
}

const missing = computed(() => {
  if (!code.value || !cats.value.size) return []
  return Object.keys(code.value.presets.currency.items).filter(n => !cats.value.has(n)).sort()
})

async function read () {
  try {
    code.value = await decodeChanges(input.value)
  } catch (e) {
    code.value = null
    toast((e as Error).message, { anchor: props.anchor })
  }
}

async function openFile () {
  try {
    const f = await hostRequest('text-file-open', { title: 'Open a shared loot filter', extensions: EXT }, 120_000)
    if (!f) return
    input.value = f.text.trim()
    await read()
  } catch (e) {
    toast(`Couldn't open that file: ${(e as Error).message}`, { anchor: props.anchor })
  }
}

function unusedName (base: string): string {
  const stem = cleanProfileName(base) || 'Shared'
  if (!profileNameProblem(props.config, stem, null)) return stem
  for (let i = 2; i < 100; i++) {
    const n = `${stem.slice(0, 36)} ${i}`
    if (!profileNameProblem(props.config, n, null)) return n
  }
  return `Shared ${Date.now() % 1000}`
}

// Fresh ids, so imported changes never collide with yours.
const fresh = (s: SharedChanges) => ({
  edits: s.edits.map(e => ({ ...e, id: nextEditId() })),
  rules: s.rules.map(r => ({ ...r, id: nextEditId() }))
})

async function asNew () {
  const s = code.value
  if (!s) return
  const parts = [...picked.value]
  const p = addProfile(props.config, unusedName(s.name ?? 'Shared'), 'blank')
  const d = p.data!
  d.presets = mergeParts(d.presets ?? defaultPresets(), s.presets, parts, catOf)
  if (picked.value.has('changes')) {
    const f = fresh(s)
    d.edits = f.edits
    d.rules = f.rules
    if (d.priceTiers) d.priceTiers = { ...d.priceTiers, locks: [...s.locks] }
  }
  props.config.profiles = [...props.config.profiles]
  emit('close')
  if (await props.store.switchProfile(p.id)) toast(`Added ${p.name} and switched to it`, { anchor: props.anchor })
}

function intoCurrent () {
  const s = code.value
  if (!s) return
  const parts = [...picked.value]
  const undo = props.store.changeWithUndo(c => {
    c.presets = mergeParts(c.presets, s.presets, parts, catOf)
    if (parts.includes('changes')) {
      const f = fresh(s)
      c.edits = f.edits
      c.rules = f.rules
      c.priceTiers.locks = [...s.locks]
    }
  })
  emit('close')
  toast(`Put ${parts.length} part${parts.length === 1 ? '' : 's'} into ${current.value.name}`, { anchor: props.anchor, undo })
}

// ---- share ----
const lastCode = ref('')
const size = computed(() => lastCode.value ? `${(lastCode.value.length / 1024).toFixed(1)} KB` : '')
watch(picked, () => { lastCode.value = '' })

async function makeCode (): Promise<string> {
  const src = source.value
  const parts = ALL_PARTS.filter(k => picked.value.has(k))
  const changes = picked.value.has('changes')
  const text = await encodeChanges({
    edits: changes ? src.edits : [],
    rules: changes ? src.rules : [],
    presets: mergeParts(defaultPresets(), src.presets, parts, catOf),
    locks: changes ? src.locks : [],
    parts,
    name: profile.value.name
  })
  lastCode.value = text
  return text
}

async function copyCode () {
  if (!await copy(await makeCode(), 'code')) toast('Couldn\'t copy to the clipboard', { anchor: props.anchor })
}

async function saveFile () {
  try {
    const path = await hostRequest('text-file-save', { name: `${profile.value.name}.wokefilter`, text: await makeCode(), title: 'Save the shared loot filter', extensions: EXT }, 120_000)
    if (path) toast(`Saved to ${path}`, { anchor: props.anchor })
  } catch (e) {
    toast(`Couldn't save the file: ${(e as Error).message}`, { anchor: props.anchor })
  }
}
</script>

<style module>
.box {
  display: grid;
  gap: 8px;
  max-width: 34rem;
  margin-bottom: 8px;
  padding: 8px 10px;
  background: var(--w-panel-2);
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-md);
}
.parts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 14px;
}
.part {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: var(--w-fs-sm);
  cursor: pointer;
}
</style>
