<template>
  <!-- A vault's rewards on hover: a row each with its game art, the whole name
       on one line and the price (Guy's pick A, 2026-11-21). Outside the panel,
       so no edge cuts it off. -->
  <Teleport to="body">
    <div v-if="vault && anchor" ref="el" data-w-popup :class="$style.card" :style="pos" role="tooltip" data-vault-hover>
      <div :class="$style.head">
        <span :class="$style.name">{{ vault.name }}</span>
        <span class="w-dim">{{ vault.quadrant }}</span>
        <span :class="$style.typical">~{{ chaos(vault.typical) }} typical</span>
      </div>
      <div v-for="r in vault.rewards" :key="r.text" :class="$style.row" :data-vault-reward="r.text">
        <WIcon :src="r.icon ? (itemArt({ name: r.icon }) ?? undefined) : undefined" :fallback="r.kind === 'unique' ? 'fas fa-ring' : 'fas fa-cube'" size="md" :class="r.kind === 'unique' && !r.icon ? $style.uniq : undefined" />
        <span :class="$style.text">{{ r.text }}<span v-if="r.rare" :class="$style.rare">rare</span></span>
        <span v-if="r.chaos != null" :class="$style.price">{{ chaos(r.chaos) }}</span>
        <span v-else :class="[$style.price, $style.varies]">varies</span>
      </div>
      <div :class="$style.foot">~ typical = the best of four offers; no reward weights are published. Unpriced rewards count as nothing. Gems at level 1.</div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import WIcon from '../ui/WIcon.vue'
import { itemArt } from '../ui/game-icons'
import { placeHelp } from '../ui/help-tip'

export interface VaultHover {
  name: string
  quadrant: string
  typical: number | null
  rewards: Array<{ text: string, kind: string, rare: boolean, chaos: number | null, icon: string | null }>
}

const props = defineProps<{ vault: VaultHover | null, anchor: DOMRect | null }>()

const el = ref<HTMLElement | null>(null)
const placed = ref<{ left: number, top: number } | null>(null)

watch(() => [props.vault, props.anchor] as const, async ([v, a]) => {
  placed.value = null
  if (!v || !a) return
  await nextTick()
  const card = el.value
  if (!card || props.anchor !== a) return
  // With CSS zoom, left and top are in zoomed units.
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--w-ui-scale')) || 1
  const at = placeHelp(a, card.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight })
  placed.value = { left: at.left / scale, top: at.top / scale }
})

const pos = computed(() => placed.value
  ? { left: `${placed.value.left}px`, top: `${placed.value.top}px` }
  : { left: '0', top: '0', visibility: 'hidden' as const })

function chaos (n: number | null | undefined) {
  if (n == null) return '?'
  return `${Math.abs(n) >= 10 ? Math.round(n) : +n.toFixed(1)}c`
}
</script>

<style module>
.card {
  position: fixed;
  z-index: 1002;
  zoom: var(--w-ui-scale, 1);
  width: max-content;
  max-width: min(520px, calc((100vw - 16px) / var(--w-ui-scale, 1)));
  padding: 7px 10px 8px;
  pointer-events: none;
  background: var(--w-tip-bg);
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-sm);
  box-shadow: var(--w-shadow);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-sm);
}
.head { display: flex; align-items: baseline; gap: 8px; padding-bottom: 4px; margin-bottom: 2px; border-bottom: 1px solid var(--w-line); white-space: nowrap; }
.name { color: var(--w-gold); font-family: var(--w-caps-face); font-size: var(--w-fs-md, 1.05em); }
.typical { margin-left: auto; padding-left: 16px; font-style: italic; font-variant-numeric: tabular-nums; }
.row { display: flex; align-items: center; gap: 8px; min-height: 28px; white-space: nowrap; }
.row + .row { border-top: 1px solid var(--w-line-soft); }
.text { flex: 1 1 auto; padding-right: 16px; }
.rare { margin-left: 6px; padding: 0 3px; border: 1px solid var(--w-r-unique); border-radius: var(--w-r-sm); color: var(--w-r-unique); font-size: var(--w-fs-xs); }
.uniq { color: var(--w-r-unique); }
.price { font-variant-numeric: tabular-nums; }
.varies { color: var(--w-faint); font-style: italic; }
.foot { max-width: 380px; margin-top: 4px; padding-top: 4px; border-top: 1px solid var(--w-line); color: var(--w-faint); font-size: var(--w-fs-xs); line-height: 1.4; }
</style>
