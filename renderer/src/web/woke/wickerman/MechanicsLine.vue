<template>
  <!-- 3.30 Wickerman module: one line per Viscera this zone's boss drops; versions on hover. -->
  <div v-for="h in here" :key="h.v.name" :class="$style.line" :title="versions(h.v)" data-woke-wickerman-line>
    <span :class="$style.label">Wickerman</span>
    <span class="min-w-0 w-trunc">{{ h.boss }} drops <span class="w-accent">{{ h.v.name }}</span> <span class="w-dim">· {{ h.v.slot }}</span></span>
  </div>
</template>

<script setup lang="ts">
import { useVisceraHere } from './here'
import type { Viscera } from './viscera'

const { here } = useVisceraHere()
const versions = (v: Viscera) => v.tiers.map(t => `${t.label}: ${t.text.replace(/\n/g, ' · ')}`).join('\n')
</script>

<style module>
.line { display: flex; align-items: baseline; gap: 8px; padding: 4px var(--w-pad); border-top: 1px solid var(--w-line); font-size: var(--w-fs-sm); }
.label { flex: none; color: var(--w-gold); font-family: var(--w-caps-face); }
</style>
