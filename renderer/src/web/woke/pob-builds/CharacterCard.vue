<template>
  <div :class="$style.card">
    <template v-if="snapshot">
      <div class="w-dim text-xs">
        {{ snapshot.character.class || snapshot.character.name }}<template v-if="snapshot.character.level != null"> {{ snapshot.character.level }}</template>
        · {{ snapshot.character.name }}<template v-if="buildName"> · vs <span class="w-accent">{{ buildName }}</span></template>
      </div>
      <template v-if="diff">
        <div :class="$style.row"><span>Gear slots that differ</span><b class="w-num" :class="diff.gearOff ? 'w-down' : 'w-up'">{{ diff.gearOff }} of {{ diff.gear.length }}</b></div>
        <template v-if="diff.tree">
          <div :class="$style.row"><span>Passives to take</span><b class="w-num" :class="diff.tree.added ? $style.take : 'w-up'">{{ diff.tree.added }}</b></div>
          <div :class="$style.row"><span>Passives to refund</span><b class="w-num" :class="diff.tree.removed ? 'w-down' : 'w-up'">{{ diff.tree.removed }}</b></div>
        </template>
        <div :class="$style.row"><span>Gems missing</span><b class="w-num" :class="diff.gemsMissing ? $style.take : 'w-up'">{{ diff.gemsMissing }}</b></div>
      </template>
      <div v-else class="w-dim pt-1">Pick a build in PoB builds to compare against.</div>
      <div class="w-faint text-xs pt-1">Read {{ ago }}<template v-if="status.auto"> · again on an area change</template></div>
    </template>
    <div v-else-if="status.pending" class="w-dim">Reading your character…</div>
    <div v-else class="w-dim">Not read yet.</div>
    <div v-if="status.error" class="w-down text-xs pt-1">{{ status.error }}</div>
    <div :class="$style.actions">
      <button type="button" class="w-btn" :disabled="status.pending" @click="readNow">
        <i class="fas fa-sync-alt" :class="{ 'fa-spin': status.pending }" /> Read now
      </button>
      <button v-if="diff" type="button" class="w-btn" @click="emit('open')"><i class="fas fa-columns" /> Open compare</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// The dock card: how your character differs from the build in use.
import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { useActiveBuild } from './active'
import { characterStatus, readAgo, readCharacterNow, useCharacterDiff } from './character'

const emit = defineEmits<{ (e: 'open'): void }>()

const build = useActiveBuild()
const status = characterStatus
const snapshot = computed(() => status.value.snapshot)
const diff = useCharacterDiff(build.details, build.level, build.act, build.loadout)
const buildName = computed(() => (build.relPath.value ?? '').split('/').pop()?.replace(/\.xml$/i, '') ?? '')

// The card stays open a while: keep "read N min ago" honest.
const now = shallowRef(Date.now())
const tick = setInterval(() => { now.value = Date.now() }, 30_000)
onBeforeUnmount(() => clearInterval(tick))
const ago = computed(() => snapshot.value ? readAgo(snapshot.value.readAt, now.value) : '')

function readNow () {
  readCharacterNow(build.charName.value)
}
</script>

<style module>
.card {
  padding: 6px var(--w-pad) 8px;
  display: grid;
  gap: 3px;
}
.row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.take {
  color: var(--w-accent);
}
.actions {
  display: flex;
  gap: 6px;
  padding-top: 6px;
}
.actions > button {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
