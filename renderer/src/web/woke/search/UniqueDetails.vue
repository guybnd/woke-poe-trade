<template>
  <div :class="$style.root">
    <section v-if="details.variants.length" :class="$style.sec">
      <div :class="$style.head"><span>Mods</span><span v-if="details.variants.length > 1" :class="$style.note">{{ details.variants.length }} variants</span></div>
      <div v-if="details.variants.length > 1" :class="$style.chips" role="group" aria-label="Variant">
        <WChip v-for="(v, i) in details.variants" :key="i" clickable :active="v === shown" @click="emit('update:variant', v.name ?? null)">{{ v.name }}</WChip>
      </div>
      <div v-if="!priced" :class="$style.note">poe.ninja has no price for this variant.</div>
      <template v-if="shown">
        <div v-for="(l, i) in shown.implicits" :key="'i' + i" :class="$style.implicit">{{ plainLine(l) }}</div>
        <div v-if="shown.implicits.length && shown.explicits.length" :class="$style.rule" />
        <div v-for="(l, i) in shown.explicits" :key="'e' + i" :class="[$style.mod, { [$style.shared]: details.variants.length > 1 && !shown.differs.includes(l) }]">{{ plainLine(l) }}</div>
      </template>
    </section>

    <section v-if="details.foulborn.length" :class="$style.sec">
      <div :class="$style.head">
        <span>Foulborn</span>
        <span v-if="foulGroup" :class="$style.range"><template v-if="foulGroup.low !== foulGroup.high"><WPrice bulk :chaos="foulGroup.low" :divine="divine" /> to </template><WPrice bulk :chaos="foulGroup.high" :divine="divine" /></span>
        <span v-else :class="$style.note">No poe.ninja price</span>
      </div>
      <button v-for="(f, k) in details.foulborn" :key="k" type="button" :class="[$style.kind, { [$style.kindOn]: f.name === foul }]"
        :title="f.name === foul ? 'Trade site searches this Foulborn kind. Click to search the plain unique again' : 'Pick to make Trade site search Foulborn copies'"
        :aria-pressed="f.name === foul" @click="emit('update:foul', f.name === foul ? null : (f.name ?? null))">
        <span :class="$style.kindName">{{ f.name || 'Foulborn' }}</span>
        <span :class="$style.kindLines">
          <span v-for="(l, i) in f.adds" :key="'a' + i" :class="$style.foul">{{ plainLine(l) }}</span>
          <span v-for="(l, i) in f.replaces" :key="'r' + i" :class="$style.gone">{{ plainLine(l) }}</span>
        </span>
        <WPrice v-if="priceOf(f.name) != null" bulk :chaos="priceOf(f.name)!" :divine="divine" :class="$style.kindPrice" />
        <span v-else />
      </button>
    </section>

    <section v-if="details.vestigial.length" :class="$style.sec">
      <div :class="$style.head"><span>Vestigial</span><span :class="$style.note">Enshrouded and charged in Timeless Conflict, it drops another unique of its slot with this</span></div>
      <div v-for="(mod, i) in details.vestigial" :key="i" :class="$style.vestRow">
        <span v-if="details.vestigial.length > 1" :class="$style.note">{{ i === 0 ? 'One of' : 'or' }}</span>
        <span><span v-for="(l, j) in mod" :key="j" :class="$style.vest">{{ l }}</span></span>
      </div>
    </section>

    <div v-if="facts.length" :class="$style.facts">{{ facts.join(' · ') }}</div>
    <div v-if="dropText" :class="$style.facts"><span :class="$style.restricted">Restricted drop.</span> {{ dropText }}</div>
  </div>
</template>

<script setup lang="ts">
// A unique's mods, Foulborn kinds and Vestigial mod under its Search prices.
import { computed } from 'vue'
import { WChip, WPrice } from '../ui'
import { plainLine } from './unique-details'
import type { UniqueDetails } from './unique-details'
import type { PriceGroup } from './search'
import type { TipDrop } from '../ui/tooltip/tip-content'

const props = defineProps<{
  details: UniqueDetails
  variant: string | null
  foul: string | null
  foulGroup: PriceGroup | null
  facts: string[]
  drop: TipDrop | undefined
  // False when the shown variant has no poe.ninja row.
  priced: boolean
  divine: number | null
}>()
const emit = defineEmits<{ 'update:variant': [name: string | null], 'update:foul': [name: string | null] }>()

const shown = computed(() => props.details.variants.find(v => v.name === props.variant) ?? props.details.variants[0])
// A Foulborn kind's own poe.ninja row, when poe.ninja names it the same way.
function priceOf (name: string | undefined): number | null {
  if (!name || !props.foulGroup) return null
  return props.foulGroup.variants.find(v => v.variant === name)?.chaos ?? null
}
const DROP_TEXT_MAX = 180
const dropText = computed(() => {
  const d = props.drop
  if (!d?.d && !d?.r) return ''
  const t = d.t ?? 'Not a random drop on its base.'
  return t.length > DROP_TEXT_MAX ? `${t.slice(0, DROP_TEXT_MAX - 1).trimEnd()}…` : t
})
</script>

<style module>
.root { display: grid; gap: var(--w-s3); margin-top: var(--w-s3); }
.sec { display: grid; gap: 3px; }
.head { display: flex; align-items: baseline; gap: var(--w-s2); min-height: calc(24px * var(--w-text-scale, 1)); border-bottom: 1px solid var(--w-line); }
.head > span:first-child { font-size: var(--w-fs-caps); font-weight: var(--w-caps-weight); letter-spacing: 0.05em; text-transform: var(--w-caps-case); color: var(--w-dim); font-family: var(--w-caps-face); }
.note { font-size: var(--w-fs-sm); color: var(--w-dim); }
.range { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; margin-block: 2px; }
.implicit, .mod { color: var(--w-r-magic); }
/* With variants: lines every variant has are dimmed, so the picked one's own lines stand out. */
.shared { opacity: 0.6; }
.rule { height: 1px; margin: 2px 0; background: var(--w-line-soft); }
.kind { display: grid; grid-template-columns: minmax(7rem, auto) minmax(0, 1fr) auto; column-gap: var(--w-s3); align-items: baseline; width: 100%; text-align: left; padding: 3px 4px; border-radius: 2px; border: 1px solid transparent; }
.kind:hover { background: var(--w-panel-2); }
.kindOn { border-color: var(--w-mod-foulborn); background: var(--w-panel-2); }
.kindName { color: var(--w-dim); font-size: var(--w-fs-sm); }
.kindLines { display: grid; min-width: 0; }
.kindPrice { justify-self: end; }
.foul { color: var(--w-mod-foulborn); }
.gone { color: var(--w-dim); text-decoration: line-through; }
.vestRow { display: flex; gap: var(--w-s2); align-items: baseline; }
.vest { display: block; color: var(--w-mod-enchant); }
.facts { color: var(--w-dim); font-size: var(--w-fs-sm); }
.restricted { color: var(--w-mod-corrupted); }
</style>
