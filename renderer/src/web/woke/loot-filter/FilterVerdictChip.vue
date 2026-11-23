<template>
  <button v-if="verdict?.tone === 'quiet'" type="button" :class="$style.quiet" aria-haspopup="menu"
    :title="verdict.title" aria-label="Loot filter: go to rule or hide it" @click="openFixMenu"><i :class="verdict.icon" /></button>
  <span v-else-if="verdict" :class="[$style.chip, $style[verdict.tone]]" :title="verdict.title">
    <i :class="[verdict.icon, $style.icon]" />
    {{ verdict.label }}
    <button v-if="verdict.rule || verdict.fix" type="button" :class="$style.fix" aria-haspopup="menu"
      title="Go to its rule, or change it here" @click="openFixMenu">Fix <i class="fas fa-caret-down" /></button>
  </span>
</template>

<script setup lang="ts">
// Price check chip: what your loot filter does with the checked item, shown
// only when it matters (hidden, or a valuable item with a small label). Its
// Fix menu goes to the rule in the editor, or makes the change here.
import { computed } from 'vue'
import { ItemRarity } from '@/parser'
import type { ParsedItem } from '@/parser'
import { usePoeninja } from '@/web/background/Prices'
import { getDetailsId } from '@/web/price-check/trends/getDetailsId'
import { openMenu, toast } from '../ui'
import type { MenuEntry } from '../ui'
import { useActiveFilter } from './active-filter'
import { checkedItemFacts } from './checked-facts'
import { matchItem } from './match'
import { conditionSignature, readStyle } from './edits'
import { ownMatchActions } from './look'
import type { StylePatch } from './edits'
import { SAFETY_LOOK, SAFETY_RULE_TYPE } from './safety'
import { ruleLabel } from './parse'
import { openRuleInEditor } from './open-rule'
import type { RuleRef } from './open-rule'

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
  tone: 'bad' | 'warn' | 'dim' | 'good' | 'quiet'
  icon: string
  label: string
  title: string
  // The rule that decides it, for "Go to rule".
  rule?: RuleRef
  fix?: { label: string, run: () => void }
}

const verdict = computed<Verdict | null>(() => {
  const store = active.value
  const doc = store?.doc.value
  if (!store || !doc || props.item.rawText === 'VIRTUAL_ITEM' || props.item.rollsFromData) return null
  const facts = checkedItemFacts(doc, props.item.rawText, props.item)
  const m = matchItem(doc, { ...facts, areaLevel: store.areaLevel.value ?? store.config.fallbackAreaLevel })
  const b = m.final?.block
  const where = ruleLabel(b?.type ?? null, b?.tier ?? null)
  const price = chaos.value
  const line = store.config.safetyNet.minChaos
  const base = facts.baseType
  const unique = props.item.rarity === ItemRarity.Unique
  const canOwn = Boolean(base && b?.type && b.tier && !b.type.startsWith('woke->'))
  const rule = b?.type && b.tier && !b.tier.startsWith('#') ? { type: b.type, tier: b.tier } : undefined
  const own = (visibility: 'Show' | 'Hide', patch: StylePatch, text: string) => () => {
    const undo = store.editWithUndo({ kind: 'item', type: b!.type!, tier: b!.tier!, base: base!, visibility, patch, anchor: conditionSignature(b!), pin: visibility === 'Show' })
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
      rule,
      fix: canOwn ? { label: 'Show it', run: own('Show', valuable ? SAFETY_LOOK : {}, `${base} now shows`) } : undefined
    }
  }
  // The rules' own size: the look strip scales it for everything alike.
  const look = readStyle(ownMatchActions(m))
  if (price != null && price >= 10 && (look.fontSize ?? 32) < 30 && !look.sound) {
    return {
      tone: 'warn',
      icon: 'fas fa-compress-alt',
      label: 'Small label in your filter',
      title: `Shown small by ${where}, with no sound.`,
      rule,
      fix: canOwn ? { label: 'Make it stand out', run: own('Show', { fontSize: 40, sound: { id: '2', volume: 300 } }, `${base} now stands out`) } : undefined
    }
  }
  // Shown as it should be: only an icon, for hiding it or finding its rule.
  if (!rule && !canOwn) return null
  return {
    tone: 'quiet',
    icon: 'fas fa-filter',
    label: '',
    title: `Your filter shows this: ${where}.`,
    rule,
    // Never offered on an item worth your safety net line: one click there
    // would throw away something valuable. The label says how wide it goes:
    // for a unique, it's every unique on that base.
    fix: canOwn && !(price != null && price >= line)
      ? (unique
          ? { label: `Hide every unique ${base}`, run: own('Hide', {}, `Every unique ${base} now hidden`) }
          : { label: 'Hide it', run: own('Hide', {}, `${base} now hidden`) })
      : undefined
  }
})

function openFixMenu (e: MouseEvent) {
  const v = verdict.value
  if (!v) return
  const items: MenuEntry[] = []
  const rule = v.rule
  if (rule) {
    items.push({
      label: 'Go to rule',
      icon: 'fas fa-arrow-right',
      action: () => { if (!openRuleInEditor(rule)) toast('The loot filter editor is not loaded.') }
    })
  }
  if (v.fix) items.push({ label: v.fix.label, icon: v.tone === 'quiet' ? 'fas fa-eye-slash' : 'fas fa-eye', action: v.fix.run })
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  openMenu({ x: r.left, y: r.bottom + 2, from: el }, items)
}
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
.quiet {
  margin-left: 0.5rem;
  padding: 0 4px;
  border-radius: var(--w-r-pill);
  color: var(--w-faint, var(--w-dim));
  font-size: var(--w-fs-xs);
  line-height: calc(18px * var(--w-text-scale, 1));
}
.quiet:hover { color: var(--w-fg); background: var(--w-panel-3); }
</style>
