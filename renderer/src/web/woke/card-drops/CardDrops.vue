<template>
  <section v-if="facts" :class="[$style.root, compact && $style.compact]" data-card-drops>
    <div v-if="!compact" :class="$style.head"><span>Drops in</span><span v-if="line" :class="$style.note">{{ line }}</span></div>
    <div :class="$style.chips">
      <span v-if="compact" class="w-dim">Drops:</span>
      <WChip v-for="m in maps" :key="m.name" v-item-tip="{ name: m.name, content: m.tip }" data-card-drop-map>
        {{ m.label }}<span v-if="m.tier != null" :class="$style.tier">T{{ m.tier }}</span><span v-if="!compact && m.oneIn" :class="$style.tier" :title="chanceWords(m.oneIn)" data-card-drop-chance>{{ oneInText(m.oneIn) }}</span>
      </WChip>
      <span v-if="compact && !maps.length && !facts.other.length" class="w-dim">{{ facts.disabled ? 'no longer drops' : 'no verified source yet' }}</span>
      <!-- One line on the small card: the first source, the rest on hover. -->
      <span v-if="compact && facts.other.length" :class="$style.more" :title="facts.other.join('\n')">{{ compactOther }}</span>
    </div>
    <template v-if="!compact">
      <div v-for="o in facts.other" :key="o" :class="$style.other">{{ o }}</div>
      <div v-if="!maps.length && !facts.other.length" :class="$style.note">
        {{ facts.disabled ? 'Not in the game right now.' : 'Divcord has no verified source for this card yet.' }}
      </div>
      <div :class="$style.foot">
        <span :class="$style.note">Sources: Divcord · weights: Prohibited Library<template v-if="maps.some(m => m.oneIn)"> · 1 in N: how many of that map's own cards it takes, on average, to get this one (by drop weight)</template></span>
        <WButton size="sm" @click="open">Divcord</WButton>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
// Where a divination card drops: its atlas maps as chips (each with the map's
// tooltip: its tier and every card in it), other sources, area level and
// rarity. Ctrl+Space shows it in full, the price check in one line.
import { computed, shallowRef, watch } from 'vue'
import { WButton, WChip, vItemTip } from '../ui'
import { formatChaos } from '../ui/format'
import { usePrice } from '../shared/price'
import { cardDropFacts, cardPageUrl, chanceWords, factLine, loadCardDrops, mapTip, mapsByChance, oneInText } from './card-drops'
import type { CardDropData } from './card-drops'

const props = defineProps<{ name: string, compact?: boolean }>()

const data = shallowRef<CardDropData | null>(null)
function load () {
  if (!data.value) loadCardDrops().then(d => { if (d) data.value = d }).catch(() => {})
}
// A failed read is tried again for the next card.
watch(() => props.name, load, { immediate: true })

const { priceOf, divine } = usePrice()
const price = (card: string) => priceOf(card, { ns: 'DIVINATION_CARD' })?.chaos ?? null

const facts = computed(() => cardDropFacts(data.value, props.name))
const compactOther = computed(() => {
  const other = facts.value?.other ?? []
  if (maps.value.length) return `+${other.length} more`
  return other.length > 1 ? `${other[0]} +${other.length - 1} more` : other[0] ?? ''
})
const line = computed(() => facts.value ? factLine(facts.value) : '')
const maps = computed(() => {
  const d = data.value
  if (!d || !facts.value) return []
  // Likeliest first (Guy's pick, veteran review 2026-11-24).
  return mapsByChance(d, props.name, facts.value.maps).map(m => ({ ...m, tip: mapTip(d, m.name, price, chaos => formatChaos(chaos, divine.value)) }))
})

function open () {
  window.open(cardPageUrl(props.name))
}
</script>

<style module>
.root { display: grid; gap: 3px; margin-top: var(--w-s3); }
.compact { margin-top: 0; }
.head { display: flex; align-items: baseline; gap: var(--w-s2); min-height: calc(24px * var(--w-text-scale, 1)); border-bottom: 1px solid var(--w-line); }
.head > span:first-child { font-size: var(--w-fs-caps); font-weight: var(--w-caps-weight); letter-spacing: 0.05em; text-transform: var(--w-caps-case); color: var(--w-dim); font-family: var(--w-caps-face); }
.note { font-size: var(--w-fs-sm); color: var(--w-dim); }
.chips { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-block: 2px; }
.tier { margin-left: 4px; color: var(--w-dim); font-size: var(--w-fs-sm); }
.more { color: var(--w-dim); font-size: var(--w-fs-sm); }
.other { color: var(--w-text); }
.foot { display: flex; align-items: center; justify-content: space-between; gap: var(--w-s2); margin-top: 2px; }
</style>
