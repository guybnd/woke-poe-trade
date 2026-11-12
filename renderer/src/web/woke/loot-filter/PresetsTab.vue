<template>
  <div :class="$style.wrap" class="w-scroll">
    <div class="w-dim text-sm flex items-center gap-2">
      <span>{{ store.presetChanges.value ? `Adjusting ${store.presetChanges.value} of NeverSink's rules` : 'Common changes in one click' }}</span>
      <WInfo text="They're kept across NeverSink updates and never touch your own rules or the safety net." />
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.cheapCurrency.on">Hide currency worth under</WToggle>
        <WField v-model.number="cheapChaos" type="number" suffix="c" style="width: 5rem;" aria-label="Cheap currency line in chaos" />
        <span class="w-dim text-sm">once you're in maps</span>
      </div>
      <div class="w-faint text-xs">
        <template v-if="!store.prices.lookup.value">Waiting for poe.ninja prices.</template>
        <template v-else-if="cheap.length">{{ cheap.length }} base{{ cheap.length === 1 ? '' : 's' }}: {{ cheap.slice(0, 8).join(', ') }}<template v-if="cheap.length > 8"> and {{ cheap.length - 8 }} more</template>. A stack hides too.</template>
        <template v-else>Nothing in your filter's currency is that cheap today.</template>
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.chaosRecipe.on">Chaos recipe: unidentified item level 60-74 rares</WToggle>
        <WInfo text="One colour per slot. Click a slot to drop it once you have enough." />
      </div>
      <div class="flex flex-wrap gap-1">
        <WChip v-for="s in RECIPE_SLOTS" :key="s.key" clickable :active="p.chaosRecipe.slots.includes(s.key)"
          :title="p.chaosRecipe.slots.includes(s.key) ? `Stop showing ${s.label.toLowerCase()} (that slot is full)` : `Show ${s.label.toLowerCase()} again`"
          @click="toggleSlot(s.key)">
          <span :class="$style.swatch" :style="{ background: `rgb(${s.colour.join(',')})` }" /> {{ s.label }}
        </WChip>
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.quiet.on">Quiet mode: sounds only for tiers 1 to</WToggle>
        <WSelect :model-value="String(p.quiet.keepTiers)" :options="[1, 2, 3, 4, 5].map(n => ({ value: String(n), label: String(n) }))" style="width: 4rem;"
          aria-label="Loudest tiers kept" @update:model-value="v => p.quiet.keepTiers = Number(v)" />
        <WInfo text="Lower tiers keep their look and beam, just no alert sound." />
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.bigger.on">Bigger labels: never smaller than</WToggle>
        <WField v-model.number="biggerSize" type="number" style="width: 4.5rem;" aria-label="Smallest label font size" />
        <LabelPreview text="Orb of Alteration" :style-override="{ fontSize: p.bigger.size }" :extras="false" />
      </div>
    </div>

    <div :class="$style.card">
      <WToggle v-model="p.colourBlind.on">Colour-blind safe beams and map icons</WToggle>
      <div class="flex items-center gap-2 text-xs w-dim">
        <span v-for="(to, from) in SWAPS" :key="from" class="flex items-center gap-1">
          <span :class="$style.dot" :style="{ background: poeColour(from) }" /> {{ from }} <i class="fas fa-arrow-right w-faint" />
          <span :class="$style.dot" :style="{ background: poeColour(to) }" /> {{ to }}
        </span>
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.dust.on">Show uniques worth disenchanting for dust</WToggle>
        <WInfo text="Switches on NeverSink's three dust tiers, which ship switched off. They list bases with a high dust value, whatever the price." />
      </div>
      <div v-if="p.dust.on" class="w-faint text-xs">{{ neverSinkDust ? `NeverSink's ${neverSinkDust} dust tier${neverSinkDust === 1 ? '' : 's'} switched on.` : 'This NeverSink file has no dust tiers.' }}</div>
      <div v-if="p.dust.on" class="flex items-center gap-2">
        <WToggle v-model="p.dust.fromPrices">Also from today's prices, at</WToggle>
        <WField v-model.number="dustLine" type="number" suffix="dust/c" style="width: 7.5rem;" aria-label="Dust per chaos line" />
        <WInfo :text="`Adds bases where every unique gives that much dust per chaos or more, as a drop of item level ${DUST_ILVL}+. A base with any valuable or unpriced unique is left out.`" />
      </div>
      <div v-if="p.dust.on && p.dust.fromPrices" class="w-faint text-xs">
        <template v-if="!store.prices.lookup.value">Waiting for poe.ninja prices.</template>
        <template v-else-if="dustList.length">{{ dustList.length }} base{{ dustList.length === 1 ? '' : 's' }}: {{ dustList.slice(0, 6).join(', ') }}<template v-if="dustList.length > 6"> and {{ dustList.length - 6 }} more</template>.</template>
        <template v-else>No base passes that line today.</template>
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.sixSockets.on">Show 6-socket items for the vendor</WToggle>
        <WInfo text="Seven Jeweller's Orbs each, in grey, above NeverSink's rules." />
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.hideGear.on">Hide white and blue gear once you're in maps</WToggle>
        <WInfo text="Keeps what NeverSink ranks higher: item level 86 bases, 6-sockets, influenced and exotic bases, flasks and the jewellery it highlights." />
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.cheapCards.on">Hide divination cards worth under</WToggle>
        <WField v-model.number="cardsChaos" type="number" suffix="c" style="width: 5rem;" aria-label="Cheap card line in chaos" />
        <WInfo text="A stack worth the line still shows. Cards with a thin price are kept." />
      </div>
      <div v-if="p.cheapCards.on" class="w-faint text-xs">{{ priceNote(cards) }}</div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.lowMaps.on">Hide maps below tier</WToggle>
        <WSelect :model-value="String(p.lowMaps.tier)" :options="mapTiers" style="width: 4.5rem;"
          aria-label="Lowest map tier shown" @update:model-value="v => p.lowMaps.tier = Number(v)" />
        <WInfo text="Unique, blighted, influenced, Zana, enchanted and special maps still show, and so do maps above your current level." />
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.hideFlasks.on">Hide flasks once you're in maps</WToggle>
        <WInfo text="20% quality and unique flasks still show." />
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.cheapUniques.on">Hide uniques worth under</WToggle>
        <WField v-model.number="uniquesChaos" type="number" suffix="c" style="width: 5rem;" aria-label="Cheap unique line in chaos" />
        <span class="w-dim text-sm">once you're in maps</span>
        <WInfo text="Only bases where every unique is that cheap. 5-links, 6-sockets, corrupted, replica and foulborn copies, dust bases and your build's uniques still show." />
      </div>
      <div v-if="p.cheapUniques.on" class="w-faint text-xs">{{ uniqueNote }}</div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.cheapSplinters.on">Hide splinter and shard stacks worth under</WToggle>
        <WField v-model.number="splintersChaos" type="number" suffix="c" style="width: 5rem;" aria-label="Cheap splinter line in chaos" />
        <span class="w-dim text-sm">in maps</span>
      </div>
      <div v-if="p.cheapSplinters.on" class="w-faint text-xs">{{ priceNote(splinters) }}</div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.msBoots.on">Highlight boots with movement speed while levelling</WToggle>
        <WInfo text="Magic and rare boots with Runner's or better, with a border and a sound." />
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.hideRgb.on">Hide R-G-B linked items once you're in maps</WToggle>
        <WInfo text="Stops NeverSink's chromatic orb recipe rules in maps. They still show while levelling." />
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.vendorQuality.on">Show 20% quality gems and flasks for the vendor</WToggle>
        <WInfo text="For the Gemcutter's Prism and Glassblower's Bauble recipes, while levelling and in early maps (area level 77 and below)." />
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.volume.on">Drop sound volume</WToggle>
        <WField v-model.number="volumePercent" type="number" suffix="%" style="width: 5rem;" aria-label="Drop sound volume" />
        <WInfo text="Every alert sound at this share of its volume. Works with quiet mode." />
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.beams.on">Beams and map icons only for tiers 1 to</WToggle>
        <WSelect :model-value="String(p.beams.keepTiers)" :options="[1, 2, 3, 4, 5].map(n => ({ value: String(n), label: String(n) }))" style="width: 4rem;"
          aria-label="Tiers that keep beams" @update:model-value="v => p.beams.keepTiers = Number(v)" />
        <WInfo text="Lower tiers keep their label colours and sound." />
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.weapons.on">While levelling, only weapons for</WToggle>
        <WSelect :model-value="p.weapons.archetype" :options="archetypeOptions" style="width: 10rem;"
          aria-label="Build type" @update:model-value="setArchetype" />
        <WInfo text="Other white and blue weapons are hidden and their rares dimmed. Auto uses the weapons of your PoB build." />
      </div>
      <div v-if="p.weapons.on" class="w-faint text-xs">{{ weaponNote }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WChip, WField, WInfo, WSelect, WToggle } from '../ui'
