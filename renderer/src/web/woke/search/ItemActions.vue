<template>
  <!-- The detail pane's actions: what Enter does first (Price check, or
       Trade site when it can't be priced here), then groups by purpose, and
       Open in Market last as a quiet link. -->
  <div :class="$style.acts" data-item-actions>
    <WButton v-if="canPrice" variant="primary" size="sm" icon="fas fa-coins" title="Price it from live listings, here in the overlay." data-tip-keys="Enter" @click="$emit('price', $event)">
      Price check <WKbd keys="Enter" :class="$style.kbd" />
    </WButton>
    <WButton :variant="canPrice ? undefined : 'primary'" size="sm" icon="fas fa-right-left" :title="`Search the trade site for ${name}.`" :data-tip-keys="canPrice ? 'Alt + Enter' : 'Enter'" @click="$emit('trade')">
      Trade site <WKbd :keys="canPrice ? 'Alt + Enter' : 'Enter'" :class="$style.kbd" />
    </WButton>
    <template v-if="lookups">
      <span :class="$style.sep" />
      <WButton size="sm" icon="fas fa-book" title="Open the PoE wiki page." @click="$emit('wiki')">Wiki</WButton>
      <WButton size="sm" icon="fas fa-database" title="Open the poedb page." @click="$emit('poedb')">poedb</WButton>
    </template>
    <span :class="$style.sep" />
    <WButton size="sm" icon="fas fa-box-open" title="Search your stash for it." data-tip-keys="Ctrl + F" @click="$emit('stash')">Find in stash</WButton>
    <WButton size="sm" icon="far fa-copy" :class="$style.iconOnly" title="Copy the name." data-tip-keys="Ctrl + Shift + C" aria-label="Copy name" @click="$emit('copy')" />
    <WButton v-if="market" variant="ghost" size="sm" icon="fas fa-chart-line" :class="$style.end" title="Show it in the Market window." @click="$emit('market')">Market</WButton>
  </div>
</template>

<script setup lang="ts">
import WButton from '../ui/WButton.vue'
import WKbd from '../ui/WKbd.vue'

defineProps<{
  name: string
  // Wiki and poedb need the item's data entry.
  lookups: boolean
  canPrice: boolean
  // The Market window is placed.
  market: boolean
}>()
defineEmits<{
  trade: []
  price: [e: MouseEvent]
  wiki: []
  poedb: []
  stash: []
  copy: []
  market: []
}>()
</script>

<style module>
.acts { display: flex; flex-wrap: wrap; align-items: center; gap: var(--w-s1); margin-top: var(--w-s3); }
.sep { width: 1px; align-self: stretch; margin: 2px var(--w-s1); background: var(--w-line-strong); }
.end { margin-left: auto; }
.iconOnly { padding-left: 6px; padding-right: 6px; }
.kbd { margin-left: 2px; }
/* On the main button: its own text colour, not the panel's. */
.kbd :global(.w-kbd) { color: inherit; border-color: color-mix(in srgb, currentColor 45%, transparent); }
</style>
