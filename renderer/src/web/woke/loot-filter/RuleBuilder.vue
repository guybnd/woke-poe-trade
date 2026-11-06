<template>
  <div :class="$style.builder">
    <div class="flex items-center gap-2">
      <WField :model-value="rule.name" aria-label="Rule name" style="flex: 1; min-width: 0;" @update:model-value="v => rule.name = cleanValue(String(v)) || rule.name" />
      <WToggle v-model="rule.on" :title="rule.on ? 'Switch this rule off' : 'Switch it on'" />
      <button class="w-icon-btn" title="Delete this rule" aria-label="Delete this rule" @click="emit('delete')"><i class="fas fa-trash" /></button>
      <WInfo text="Goes above NeverSink's rules, so it wins for every item it catches." />
    </div>

    <div class="w-group-label" :class="$style.label">When the item is</div>
    <div v-for="(c, i) in rule.conditions" :key="i" :class="$style.cond">
      <span class="w-dim text-xs" :class="$style.condName">{{ conditionKind(c.key)?.label ?? c.key }}</span>
      <span :class="$style.condValue">
        <template v-if="kindOf(c) === 'list'">
          <span class="flex flex-wrap gap-1">
            <WChip v-for="v in c.values" :key="v" clickable :title="`Remove ${v}`" @click="c.values = c.values.filter(x => x !== v)">{{ v }} <i class="fas fa-times w-faint" /></WChip>
          </span>
          <input :class="$style.input" :list="`${uid}-${c.key}`" :placeholder="c.key === 'Class' ? 'Add a class…' : 'Add a base type…'" :aria-label="`Add ${conditionKind(c.key)?.label}`"
            @change="addValue(c, $event)" @keydown.enter="addValue(c, $event)">
          <datalist :id="`${uid}-${c.key}`">
            <option v-for="v in suggestions(c.key)" :key="v" :value="v" />
          </datalist>
          <div v-if="c.key === 'BaseType' && unknownBases(c.values).length" class="text-xs" style="color: var(--w-warn);">
            Check the spelling of {{ unknownBases(c.values).join(', ') }}: the game refuses a whole filter over a base it doesn't know.
          </div>
        </template>
        <template v-else-if="kindOf(c) === 'number'">
          <span class="flex items-center gap-1">
            <select :value="c.op || '=='" :class="$style.select" style="width: 3.4rem;" aria-label="Compare" @change="c.op = ($event.target as HTMLSelectElement).value">
              <option v-for="op in NUMBER_OPS" :key="op" :value="op">{{ op }}</option>
            </select>
            <input type="number" :min="conditionKind(c.key)?.min" :max="conditionKind(c.key)?.max" :value="c.values[0]" :class="$style.input" style="width: 5rem;"
              :aria-label="conditionKind(c.key)?.label" @change="c.values = [String(Math.round(Number(($event.target as HTMLInputElement).value)))]">
          </span>
        </template>
        <template v-else-if="kindOf(c) === 'rarity'">
          <span class="flex items-center gap-1">
            <select :value="c.op || '=='" :class="$style.select" style="width: 6.5rem;" aria-label="Rarity compare" @change="c.op = ($event.target as HTMLSelectElement).value">
              <option value="==">exactly</option>
              <option value="<=">up to</option>
              <option value=">=">at least</option>
            </select>
            <select :value="c.values[0]" :class="$style.select" aria-label="Rarity" @change="c.values = [($event.target as HTMLSelectElement).value]">
              <option v-for="r in RARITIES" :key="r" :value="r">{{ r }}</option>
            </select>
          </span>
        </template>
        <template v-else-if="kindOf(c) === 'bool'">
          <WSegmented :model-value="c.values[0] ?? 'False'" :options="[{ value: 'True', label: 'Yes' }, { value: 'False', label: 'No' }]" @update:model-value="v => c.values = [v]" />
        </template>
        <template v-else-if="kindOf(c) === 'influence'">
          <select :value="c.values[0]" :class="$style.select" aria-label="Influence" @change="c.values = [($event.target as HTMLSelectElement).value]">
            <option value="None">None</option>
            <option v-for="inf in INFLUENCES" :key="inf" :value="inf">{{ inf }}</option>
          </select>
        </template>
      </span>
      <button class="w-icon-btn" :title="`Remove ${conditionKind(c.key)?.label ?? c.key}`" :aria-label="`Remove ${conditionKind(c.key)?.label ?? c.key}`" @click="rule.conditions.splice(i, 1)"><i class="fas fa-times" /></button>
    </div>
    <select :class="$style.select" value="" aria-label="Add a condition" style="align-self: flex-start;" @change="addCondition($event)">
      <option value="" disabled>+ condition…</option>
      <option v-for="k in addable" :key="k.key" :value="k.key">{{ k.label }}</option>
    </select>

    <div v-if="problem" class="text-xs" style="color: var(--w-warn);"><i class="fas fa-exclamation-triangle" /> {{ problem }}. The rule is left out until then.</div>
    <div v-else class="text-xs w-dim">
      Catches {{ catches.count }} of {{ TEST_SET.length }} test items at T16<template v-if="catches.examples.length">: {{ catches.examples.join(', ') }}</template>.
    </div>

    <div class="w-group-label" :class="$style.label">Show it like</div>
    <StyleEditor :look="rule.patch" :visibility="rule.visibility" :preview-text="previewText" :copy-from="copyFrom"
      @patch="p => rule.patch = { ...rule.patch, ...p }" @visibility="v => rule.visibility = v" />
  </div>
