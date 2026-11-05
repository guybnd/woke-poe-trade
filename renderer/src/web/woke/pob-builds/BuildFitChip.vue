<template>
  <span v-for="f in fits" :key="f.label" :class="$style.chip" :title="f.title">
    <i class="fas fa-user-check" :class="$style.icon" />
    <SocketDots v-if="f.colours" :colours="f.colours" />
    {{ f.label }}
  </span>
</template>

<script setup lang="ts">
// Price check chip: does the checked item fit the active PoB build?
import { computed } from 'vue'
import type { ParsedItem } from '@/parser'
import { ItemCategory, ItemRarity } from '@/parser'
import SocketDots from './SocketDots.vue'
import { useActiveBuild } from './active'
import { bestFit, buildFacts, linkColours, loadoutOf, mainGroupOf } from './build-model'
import type { GemColour } from './gems'

const props = defineProps<{ item: ParsedItem }>()
const build = useActiveBuild()

interface Fit { label: string, title: string, colours?: GemColour[] }

const fits = computed<Fit[]>(() => {
  const d = build.details.value
  if (!d) return []
  const item = props.item
  const level = build.level.value
  const act = build.act.value
  const pick = build.loadout.value
  const facts = buildFacts(d, level, act, pick)
  const name = item.info.refName
  const out: Fit[] = []
  if (item.category === ItemCategory.Gem) {
    if (facts.gems.includes(name)) out.push({ label: 'In your build', title: `${name} is in your build's gem setups` })
    return out
  }
  if (item.rarity === ItemRarity.Unique) {
    const u = facts.uniques.find(x => x.name === name)
    if (u) out.push({ label: `In your build · ${u.slot}`, title: `Your build uses ${name}` })
  } else {
    const b = facts.bases.find(x => x.base === name)
    if (b) out.push({ label: `Your base · ${b.slot}`, title: `Your build wears a rare ${name}` })
    const sockets = /^Sockets: (.+)$/m.exec(item.rawText)?.[1]
    const set = loadoutOf(d, level, act, pick).skillSet?.item
    const main = set ? mainGroupOf(set.groups) : null
    if (sockets && main) {
      const colours = linkColours(main)
      const n = bestFit(sockets, colours)
      if (n >= 3) out.push({ label: 'Your colours', colours: colours.slice(0, n), title: `Has a ${n}-link that fits your main link's first ${n} gems` })
    }
  }
  return out
})
</script>

<style module>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 0.5rem;
  padding: 0 8px;
  border-radius: var(--w-r-pill);
  line-height: 18px;
  font-size: var(--w-fs-sm);
  white-space: nowrap;
  color: var(--w-accent);
  background: var(--w-accent-soft);
  border: 1px solid var(--w-line-strong);
}
.icon { font-size: var(--w-fs-xs); }
</style>
