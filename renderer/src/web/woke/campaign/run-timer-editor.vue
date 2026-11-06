<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <input class="w-input rounded px-1 w-48" placeholder="Widget title" v-model="title" />
    <div class="flex items-center gap-2 w-dim text-sm">
      How it works
      <w-info :text="'The timer reads Client.txt, so set its path in Settings. A run splits when you first enter each new act and finishes when you reach the Epilogue after Kitava.\n\nUse the strip\'s buttons (with the overlay active) to start, pause or end a run by hand.\n\nWith the campaign tracker placed, the run time shows in the tracker\'s strip and this widget only shows the splits panel.'" />
    </div>
    <w-toggle v-model="autoStart">Start a new run when a character enters The Twilight Strand</w-toggle>
    <w-toggle v-model="subSplits">Sub-splits for key bosses (Brutus, Merveil, Dominus, Kitava…), timed when they first speak, or when you enter their area</w-toggle>
    <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
      <span>Hotkey: pause/resume</span>
      <w-hotkey-cell v-model="hotkeyPause" />
      <span>Hotkey: show/hide splits</span>
      <w-hotkey-cell v-model="hotkeySplits" />
    </div>
    <label class="flex flex-col gap-1">
      <span>Character name (optional)</span>
      <input v-model="charName" class="w-input rounded px-1 leading-6 w-64"
        placeholder="Only follow this character's level-ups">
    </label>
    <div class="flex items-center gap-2">
      <span class="w-dim">{{ configWidget.history.length }} saved {{ configWidget.history.length === 1 ? 'run' : 'runs' }}</span>
      <button class="btn" :disabled="!configWidget.history.length" @click="confirmClear = true" v-if="!confirmClear">Clear past runs</button>
      <template v-else>
        <span>Delete every saved run, including your PB?</span>
        <button class="btn" @click="clearHistory">Delete</button>
        <button class="btn" @click="confirmClear = false">Keep</button>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import WToggle from '../ui/WToggle.vue'
import { defineComponent, shallowRef } from 'vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import WInfo from '../ui/WInfo.vue'
import { configProp, configModelValue } from '@/web/settings/utils'
import { migrateRunTimer } from './run-timer'
import type { RunTimerWidget } from './run-timer'

export default defineComponent({
  name: 'Run timer',
  components: { WToggle, WHotkeyCell, WInfo },
  props: configProp<RunTimerWidget>(),
  setup (props) {
    migrateRunTimer(props.configWidget)
    const confirmClear = shallowRef(false)
    return {
      confirmClear,
      title: configModelValue(() => props.configWidget, 'wmTitle'),
      autoStart: configModelValue(() => props.configWidget, 'autoStart'),
      subSplits: configModelValue(() => props.configWidget, 'subSplits'),
      hotkeyPause: configModelValue(() => props.configWidget, 'hotkeyPause'),
      hotkeySplits: configModelValue(() => props.configWidget, 'hotkeySplits'),
      charName: configModelValue(() => props.configWidget, 'charName'),
      clearHistory () {
        props.configWidget.history = []
        props.configWidget.compareTo = null
        confirmClear.value = false
      }
    }
  }
})
</script>
