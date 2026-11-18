<template>
  <div :class="$style.band">
    <div class="flex items-center gap-2 flex-wrap">
      <span :class="$style.title">Worth money</span>
      <span class="w-dim text-xs">These rules come first: a jewel whose passive type sells is shown here, whatever its rule below says.</span>
    </div>
    <div class="flex items-center gap-3 flex-wrap text-xs">
      <WToggle :model-value="settings.on" @update:model-value="settings.on = $event">Follow poe.ninja</WToggle>
      <template v-if="settings.on">
        <label class="flex items-center gap-1">Top at
          <input class="w-input w-num" type="number" min="1" :value="settings.top" :class="$style.num" aria-label="Top rule: worth at least, in chaos" @keydown.enter="($event.target as HTMLInputElement).blur()" @change="setLine('top', $event)">c
        </label>
        <label class="flex items-center gap-1">Good at
          <input class="w-input w-num" type="number" min="1" :value="settings.good" :class="$style.num" aria-label="Good rule: worth at least, in chaos" @keydown.enter="($event.target as HTMLInputElement).blur()" @change="setLine('good', $event)">c
        </label>
        <span class="w-faint">{{ status }}</span>
      </template>
      <span v-else class="w-faint">NeverSink's own list, from its last release.</span>
    </div>

    <div v-for="s in sizes" :key="s.size" :class="$style.size">
      <div :class="$style.sizeHead">{{ s.size }} Cluster Jewel <span class="w-faint text-xs">· {{ s.on }} rules on<template v-if="s.off"> · {{ s.off }} off</template></span></div>
      <button v-for="r in s.rules" :key="r.tier" type="button" class="w-focusable" :class="$style.rule" :title="`Open the rule (${r.tier})`" @click="emit('open-rule', r.tier)">
        <span :class="$style.ruleHead">{{ r.head }}</span>
        <LabelPreview :text="`${s.size} Cluster Jewel`" :actions="r.block.actions" :extras="false" style="max-width: 100%; overflow: hidden;" />
        <span :class="$style.nodes">
          <span v-for="n in r.nodes" :key="n.node" :class="$style.node">{{ n.node }}<span v-if="n.chaos != null" class="w-faint">&nbsp;{{ fmt(n.chaos) }}</span><i v-if="pinOf(s.size, n.node)" class="fas fa-thumbtack" :class="$style.pinIcon" aria-label="your pick" /></span>
        </span>
      </button>
      <details :class="$style.pins">
        <summary class="text-xs w-focusable">Passive types · pick your own</summary>
        <div class="text-xs w-faint" style="padding: 2px 0 4px;">Click to cycle: by price → always top → always good → never. Price is the best at item level 84.</div>
        <div class="flex flex-wrap gap-1">
          <button v-for="n in s.types" :key="n.node" type="button" class="w-focusable" :class="[$style.pick, pinOf(s.size, n.node) && $style[pinOf(s.size, n.node)!]]" :aria-label="`${n.node}: ${pinWords(pinOf(s.size, n.node))}`" @click="cyclePin(s.size, n.node)">
            {{ n.node }}<span v-if="n.chaos != null" class="w-faint">&nbsp;{{ fmt(n.chaos) }}</span>
            <span v-if="pinOf(s.size, n.node)" :class="$style.pinWord">&nbsp;{{ pinWords(pinOf(s.size, n.node)) }}</span>
          </button>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
// The cluster jewel price rules ([2705]) on the Cluster page: what each names,
// at what price, the lines that sort passive types into top and good, and
// your own picks.
import { computed } from 'vue'
import { WToggle, agoPhrase } from '../ui'
import LabelPreview from './LabelPreview.vue'
import { CLUSTER_PRICE_TYPE, MIN_LISTINGS, nodesOf, priceOnRule, rankOf, ruleKey } from './cluster-prices'
import type { ClusterPin, ClusterPrice, ClusterPriceSettings } from './cluster-prices'
import type { ClusterSize } from '../cluster-type/types'
import type { FilterDoc } from './parse'

const props = defineProps<{
  doc: FilterDoc
  settings: ClusterPriceSettings
  prices: ClusterPrice[] | null
  updatedAt: number | null
  error: string | null
}>()
const emit = defineEmits<{ (e: 'open-rule', tier: string): void }>()

const SIZES: ClusterSize[] = ['Large', 'Medium', 'Small']

const status = computed(() => {
  if (props.prices?.length) return props.updatedAt ? `Prices ${agoPhrase(props.updatedAt)}` : ''
  if (props.error) return `No prices: ${props.error}. NeverSink's list stays.`
  if (props.prices) return "poe.ninja has no cluster jewel prices for this league yet; NeverSink's list stays."
  return 'Waiting for prices; NeverSink\'s list until then.'
})

function fmt (chaos: number): string {
  return chaos >= 10 ? `${Math.round(chaos)}c` : `${chaos.toFixed(1)}c`
}