import LabelPreview from './LabelPreview.vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import { ARCHETYPES, DUST_ILVL, RECIPE_SLOTS, archetypeClasses, cheapCards, cheapCurrencyBases, cheapSplinters, cheapUniqueBases, isNeverSinkDustTier, neverSinkDustBases } from './presets'
import { WEAPON_CLASSES } from './build-rules'
import { dustBases } from '../disenchant/calc'
import { basesWithoutDust, dustUniques } from '../disenchant/data'
import { poeColour } from './colours'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
}>()

const p = computed(() => props.config.presets)
const SWAPS: Record<string, string> = { Green: 'Blue', Brown: 'Yellow', Red: 'Orange', Pink: 'Purple' }

const cheap = computed(() => {
  const doc = props.store.doc.value
  const lookup = props.store.prices.lookup.value
  return doc && lookup ? cheapCurrencyBases(doc, lookup, p.value.cheapCurrency.chaos) : []
})

const cheapChaos = computed({
  get: () => p.value.cheapCurrency.chaos,
  set: (v: number) => { if (Number.isFinite(v) && v > 0 && v <= 50) p.value.cheapCurrency.chaos = v }
})

// Counted on the file as built: switched on, they are no longer commented out.
const neverSinkDust = computed(() => (props.store.doc.value?.blocks ?? []).filter(isNeverSinkDustTier).length)
const dustList = computed(() => {
  const items = props.store.prices.items.value
  return items.length ? dustBases(dustUniques(), items, p.value.dust.line, DUST_ILVL, basesWithoutDust()) : []
})
const dustLine = computed({
  get: () => p.value.dust.line,
  set: (v: number) => { if (Number.isFinite(v) && v >= 100 && v <= 1_000_000) p.value.dust.line = Math.round(v) }
})

