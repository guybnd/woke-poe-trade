<template>
  <!-- woke: a unique's tiers (Guy, 2026-11-27): how rare a drop it is, and the
       tier your loot filter puts it in, in that tier's own label look.
       Folded: both tiers. Open, three short lines (Guy, 2026-11-28: "holy
       verbose"): drop rarity, the drop's look with its rule, and the best
       price on the base, which NeverSink tiers by. The why sits in the "?". -->
  <template v-if="drop || tier">
    <button type="button" :class="$style.hd" :aria-expanded="open" data-related-head data-goto-spot="unique-tier" data-unique-tier-head @click="open = !open">
      <span :class="[$style.chev, { [$style.open]: open }]">▶</span>
      <span :class="$style.title">Tier</span>
      <span :class="$style.top">
        <span v-if="drop" :class="$style.drop" :title="`Drop rarity: ${drop.word}`" data-drop-tier>Drop T{{ drop.tier }}</span>
        <span v-if="tier" :class="$style.chip" :title="`Loot filter: ${tier.where}`" data-filter-tier-chip><LabelPreview :text="tier.short" :actions="tier.actions" :visibility="tier.visibility" :default-text="UNIQUE_TEXT" :extras="false" /></span>
      </span>
    </button>
    <div v-if="open" :class="$style.body" data-unique-tier>
      <div v-if="drop" :class="$style.ln" data-drop-tier-note>
        <span :class="$style.pips" aria-hidden="true"><i v-for="n in 6" :key="n" :class="{ [$style.on]: n <= 6 - drop.tier }" /></span>
        <b>T{{ drop.tier }}</b>
        <span :class="$style.dim">{{ drop.word }}<template v-if="drop.onBase"> · {{ drop.onBase }}</template></span>
        <WInfo :text="help" />
      </div>
      <div v-if="tier" :class="$style.ln" data-no-item-tip="the checked item's own drop look; the price check above is that item">
        <LabelPreview :text="groundName" :actions="tier.actions" :visibility="tier.visibility" :default-text="UNIQUE_TEXT" />
        <span :class="$style.dim">{{ whereText }}</span>
        <button v-if="tier.rule" type="button" :class="$style.go" @click="goToRule">Go to rule ›</button>
        <WInfo v-if="!drop" :text="help" />
      </div>
      <div v-if="tier?.dearest" :class="$style.ln">
        <span :class="$style.dim">{{ tier.dearest.setsTier ? 'Sets the tier:' : 'Best on base:' }}</span>
        <span v-if="tier.dearest.name !== item.info.refName" v-item-tip="{ name: tier.dearest.name, type: tier.base }" :class="$style.uname">{{ tier.dearest.name }}</span>
        <span v-else :class="$style.dim">this one</span>
        <span v-if="price" :class="$style.price">{{ price.text }}<img :class="$style.coin" :src="price.coin" alt=""></span>
      </div>
    </div>
  </template>
</template>

<script lang="ts">
import { storedPref } from '../ui/stored-pref'

// Open or folded as the player last left it; folded at first. One ref for
// every copy of the line.
const openPref = storedPref<boolean>('woke.uniqueTierOpen', raw => raw === 'true', v => v ? 'true' : null)
</script>

<script setup lang="ts">
// Loaded with the first unique checked, not at startup (RelatedItems.vue;
// the startup JS budget).
import { computed, shallowRef, watch } from 'vue'
import type { ParsedItem } from '@/parser'
import { usePoeninja, displayRounding } from '@/web/background/Prices'
import { loadTipDropTiers, vItemTip } from '../ui/tooltip/item-tip'
import { toast, WInfo } from '../ui'
import { uniquesOnBase } from '../shared/uniques-on-base'
import LabelPreview from './LabelPreview.vue'
import type { Colour } from './edits'
import { useActiveFilter } from './active-filter'
import { uniqueTier } from './unique-tier'
import { openRuleInEditor } from './open-rule'
import { dropTierWord, rankOnBase } from './drop-tier'

const props = defineProps<{ item: ParsedItem }>()
const emit = defineEmits<{ (e: 'shown', shown: boolean): void }>()
const active = useActiveFilter()
const { autoCurrency } = usePoeninja()
const open = openPref
// The game's unique colour, for a rule that sets no text colour.
const UNIQUE_TEXT: Colour = [175, 96, 37, 255]

const tiers = shallowRef<Record<string, number> | null>(null)
loadTipDropTiers().then(t => { tiers.value = t ?? null }).catch(() => {})

const tier = computed(() => {
  try { return uniqueTier(active.value, props.item) } catch { return null }
})

const drop = computed(() => {
  const t = tiers.value
  const name = props.item.info.refName
  const own = t?.[name]
  if (!t || own == null) return null
  const base = props.item.info.unique?.base
  return {
    tier: own,
    word: dropTierWord(own),
    foulborn: Boolean(props.item.isFoulborn),
    onBase: base ? rankOnBase(name, base, uniquesOnBase(base), t) : null
  }
})

watch(() => [props.item, Boolean(drop.value || tier.value)] as const, ([, shown]) => emit('shown', shown), { immediate: true })

// On the ground an unidentified unique shows its base's name.
const groundName = computed(() => props.item.isUnidentified ? (props.item.info.unique?.base ?? props.item.info.name) : props.item.info.name)

const price = computed(() => {
  const chaos = tier.value?.dearest?.chaos
  if (chaos == null) return null
  const p = autoCurrency(chaos)
  const text = p.min === p.max ? displayRounding(p.min, true) : `${displayRounding(p.min, true)}–${displayRounding(p.max, true)}`
  return { text, coin: p.currency === 'div' ? '/images/divine.png' : '/images/chaos.png' }
})

// Short: the section, and the two cases that change how to read it.
const whereText = computed(() => {
  const t = tier.value
  if (!t) return ''
  if (t.safety) return 'Safety net'
  return [t.where, t.byBase ? 'by base' : null, t.visibility === 'Hide' ? 'hidden' : null].filter(Boolean).join(' · ')
})

// Format A (help-tip.ts): the long explanations, out of the panel.
const bullets = computed(() => {
  const t = tier.value
  const kind = t?.byBase === 'foulborn' ? 'Foulborn ' : t?.byBase === 'replica' ? 'replica ' : ''
  return [
    drop.value ? '- **Drop tier**: a PoE Wiki estimate. T0 is the rarest, T5 the most common.' : null,
    drop.value?.foulborn ? '- A Foulborn copy drops as rarely as the plain unique.' : null,
    t?.safety ? '- **Safety net**: your filter would hide it, the safety net shows it.' : null,
    t?.byBase && !t.safety ? `- **By base**: other ${kind}uniques on ${t.base} look like this too, unless a special rule catches them.` : null,
    t?.dearest?.setsTier ? '- **Sets the tier**: the best price on the base picks the tier.' : null
  ].filter(Boolean).join('\n')
})
const help = computed(() => `How rare it drops, and how your loot filter shows it.\n${bullets.value}`)

function goToRule () {
  const rule = tier.value?.rule
  if (rule && !openRuleInEditor(rule)) toast('The loot filter editor is not loaded.')
}
</script>

<style module>
/* The side list's own folding heading (RelatedItems.vue .hd + .fold). */
.hd {
  display: flex;
  width: 100%;
  text-align: left;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--w-panel-solid);
  border-bottom: 1px solid var(--w-line);
  font-family: var(--w-head);
  font-size: var(--w-fs-lg);
  color: var(--w-accent);
  cursor: pointer;
}
.hd:hover { filter: brightness(1.15); }
.chev { display: inline-block; flex: none; width: 10px; font-size: var(--w-fs-xs); color: var(--w-faint); transition: transform .12s; }
.chev.open { transform: rotate(90deg); }
.title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.top { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; min-width: 0; font-family: var(--w-body); }
.drop { font-size: var(--w-fs-sm); color: var(--w-dim); white-space: nowrap; }
.chip { display: inline-flex; min-width: 0; max-width: 9rem; }
.body { display: grid; gap: 4px; padding: 6px 12px 7px; }
.ln { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 6px; min-width: 0; font-size: var(--w-fs-sm); }
.ln b { color: var(--w-fg); font-weight: 600; }
.dim { color: var(--w-dim); }
.pips { display: inline-flex; gap: 2px; }
.pips i { width: 5px; height: 10px; background: var(--w-line-strong); transform: skewX(-12deg); }
.pips i.on { background: #e0a050; }
.go { margin-left: auto; flex: none; font-size: var(--w-fs-sm); color: var(--w-dim); cursor: pointer; white-space: nowrap; }
.go:hover { color: var(--w-accent); }
.uname { color: #d98a4a; }
.price { display: inline-flex; align-items: center; gap: 3px; color: var(--w-dim); white-space: nowrap; font-variant-numeric: tabular-nums; }
.coin { width: 16px; height: 16px; object-fit: contain; }
</style>