const sizes = computed(() => SIZES.map(size => {
  const blocks = props.doc.blocks.filter(b => b.type === CLUSTER_PRICE_TYPE && ruleKey(b)?.size === size)
  // Rules that name the same types at the same rank read as one line:
  // "Top · 12, 11 passives · item level 68+".
  const groups = new Map<string, typeof blocks>()
  for (const b of blocks.filter(b => !b.disabled)) {
    const key = JSON.stringify([rankOf(b.tier), b.conditions.find(c => c.key === 'EnchantmentPassiveNode')?.values ?? []])
    groups.set(key, [...(groups.get(key) ?? []), b])
  }
  const rules = [...groups.values()].map(list => {
    const b = list[0]
    const keys = list.map(x => ruleKey(x)!)
    const rank = rankOf(b.tier)
    const passives = [...new Set(keys.flatMap(k => k.passives))].sort((x, y) => y - x)
    const ilvl = Math.min(...keys.map(k => k.ilvl))
    const nodes = b.conditions.find(c => c.key === 'EnchantmentPassiveNode')?.values ?? []
    // A type's price where it's worth most among these rules.
    const best = (node: string) => {
      const ps = keys.map(k => priceOnRule(props.prices ?? [], k, node)).filter((x): x is number => x != null)
      return ps.length ? Math.max(...ps) : null
    }
    return {
      tier: b.tier ?? '',
      block: b,
      head: `${rank === 1 ? 'Top' : rank === 2 ? 'Good' : 'Rule'} · ${passives.join(', ')} passives · item level ${ilvl}+`,
      nodes: nodes.map(node => ({ node, chaos: best(node) })).sort((a, z) => (z.chaos ?? -1) - (a.chaos ?? -1))
    }
  })
  const types = nodesOf(size).map(node => {
    const best = (props.prices ?? []).filter(p => p.size === size && p.node === node && p.ilvl === 84 && p.listings >= MIN_LISTINGS)
    return { node, chaos: best.length ? Math.max(...best.map(p => p.chaos)) : null }
  }).sort((a, b) => (b.chaos ?? -1) - (a.chaos ?? -1))
  return { size, rules, on: blocks.filter(b => !b.disabled).length, off: blocks.filter(b => b.disabled).length, types }
}))

function pinOf (size: ClusterSize, node: string): ClusterPin | undefined {
  return props.settings.pins[`${size}|${node}`]
}

const NEXT: Record<string, ClusterPin | undefined> = { none: 'top', top: 'good', good: 'never', never: undefined }

function cyclePin (size: ClusterSize, node: string) {
  const key = `${size}|${node}`
  const next = NEXT[pinOf(size, node) ?? 'none']
  const rest = Object.fromEntries(Object.entries(props.settings.pins).filter(([k]) => k !== key))
  // The settings are the editor's presets, changed in place like the other presets.
  props.settings.pins = next ? { ...rest, [key]: next } : rest
}

function pinWords (p: ClusterPin | undefined): string {
  return p === 'top' ? 'always top' : p === 'good' ? 'always good' : p === 'never' ? 'never' : 'by price'
}

function setLine (which: 'top' | 'good', e: Event) {
  const input = e.target as HTMLInputElement
  const n = Number(input.value)
  if (!Number.isFinite(n) || n <= 0) { input.value = String(props.settings[which]); return }
  const v = Math.round(n * 10) / 10

  props.settings[which] = v
  // The good line stays at or under the top one.
  if (which === 'top' && props.settings.good > v) props.settings.good = v
  if (which === 'good' && v > props.settings.top) props.settings.top = v
}
</script>

<style module>
.band {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
}
.title { font-family: var(--w-font-title, inherit); color: var(--w-accent); }
.num { width: 4.2rem; padding: 0 3px; }
.size { display: flex; flex-direction: column; gap: 3px; }
.sizeHead { color: var(--w-accent); font-size: var(--w-fs-sm); padding-top: 4px; }
.rule {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 11rem;
  gap: 8px;
  align-items: center;
  padding: 4px 6px;
  background: var(--w-panel);
  border: 1px solid var(--w-line);
  color: var(--w-fg);
  text-align: left;
  font: inherit;
  cursor: pointer;
}
.rule:hover { border-color: var(--w-line-strong); }
.ruleHead { font-weight: 600; font-size: var(--w-fs-sm); }
.nodes { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 2px 8px; font-size: var(--w-fs-xs, 11px); min-width: 0; }
.node { white-space: nowrap; color: var(--w-fg); }
.pinIcon { margin-left: 3px; font-size: 0.75em; color: var(--w-accent); }
.pins summary { cursor: pointer; color: var(--w-dim); }
.pick {
  padding: 1px 6px;
  font: inherit;
  font-size: var(--w-fs-xs, 11px);
  background: var(--w-panel);
  color: var(--w-fg);
  border: 1px solid var(--w-line);
  cursor: pointer;
}
.pick.top { border-color: var(--w-accent); }
.pick.good { border-color: var(--w-ok, #6fbf6a); }
.pick.never { opacity: 0.55; text-decoration: line-through; }
.pinWord { margin-left: 4px; color: var(--w-accent); }
@media (max-width: 500px) { .rule { grid-template-columns: 1fr; } }
</style>
