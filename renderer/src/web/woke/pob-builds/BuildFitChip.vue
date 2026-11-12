<template>
  <span v-for="f in fits" :key="f.label" :class="$style.chip" :title="f.title">
    <i class="fas fa-user-check" :class="$style.icon" />
    {{ f.label }}
  </span>
  <!-- A small icon, top right of the price check header (poe-mode.css). -->
  <span v-if="swap" :class="$style.swap" class="w-swap-icon" role="button" tabindex="0" data-swap-chip
    :aria-label="`Compare to your ${swap.label}`"
    @mouseenter="enter" @mouseleave="leave" @focus="enter" @blur="leave">
    <i class="fas fa-balance-scale" />
  </span>
</template>

<script setup lang="ts">
// Price check chips: does the checked item fit the active PoB build, and how
// does it compare to what you wear there?
import { computed, onBeforeUnmount, watch } from 'vue'
import type { ParsedItem } from '@/parser'
import { ItemCategory, ItemRarity, parseClipboard } from '@/parser'
import { useActiveBuild } from './active'
import { buildFacts, loadoutOf, realSets, slotLabel } from './build-model'
import { pobItemText } from './item-text'
import { slotsFor, swapCheck } from './swap-check'
import type { SwapResult } from './swap-check'
import { hideTip, showTipAt } from '../ui/tooltip/tooltip'
import type { PobItem, PobStats } from './widget'
import { askWornGear, worn, WORN_STALE_MS } from './worn-gear'
import { personalOn } from '../personal'

const props = defineProps<{ item: ParsedItem }>()
const build = useActiveBuild()

interface Fit { label: string, title: string }

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
  }
  return out
})

const ORDER: Record<SwapResult['verdict'], number> = { better: 0, mixed: 1, same: 2, worse: 3 }

function cost (r: SwapResult) {
  return ORDER[r.verdict] * 100 + r.rows.filter(x => x.tone === 'down').length
}

type Swap = { label: string, title: string, source: string, result: SwapResult }

const READING: SwapResult = { verdict: 'same', summary: 'Reading what you wear…', rows: [] }

function slotName (slot: string) {
  const label = slot === 'Body Armour' ? 'body armour' : slotLabel(slot).toLowerCase().replace(/ \d$/, '')
  const number = /^Ring (\d)$/.exec(slot)?.[1]
  return { label, number }
}

// Your gear in the item's slots, against the checked item. Rings go against
// whichever one you'd lose least by replacing; an empty slot wins outright.
function compare (slots: string[], worn: Array<{ slot: string, item: PobItem }>, stats: PobStats | null, source: string, emptyText: string): Swap | null {
  let best: Swap | null = null
  for (const slot of slots) {
    const { label, number } = slotName(slot)
    const title = `Against your ${label}${number ? ` ${number}` : ''}`
    const item = worn.find(x => x.slot === slot)?.item
    if (!item) {
      // A third ring slot only exists with a Kalandra's Touch.
      if (slot === 'Ring 3') continue
      return { label, title: `Your ${label}${number ? ` ${number}` : ''} slot`, source, result: { verdict: 'better', summary: emptyText, rows: [] } }
    }
    const yours = parseClipboard(pobItemText(item))
    if (yours.isErr()) continue
    const result = swapCheck(yours.value, props.item, stats)
    if (!best || cost(result) < cost(best.result)) best = { label, title, source, result }
  }
  return best
}

const hint = computed(() => build.charName.value)
const slots = computed(() => props.item.isUnidentified ? [] : slotsFor(props.item.category))

// The game's own answer when the stash reader is on; PoB's set otherwise.
watch([() => props.item, personalOn], ([, on]) => { if (slots.value.length && on) askWornGear(hint.value) }, { immediate: true })

function readTime (at: number) {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const swap = computed<Swap | null>(() => {
  const s = slots.value
  if (!s.length) return null
  let why = ''
  if (personalOn.value) {
    const { gear, error, pending } = worn.value
    const fresh = gear && !error && Date.now() - gear.readAt < WORN_STALE_MS
    if (gear && (fresh || pending)) {
      return compare(s, gear.slots, null, `Yours: what ${gear.character} wore at ${readTime(gear.readAt)}, read from pathofexile.com.`, 'You wear nothing there.')
    }
    if (pending && !gear) {
      const { label } = slotName(s[0])
      return { label, title: `Against your ${label}`, source: '', result: READING }
    }
    if (error) why = ` Couldn't read your gear: ${error}`
  }
  const d = build.details.value
  if (!d) return null
  const picked = loadoutOf(d, build.level.value, build.act.value, build.loadout.value).itemSet
  const set = picked?.item
  if (!set) return null
  // What PoB saved only describes this gear if it's the set it saved on.
  const sets = realSets(d.itemSets ?? [])
  const stats = (sets.length < 2 || set.isActive) ? d.stats ?? null : null
  const setName = set.title ? `"${set.title}" set` : 'gear'
  return compare(s, set.slots, stats, `Yours: your PoB build's ${setName}, not what you wear in game.${why}`, 'Your PoB set has nothing there.')
})

// An open tooltip follows the answer (the gear read lands while you hover).
// Kept as the element: an event's currentTarget is gone once it has fired.
let hovered: HTMLElement | null = null
watch(swap, () => { if (hovered) showSwap(hovered) })

function enter (e: Event) {
  hovered = e.currentTarget as HTMLElement
  showSwap(hovered)
}

function leave () {
  hovered = null
  hideTip()
}

function showSwap (el: HTMLElement) {
  if (swap.value) showTipAt(el, { kind: 'swap', title: swap.value.title, source: swap.value.source, result: swap.value.result })
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
.swap {
  display: inline-grid;
  place-items: center;
  width: calc(24px * var(--w-text-scale, 1));
  height: calc(24px * var(--w-text-scale, 1));
  margin-left: 0.25rem;
  border-radius: var(--w-r-sm);
  font-size: var(--w-fs-sm);
  color: var(--w-dim);
  border: 1px solid transparent;
  cursor: default;
}
.swap:hover, .swap:focus-visible {
  color: var(--w-accent);
  background: var(--w-accent-soft);
  border-color: var(--w-line-strong);
  outline: none;
}
</style>