</template>

<script setup lang="ts">
import { BASE_FACTS } from './base-facts'
import { computed } from 'vue'
import { WChip, WField, WInfo, WSegmented, WToggle } from '../ui'
import StyleEditor from './StyleEditor.vue'
import type { LootFilterStore } from './store'
import type { FilterCondition } from './parse'
import { readStyle } from './edits'
import type { StylePatch } from './edits'
import { CONDITION_KINDS, INFLUENCES, NUMBER_OPS, RARITIES, RULE_TYPE, cleanValue, conditionKind, knownValues, newCondition, ruleProblem, ruleTier } from './rules'
import type { OwnRule } from './rules'
import { everyDrop } from './drops'
import { matchItem } from './match'
import { groupName } from './groups'
import { ruleLabel } from './parse'

const props = defineProps<{
  store: LootFilterStore
  rule: OwnRule
}>()

const emit = defineEmits<{ (e: 'delete'): void }>()

const uid = `rb${Math.random().toString(36).slice(2, 8)}`
const TEST_SET = everyDrop(83)

function kindOf (c: FilterCondition) {
  return conditionKind(c.key)?.input ?? 'list'
}

// Lists and yes/no conditions once each; numbers can repeat (a range).
const addable = computed(() => CONDITION_KINDS.filter(k => k.input === 'number' || !props.rule.conditions.some(c => c.key === k.key)))

function addCondition (e: Event) {
  const el = e.target as HTMLSelectElement
  if (el.value) props.rule.conditions.push(newCondition(el.value))
  el.value = ''
}

function addValue (c: FilterCondition, e: Event) {
  const el = e.target as HTMLInputElement
  const v = cleanValue(el.value)
  if (v && !c.values.includes(v)) c.values = [...c.values, v]
  el.value = ''
}

const known = computed(() => ({
  Class: knownValues(props.store.doc.value, 'Class'),
  BaseType: knownValues(props.store.doc.value, 'BaseType')
}))

function unknownBases (values: string[]): string[] {
  return values.filter(v => !(v in BASE_FACTS) && !known.value.BaseType.includes(v))
}

function suggestions (key: string): string[] {
  return key === 'Class' ? known.value.Class : key === 'BaseType' ? known.value.BaseType : []
}

const problem = computed(() => ruleProblem(props.rule))

// How much of a pretend map's loot the rule catches, in the filter as it is.
const catches = computed(() => {
  const doc = props.store.doc.value
  if (!doc || problem.value || !props.rule.on) return { count: 0, examples: [] as string[] }
  const tier = ruleTier(props.rule)
  const hit = TEST_SET.filter(d => {
    const b = matchItem(doc, d.facts).final?.block
    return b?.type === RULE_TYPE && b.tier === tier
  })
  const names = hit.map(d => `${d.facts.rarity === 'Normal' || !d.facts.rarity || d.facts.itemClass === 'Stackable Currency' ? '' : `${d.facts.rarity.toLowerCase()} `}${d.facts.baseType ?? d.label}`)
  return { count: hit.length, examples: [...new Set(names)].slice(0, 4) }
})

const previewText = computed(() => props.rule.conditions.find(c => c.key === 'BaseType')?.values[0] ?? props.rule.name)

// Looks to copy: every shown tier of the filter, by group.
const copyFrom = computed(() => {
  const doc = props.store.doc.value
  const out: Array<{ tier: string, look: StylePatch }> = []
  const seen = new Set<string>()
  for (const b of doc?.blocks ?? []) {
    if (b.disabled || b.visibility === 'Hide' || !b.type || !b.tier || b.type.startsWith('woke->')) continue
    const label = b.tier.startsWith('#') ? `${groupName(b.type)}, line ${b.line}` : ruleLabel(b.type, b.tier)
    if (seen.has(label)) continue
    seen.add(label)
    out.push({ tier: label, look: readStyle(b.actions) })
  }
  return out
})
</script>

<style module>
.builder {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  padding: 8px 0 0;
}
.cond {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr) auto;
  gap: 6px;
  align-items: start;
  padding: 4px 0;
  border-bottom: 1px solid var(--w-line-soft);
}
.condName {
  padding-top: 4px;
}
.condValue {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.input {
  background: var(--w-panel-2);
  color: var(--w-fg);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  padding: 2px 6px;
  font-size: var(--w-fs-sm);
  min-width: 0;
}
.select {
  background: var(--w-panel-2);
  color: var(--w-fg);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  padding: 2px 4px;
  font-size: var(--w-fs-sm);
}
</style>
