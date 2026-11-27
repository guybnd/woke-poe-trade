<template>
  <!-- woke: a unique's tiers (Guy, 2026-11-27): how rare a drop it is, and the
       tier your loot filter puts it in, in that tier's own label look.
       Folded: both tiers. Open: what each means, the drop's look, its rule,
       and the dearest unique on the base, which NeverSink tiers by. -->
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
      <div v-if="drop" :class="$style.note" data-drop-tier-note>
        <b>Drop T{{ drop.tier }}</b>, {{ drop.word }}<template v-if="drop.foulborn"> (a plain copy)</template>. T0 is the rarest, T5 the most common.<template v-if="drop.onBase"> {{ drop.onBase }}</template>
        <span :class="$style.src">PoE Wiki estimate</span>
      </div>
      <template v-if="tier">
        <div :class="$style.look" data-no-item-tip="the checked item's own drop look; the price check above is that item">
          <LabelPreview :text="groundName" :actions="tier.actions" :visibility="tier.visibility" :default-text="UNIQUE_TEXT" />
          <button v-if="tier.rule" type="button" :class="$style.go" @click="goToRule">Go to rule ›</button>
        </div>
        <div :class="$style.note">Loot filter: {{ tier.where }}{{ tier.visibility === 'Hide' ? ', hidden' : '' }}.<template v-if="tier.safety"> Your filter would hide it; the safety net shows it.</template><template v-else-if="tier.byBase"> Your filter tiers uniques by base: other {{ tier.byBase === 'foulborn' ? 'Foulborn' : tier.byBase === 'replica' ? 'replica' : '' }} uniques on {{ tier.base }} drop like this too, unless a special rule catches them first.</template></div>
        <div v-if="tier.dearest && tier.dearest.name === item.info.refName" :class="$style.note">{{ tier.dearest.setsTier ? 'Its price sets the tier' : 'The dearest unique on this base' }}<span v-if="price" :class="$style.price">{{ price.text }}<img :class="$style.coin" :src="price.coin" alt=""></span></div>
        <div v-else-if="tier.dearest" :class="$style.note">{{ tier.dearest.setsTier ? 'Set by' : 'Dearest on this base:' }} <span v-item-tip="{ name: tier.dearest.name, type: tier.base }" :class="$style.uname">{{ tier.dearest.name }}</span><span v-if="price" :class="$style.price">{{ price.text }}<img :class="$style.coin" :src="price.coin" alt=""></span></div>
      </template>
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
import { toast } from '../ui'
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
.look { display: flex; align-items: center; gap: 8px; min-width: 0; }
.go { margin-left: auto; flex: none; font-size: var(--w-fs-sm); color: var(--w-dim); cursor: pointer; white-space: nowrap; }
.go:hover { color: var(--w-accent); }
.note { font-size: var(--w-fs-sm); line-height: 1.35; color: var(--w-faint); }
.note b { color: var(--w-fg); font-weight: 600; }
.src { display: block; font-size: var(--w-fs-xs); color: var(--w-faint); opacity: .8; }
.uname { color: #d98a4a; }
.price { display: inline-flex; align-items: center; gap: 3px; margin-left: 5px; vertical-align: bottom; color: var(--w-dim); white-space: nowrap; font-variant-numeric: tabular-nums; }
.coin { width: 16px; height: 16px; object-fit: contain; }
</style>
