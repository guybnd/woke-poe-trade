<template>
  <span :class="$style.line">
    <template v-for="g in groups" :key="g.key">
      <span :class="$style.part">
        <span :class="$style.word">{{ g.label }}</span>
        <template v-if="g.exact"><NumBox :check="g.exact" :spec="g.spec" @set="emitSet" /></template>
        <template v-else-if="g.lo && g.hi"><NumBox :check="g.lo" :spec="g.spec" :hi="g.hi.value" @set="emitSet" /><span>–</span><NumBox :check="g.hi" :spec="g.spec" :lo="g.lo.value" @set="emitSet" /></template>
        <template v-else-if="g.lo"><NumBox :check="g.lo" :spec="g.spec" @set="emitSet" /><span>+</span></template>
        <template v-else-if="g.hi"><span :class="$style.word">up to</span><NumBox :check="g.hi" :spec="g.spec" @set="emitSet" /></template>
      </span>
    </template>
  </span>
</template>

<script setup lang="ts">
// A rule's numbers as words with the values in boxes: "Passives up to [8] ·
// Item level [84]+". Changing a box sets that bound on the rule.
import { computed, defineComponent, h } from 'vue'
import type { PropType } from 'vue'
import { NUMBER_KEYS, numberChecks } from './numbers'
import type { NumberCheck, NumberSpec } from './numbers'
import type { FilterCondition } from './parse'
import type { NumberBound } from './edits'

const props = defineProps<{ conditions: FilterCondition[], disabled?: boolean, name?: string }>()
const emit = defineEmits<{ (e: 'set', key: string, bound: NumberBound, value: number): void }>()

const groups = computed(() => {
  const checks = numberChecks(props.conditions)
  return [...new Set(checks.map(c => c.key))].map(key => ({
    key,
    label: NUMBER_KEYS[key].label,
    spec: NUMBER_KEYS[key],
    lo: checks.find(c => c.key === key && c.bound === 'min'),
    hi: checks.find(c => c.key === key && c.bound === 'max'),
    exact: checks.find(c => c.key === key && c.bound === 'exact')
  }))
})

function emitSet (c: NumberCheck, value: number) {
  emit('set', c.key, c.bound, value)
}

const BOUND_WORDS: Record<NumberBound, string> = { min: 'lowest', max: 'highest', exact: '' }

// One number box. Enter or leaving it commits; Esc puts it back.
const NumBox = defineComponent({
  // lo / hi: the other end of a range, which this box can't pass.
  props: { check: { type: Object as PropType<NumberCheck>, required: true }, spec: { type: Object as PropType<NumberSpec>, required: true }, lo: { type: Number, default: null }, hi: { type: Number, default: null } },
  emits: ['set'],
  setup (p, { emit: e }) {
    function commit (ev: Event) {
      const input = ev.target as HTMLInputElement
      const n = Math.round(Number(input.value))
      if (input.value.trim() === '' || !Number.isFinite(n)) { input.value = String(p.check.value); return }
      const v = Math.min(p.hi ?? p.spec.max, p.spec.max, Math.max(p.lo ?? p.spec.min, p.spec.min, n))
      input.value = String(v)
      if (v !== p.check.value) e('set', p.check, v)
    }
    return () => h('input', {
      'class': ['w-input', 'w-num', 'w-focusable'],
      'style': 'width: 3.2rem; padding: 0 3px; text-align: center; font-weight: 600;',
      'type': 'number',
      'min': p.spec.min,
      'max': p.spec.max,
      'value': p.check.value,
      'disabled': props.disabled,
      'aria-label': [props.name, `${BOUND_WORDS[p.check.bound]} ${p.spec.label.toLowerCase()}`.trim()].filter(Boolean).join(': '),
      'onClick': (ev: Event) => ev.stopPropagation(),
      'onKeydown': (ev: KeyboardEvent) => {
        ev.stopPropagation()
        if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur()
        if (ev.key === 'Escape') { (ev.target as HTMLInputElement).value = String(p.check.value); (ev.target as HTMLInputElement).blur() }
      },
      'onChange': commit
    })
  }
})
</script>

<style module>
.line { display: inline-flex; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 0; }
.part { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
.word { font-weight: 600; }
</style>
