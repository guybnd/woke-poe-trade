<template>
  <!-- 3.30 Wickerman module: only in zones whose boss drops a Viscera. -->
  <DockItem id="wickerman" title="Wickerman" :show="here.length > 0" :badge="here.length > 1 ? here.length : null"
    pinnable card-width="26rem">
    <template #card>
      <div :class="$style.body" data-woke-wickerman-card>
        <div class="w-head-font w-accent w-trunc">{{ zoneName }}</div>
        <div v-for="h in here" :key="h.v.name" :class="$style.one">
          <div :class="$style.head">
            <span class="min-w-0 w-trunc">{{ h.v.name }}</span>
            <span class="w-dim whitespace-nowrap">· {{ h.v.slot }}</span>
            <span class="ml-auto w-dim whitespace-nowrap w-trunc" :class="h.unsure && $style.unsure"
              :title="h.unsure ? 'Not confirmed' : undefined">{{ h.boss }}</span>
          </div>
          <div v-for="t in h.v.tiers" :key="t.label" :class="$style.tier">
            <span :class="$style.label">{{ t.label }}</span>
            <span :class="$style.text">{{ t.text }}</span>
          </div>
        </div>
      </div>
    </template>
  </DockItem>
</template>

<script setup lang="ts">
import DockItem from '../dock/DockItem.vue'
import { useVisceraHere } from './here'

// Mounted by WokeOverlay only while the module is on.
const { here, zoneName } = useVisceraHere()
</script>

<style module>
.body { display: flex; flex-direction: column; gap: 6px; padding: 4px var(--w-pad) 6px; font-size: var(--w-fs-sm); }
.one { display: flex; flex-direction: column; gap: 1px; padding-top: 4px; border-top: 1px solid var(--w-line); }
.head { display: flex; align-items: baseline; gap: 6px; }
.tier { display: flex; align-items: baseline; gap: 8px; }
.label { flex: none; min-width: 3.5em; color: var(--w-gold); font-family: var(--w-caps-face); }
.text { min-width: 0; white-space: pre-line; color: var(--w-r-magic); }
.unsure { text-decoration: underline dotted; text-underline-offset: 2px; }
</style>
