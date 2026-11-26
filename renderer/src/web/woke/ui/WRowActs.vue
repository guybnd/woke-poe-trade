<template>
  <!-- A saved list row's buttons: the one main action always on (default slot:
       Copy, Open, Use), the rest (#hover: Edit, Pin, Remove) lying over the
       row to its left on hover or focus, on a shaded backing. They take no
       room of their own and never cover the main action. The row needs
       data-row (SavedTree rows have it) or the w-line class. -->
  <span class="w-row-acts">
    <span v-if="$slots.hover" class="w-line-acts w-row-acts-hover"><slot name="hover" /></span>
    <slot />
  </span>
</template>

<style>
.w-row-acts { position: relative; display: inline-flex; align-items: center; flex: none; }
.w-row-acts > .w-row-acts-hover { right: 100%; display: inline-flex; align-items: center; gap: 2px; padding: 0 2px; border-radius: var(--w-r-sm);
  background: var(--w-panel-solid-base, #0a0806); box-shadow: -10px 0 8px 2px var(--w-panel-solid-base, #0a0806), 0 0 0 1px var(--w-line); }
[data-row]:hover .w-row-acts > .w-row-acts-hover, [data-row]:focus-within .w-row-acts > .w-row-acts-hover { visibility: visible; }
</style>
