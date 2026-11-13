<template>
  <span :class="[$style.dots, { [$style.ring]: ring, [$style.linked]: colours.length > 1 }]" :title="title">
    <template v-for="(c, i) in colours" :key="i">
      <span v-if="i" :class="$style.link" />
      <span :class="[$style.dot, $style[c]]" />
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GemColour } from './gems'
import { COLOUR_NAME } from './build-model'

// ring: the game's socket look (an empty socket: a ring in the socket's colour
// around a dark core, bronze link bars), used by the item tooltip when the PoE 1 / PoE 2 art is on.
const props = defineProps<{ colours: GemColour[], ring?: boolean }>()
const title = computed(() => props.colours.map(c => COLOUR_NAME[c]).join(' - '))
</script>

<style module>
.dots { display: inline-flex; align-items: center; flex: none; vertical-align: middle; }
.dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35); }
.link { width: 4px; height: 2px; background: var(--w-faint); }
.r { background: var(--w-s-r); }
.g { background: var(--w-s-g); }
.b { background: var(--w-s-b); }
.w { background: var(--w-s-w); }
.r { --c: var(--w-s-r); } .g { --c: var(--w-s-g); } .b { --c: var(--w-s-b); } .w { --c: var(--w-s-w); }
:global(:root[data-woke-art]) .ring .dot {
  width: 18px;
  height: 18px;
  background:
    radial-gradient(circle closest-side, #050403 0 40%, #1a140e 48%, color-mix(in srgb, var(--c) 55%, #000) 54%, var(--c) 64%, color-mix(in srgb, var(--c) 70%, #fff) 72%, var(--c) 80%, color-mix(in srgb, var(--c) 40%, #000) 94%, #000 100%);
  box-shadow: 0 0 0 1px #000;
}
/* A linked group sits on one bronze plate, so an unlinked socket stands apart. */
:global(:root[data-woke-art]) .ring.linked {
  padding: 3px 4px;
  border-radius: 12px;
  background: linear-gradient(#3a2a12, #1a1208);
  box-shadow: inset 0 0 0 1px #6b4f22;
}
:global(:root[data-woke-art]) .ring .link {
  position: relative;
  z-index: 1;
  width: 8px;
  height: 6px;
  margin: 0 -1px;
  background: linear-gradient(#f0d090, #a8792a 55%, #5a4020);
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px #2a1d0c;
}
</style>