const mapTiers = Array.from({ length: 16 }, (_, i) => ({ value: String(i + 2), label: String(i + 2) }))
const archetypeOptions = ARCHETYPES.map(a => ({ value: a.key, label: a.label }))
function setArchetype (v: string) {
  const a = ARCHETYPES.find(x => x.key === v)
  if (a) p.value.weapons.archetype = a.key
}

// A number field that only takes values in range.
function inRange (get: () => number, set: (v: number) => void, lo: number, hi: number, round = false) {
  return computed({
    get,
    set: (v: number) => { if (Number.isFinite(v) && v >= lo && v <= hi) set(round ? Math.round(v) : v) }
  })
}
const cardsChaos = inRange(() => p.value.cheapCards.chaos, v => { p.value.cheapCards.chaos = v }, 0.1, 50)
const uniquesChaos = inRange(() => p.value.cheapUniques.chaos, v => { p.value.cheapUniques.chaos = v }, 0.1, 50)
const splintersChaos = inRange(() => p.value.cheapSplinters.chaos, v => { p.value.cheapSplinters.chaos = v }, 0.1, 50)
const volumePercent = inRange(() => p.value.volume.percent, v => { p.value.volume.percent = v }, 5, 100, true)

const cards = computed(() => {
  const doc = props.store.doc.value
  const lookup = props.store.prices.lookup.value
  return doc && lookup && p.value.cheapCards.on ? [...cheapCards(doc, lookup, p.value.cheapCards.chaos).values()].flat() : null
})
const splinters = computed(() => {
  const doc = props.store.doc.value
  const lookup = props.store.prices.lookup.value
  return doc && lookup && p.value.cheapSplinters.on ? [...cheapSplinters(doc, lookup, p.value.cheapSplinters.chaos).values()].flat() : null
})
function priceNote (list: string[] | null): string {
  if (!props.store.prices.lookup.value) return 'Waiting for poe.ninja prices.'
  if (!list?.length) return 'Nothing in your filter is that cheap today.'
  return `${list.length} base${list.length === 1 ? '' : 's'}: ${list.slice(0, 6).join(', ')}${list.length > 6 ? ` and ${list.length - 6} more` : ''}.`
}

const build = props.store.buildInput
const uniqueNote = computed(() => {
  const doc = props.store.doc.value
  if (!props.store.prices.items.value.length || !doc || !p.value.cheapUniques.on) return 'Waiting for poe.ninja prices.'
  const d = p.value.dust
  const keep = [...(d.on ? neverSinkDustBases(doc) : []), ...(d.on && d.fromPrices ? dustList.value : []), ...(build.value?.uniqueBases ?? [])]
  return priceNote(cheapUniqueBases(doc, props.store.prices.breakdown.value, p.value.cheapUniques.chaos, keep))
})
const weaponNote = computed(() => {
  const keep = archetypeClasses(p.value, build.value?.weaponClasses ?? null)
  if (!keep) return 'No weapons in your PoB build yet: pick a type instead.'
  return WEAPON_CLASSES.some(c => !keep.includes(c)) ? `Keeps ${keep.join(', ')}.` : 'Your build uses every weapon type.'
})

const biggerSize = computed({
  get: () => p.value.bigger.size,
  set: (v: number) => { if (Number.isInteger(v) && v >= 25 && v <= 45) p.value.bigger.size = v }
})

function toggleSlot (key: string) {
  const slots = p.value.chaosRecipe.slots
  p.value.chaosRecipe.slots = slots.includes(key) ? slots.filter(s => s !== key) : [...slots, key]
}
</script>

<style module>
.wrap {
  max-height: min(36rem, calc(70vh / var(--w-ui-scale, 1)));
  padding: 8px var(--w-pad) 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: var(--w-panel-2);
  border-radius: var(--w-r-sm);
}
.swatch {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: var(--w-r-sm);
}
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
</style>
