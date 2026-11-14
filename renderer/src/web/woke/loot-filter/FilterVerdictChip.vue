<template>
  <span v-if="verdict" :class="[$style.chip, $style[verdict.tone]]" :title="verdict.title">
    <i :class="[verdict.icon, $style.icon]" />
    {{ verdict.label }}
    <button v-if="verdict.fix" type="button" :class="$style.fix" @click="verdict.fix.run()">{{ verdict.fix.label }}</button>
  </span>
</template>

<script setup lang="ts">
// Price check chip: what your loot filter does with the checked item, shown
// only when it matters (hidden, or a valuable item with a small label), with
// a one-click fix.
import { computed } from 'vue'
import type { ParsedItem } from '@/parser'
import { usePoeninja } from '@/web/background/Prices'
import { getDetailsId } from '@/web/price-check/trends/getDetailsId'
import { toast } from '../ui'
import { useActiveFilter } from './active-filter'
import { itemFacts } from './item-facts'
import { matchItem } from './match'
import { conditionSignature, readStyle } from './edits'
import type { StylePatch } from './edits'
import { SAFETY_LOOK, SAFETY_RULE_TYPE } from './safety'
import { ruleLabel } from './parse'

const props = defineProps<{ item: ParsedItem }>()
const active = useActiveFilter()
const ninja = usePoeninja()

const chaos = computed(() => {
  try {
    const id = getDetailsId(props.item)
    return id ? (ninja.findPriceByQuery(id)?.chaos ?? null) : null
  } catch { return null }
})

interface Verdict {
  tone: 'bad' | 'warn' | 'dim' | 'good'
  icon: string
  label: string
  title: string
  fix?: { label: string, run: () => void }
}

const verdict = computed<Verdict | null>(() => {
  const store = active.value
  const doc = store?.doc.value
  if (!store || !doc || props.item.rawText === 'VIRTUAL_ITEM' || props.item.rollsFromData) return null
  const facts = itemFacts(props.item.rawText, props.item)
  const m = matchItem(doc, { ...facts, areaLevel: store.areaLevel.value ?? store.config.fallbackAreaLevel })
  const b = m.final?.block
  const where = ruleLabel(b?.type ?? null, b?.tier ?? null)
  const price = chaos.value
  const line = store.config.safetyNet.minChaos
  const base = facts.baseType
  const canOwn = Boolean(base && b?.type && b.tier && !b.type.startsWith('woke->'))
  const own = (visibility: 'Show', patch: StylePatch, text: string) => () => {
    const undo = store.editWithUndo({ kind: 'item', type: b!.type!, tier: b!.tier!, base: base!, visibility, patch, anchor: conditionSignature(b!), pin: true })
    store.save()
    toast(text, { undo: () => { undo(); store.save() } })
  }

  if (b?.type === SAFETY_RULE_TYPE) {
    return { tone: 'good', icon: 'fas fa-life-ring', label: 'Safety net shows this', title: 'Your filter would hide it, but it is worth more than your safety net line, so it shows.' }
  }
  if (m.visibility === 'Hide') {
    const valuable = price != null && price >= Math.min(line, 10)
    return {
      tone: valuable ? 'bad' : 'dim',
      icon: 'fas fa-eye-slash',
      label: 'Your filter hides this',
      title: `Hidden by ${where}.`,
      fix: canOwn ? { label: 'Show it', run: own('Show', valuable ? SAFETY_LOOK : {}, `${base} now shows`) } : undefined
    }
  }
  const look = readStyle(m.actions)
  if (price != null && price >= 10 && (look.fontSize ?? 32) < 30 && !look.sound) {
    return {
      tone: 'warn',
      icon: 'fas fa-compress-alt',
      label: 'Small label in your filter',
      title: `Shown small by ${where}, with no sound.`,
      fix: canOwn ? { label: 'Make it stand out', run: own('Show', { fontSize: 40, sound: { id: '2', volume: 300 } }, `${base} now stands out`) } : undefined
    }
  }
  return null
})
</script>

<style module>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 0.5rem;
  padding: 0 4px 0 8px;
  border-radius: var(--w-r-pill);
  line-height: calc(18px * var(--w-text-scale, 1));
  font-size: var(--w-fs-sm);
  white-space: nowrap;
  border: 1px solid var(--w-line-strong);
}
.bad { color: var(--w-down); background: color-mix(in srgb, var(--w-down) 12%, transparent); }
.warn { color: var(--w-warn); background: color-mix(in srgb, var(--w-warn) 12%, transparent); }
.dim { color: var(--w-dim); }
.good { color: var(--w-up); }
.icon { font-size: var(--w-fs-xs); }
.fix {
  margin-left: 2px;
  padding: 0 6px;
  border-radius: var(--w-r-pill);
  background: var(--w-panel-3);
  color: var(--w-fg);
  font-size: var(--w-fs-xs);
}
.fix:hover { background: var(--w-accent); color: var(--w-accent-fg); }
</style>
