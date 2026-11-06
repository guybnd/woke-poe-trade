<template>
  <span v-for="f in fits" :key="f.label" :class="$style.chip" :title="f.title">
    <i class="fas fa-user-check" :class="$style.icon" />
    <SocketDots v-if="f.colours" :colours="f.colours" />
    {{ f.label }}
  </span>
  <span v-if="swap" :class="$style.chip" tabindex="0" data-swap-chip
    @mouseenter="showSwap" @mouseleave="hideTip" @focus="showSwap" @blur="hideTip">
    <i class="fas fa-balance-scale" :class="$style.icon" />
    Compare to your {{ swap.label }}
  </span>
</template>

<script setup lang="ts">
// Price check chip: does the checked item fit the active PoB build?
import { computed, onBeforeUnmount } from 'vue'
import type { ParsedItem } from '@/parser'
import { ItemCategory, ItemRarity, parseClipboard } from '@/parser'
import SocketDots from './SocketDots.vue'
import { useActiveBuild } from './active'
import { bestFit, buildFacts, linkColours, loadoutOf, mainGroupOf, realSets, slotLabel } from './build-model'
import { pobItemText } from './item-text'
import { slotsFor, swapCheck } from './swap-check'
import type { SwapResult } from './swap-check'
import { hideTip, showTip } from '../ui/tooltip/tooltip'
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

// Rings go against whichever one you'd lose least by replacing.
const ORDER: Record<SwapResult['verdict'], number> = { better: 0, mixed: 1, same: 2, worse: 3 }

function cost (r: SwapResult) {
  return ORDER[r.verdict] * 100 + r.rows.filter(x => x.tone === 'down').length
}

const swap = computed<{ label: string, title: string, result: SwapResult } | null>(() => {
  const d = build.details.value
  if (!d || props.item.isUnidentified) return null
  const slots = slotsFor(props.item.category)
  if (!slots.length) return null
  const worn = loadoutOf(d, build.level.value, build.act.value, build.loadout.value).itemSet?.item
  if (!worn) return null
  // What PoB saved only describes this gear if it's the set it saved on.
  const sets = realSets(d.itemSets ?? [])
  const stats = (sets.length < 2 || worn.isActive) ? d.stats ?? null : null
  let best: { label: string, title: string, result: SwapResult } | null = null
  for (const slot of slots) {
    const label = slot === 'Body Armour' ? 'body armour' : slotLabel(slot).toLowerCase().replace(/ \d$/, '')
    const number = /^Ring (\d)$/.exec(slot)?.[1]
    const title = `Against your ${label}${number ? ` ${number}` : ''}`
    const item = worn.slots.find(x => x.slot === slot)?.item
    if (!item) {
      // A third ring slot only exists with a Kalandra's Touch.
      if (slot === 'Ring 3') continue
      return { label, title: `Your ${label}${number ? ` ${number}` : ''} slot`, result: { verdict: 'better', summary: 'You wear nothing there in this set.', rows: [] } }
    }
    const yours = parseClipboard(pobItemText(item))
    if (yours.isErr()) continue
    const result = swapCheck(yours.value, props.item, stats)
    if (!best || cost(result) < cost(best.result)) best = { label, title, result }
  }
  return best
})

function showSwap (e: Event) {
  if (swap.value) showTip(e, { kind: 'swap', title: swap.value.title, result: swap.value.result })
}

onBeforeUnmount(hideTip)
</script>

<style module>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 0.5rem;
  padding: 0 8px;
  border-radius: var(--w-r-pill);
  line-height: calc(18px * var(--w-text-scale, 1));
  font-size: var(--w-fs-sm);
  white-space: nowrap;
  color: var(--w-accent);
  background: var(--w-accent-soft);
  border: 1px solid var(--w-line-strong);
}
.icon { font-size: var(--w-fs-xs); }
</style>
