<template>
  <div :class="$style.page">
    <div :class="$style.tools">
      <w-field v-model="query" type="search" icon="fas fa-search" placeholder="Find an action or key" :class="$style.find" />
      <w-chip clickable :active="onlyProblems" @click="onlyProblems = !onlyProblems">
        Clashes only<template v-if="problemCount"> · {{ problemCount }}</template>
      </w-chip>
    </div>

    <div v-if="problemCount && !onlyProblems" :class="$style.banner">
      {{ problemCount }} key{{ problemCount > 1 ? 's' : '' }} with a problem. Only one action on a key works; change one of them below.
    </div>

    <template v-for="g in groups" :key="g.name">
      <w-setting-section :title="g.name">
        <div v-for="f in g.fields" :key="f.id" :class="[$style.row, { [$style.bad]: problemOf(f), [$style.off]: f.off }]">
          <span :class="$style.label">{{ f.label }}</span>
          <span :class="$style.status">
            <template v-if="problemOf(f)">{{ problemOf(f) }}</template>
            <template v-else-if="f.off">Module off, key is free</template>
            <template v-else-if="gameNoteOf(f)">{{ gameNoteOf(f) }}</template>
          </span>
          <span v-if="f.hold" :class="$style.hold">
            <w-segmented :model-value="f.hold.get()" :options="HOLD" @update:model-value="f.hold!.set(String($event))" />
            <span class="w-dim">+</span>
          </span>
          <w-hotkey-cell :model-value="f.get()" :required="f.required" :no-mod-keys="f.noModKeys" quiet
            @update:model-value="f.set($event)" />
          <button v-if="f.page" type="button" class="w-icon-btn" :title="`Open ${f.group} settings`" @click="emit('open', f.page)">
            <i class="fas fa-arrow-right" />
          </button>
          <span v-else :class="$style.spacer" />
        </div>
      </w-setting-section>
    </template>
    <w-empty v-if="!groups.length" icon="fas fa-keyboard">{{ onlyProblems ? 'No clashes. Every key does one thing.' : 'Nothing matches.' }}</w-empty>

    <w-setting-section title="Stash">
      <w-setting-row label="Scroll stash tabs with Ctrl + mouse wheel">
        <w-toggle v-model="config.stashScroll" />
      </w-setting-row>
    </w-setting-section>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { Config } from '@/web/Config'
import { WChip, WEmpty, WField, WHotkeyCell, WSegmented, WSettingRow, WSettingSection, WToggle, normalizeKey, useHotkeyContext } from '../ui'
import { poeBindNote, reservedKeyNote } from '../ui/hotkey-context'
import { fieldKey, hotkeyFields } from './hotkey-fields'
import type { HotkeyField } from './hotkey-fields'

const props = defineProps<{ config: Config }>()
const emit = defineEmits<{ (e: 'open', page: string): void }>()

const HOLD = [{ value: 'Ctrl', label: 'Ctrl' }, { value: 'Alt', label: 'Alt' }]
const query = shallowRef('')
const onlyProblems = shallowRef(false)
const ctx = useHotkeyContext()

const fields = computed(() => hotkeyFields(props.config))

function problemOf (f: HotkeyField): string | null {
  const k = fieldKey(f)
  if (!k) return null
  const reserved = reservedKeyNote(k)
  if (reserved) return reserved
  if (!ctx) return null
  const norm = normalizeKey(k)
  const uses = ctx.uses.value.get(norm) ?? []
  if (f.off) {
    return uses.length ? `Would clash with ${uses[0]} if turned on` : null
  }
  if (ctx.failed.value.has(norm)) return 'Another program holds this key'
  const others = uses.filter(l => l !== f.label)
  return uses.length > 1 ? `Same key as ${others.join(', ') || 'another action'}` : null
}

// Not a problem: taking a game key can be exactly what you meant.
function gameNoteOf (f: HotkeyField): string | null {
  const k = fieldKey(f)
  if (!k || !ctx || f.off) return null
  const action = ctx.poeBinds.value.get(normalizeKey(k))
  return action ? poeBindNote(action) : null
}

const problemCount = computed(() => new Set(fields.value.filter(f => !f.off && problemOf(f)).map(f => normalizeKey(fieldKey(f)!))).size)

const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = fields.value.filter(f =>
    (!onlyProblems.value || problemOf(f)) &&
    (!q || f.label.toLowerCase().includes(q) || f.group.toLowerCase().includes(q) || (fieldKey(f) ?? '').toLowerCase().includes(q)))
  const map = new Map<string, HotkeyField[]>()
  // Problems first, as their own group, so they're the first thing you see.
  const problems = list.filter(f => !f.off && problemOf(f))
  if (problems.length && !onlyProblems.value) map.set('Clashes', problems)
  for (const f of list) {
    if (map.get('Clashes')?.includes(f)) continue
    map.set(f.group, [...(map.get(f.group) ?? []), f])
  }
  return [...map.entries()].map(([name, fields]) => ({ name, fields }))
})
</script>

<style module>
.page { display: flex; flex-direction: column; gap: var(--w-s5); }
.tools { display: flex; gap: var(--w-s2); align-items: center; }
.find { flex: 1; max-width: 22rem; }
.banner {
  font-size: var(--w-fs-sm); color: var(--w-fg); padding: var(--w-s2) var(--w-s3);
  border: 1px solid var(--w-down); border-radius: var(--w-r-sm); background: color-mix(in srgb, var(--w-down) 12%, transparent);
}
.row {
  display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto 24px; align-items: center; gap: var(--w-s2);
  min-height: var(--w-row-h); padding: 2px var(--w-s1); border-bottom: 1px solid var(--w-line-soft);
}
.label { color: var(--w-fg); font-size: var(--w-fs-md); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status { font-size: var(--w-fs-xs); color: var(--w-dim); text-align: right; max-width: 16rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bad { background: color-mix(in srgb, var(--w-down) 10%, transparent); }
.bad .status { color: var(--w-down); }
.off .label { color: var(--w-dim); }
.hold { display: inline-flex; align-items: center; gap: var(--w-s1); }
.spacer { width: 24px; }
</style>
