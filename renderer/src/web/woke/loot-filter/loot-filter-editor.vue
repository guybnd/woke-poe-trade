<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
      <span class="flex items-center gap-2">Hotkey: show the rule for the hovered item <w-info text="Works in your inventory, stash and on ground labels. Keep Alt in this hotkey to reach items your filter hides, since those only have a label while Alt is held." /></span>
      <w-hotkey-cell v-model="sampleHotkey" />
      <span>Hotkey: open the editor</span>
      <w-hotkey-cell v-model="editorHotkey" />
      <span>Filter folder</span>
      <input v-model="folder" class="rounded w-input px-1 block w-full font-sans" placeholder="Documents\My Games\Path of Exile">
      <span>Area level when unknown</span>
      <input v-model.number="fallbackAreaLevel" type="number" min="1" max="86" class="rounded w-input px-1 block w-24 font-sans">
    </div>

    <div class="flex flex-col gap-1">
      <span>Where saves go</span>
      <label class="flex items-start gap-2">
        <input v-model="saveMode" type="radio" value="copy" class="mt-1">
        <span class="flex items-center gap-2">A separate copy (recommended) <w-info text="Saved as &quot;&lt;filter&gt; (woke).filter&quot;. The NeverSink file stays untouched, so downloading a new version never fights your edits. Pick the (woke) filter in game once." /></span>
      </label>
      <label class="flex items-start gap-2">
        <input v-model="saveMode" type="radio" value="overwrite" class="mt-1">
        <span class="flex items-center gap-2">Overwrite the NeverSink file <w-info text="Keeps your in-game filter choice. The original is kept as &quot;&lt;filter&gt;.filter.bak&quot;; after downloading a new NeverSink version, open the editor and save to put your edits back." /></span>
      </label>
    </div>

    <label class="flex items-center gap-2">
      <input v-model="reloadViaChat" type="checkbox">
      <span>After saving, type <code>/itemfilter &lt;name&gt;</code> in chat so the game reloads the filter</span>
    </label>
    <label class="flex items-center gap-2 ml-6">
      <input v-model="reloadWhenSafe" type="checkbox" :disabled="!reloadViaChat">
      <span class="flex items-center gap-2">Quick fixes reload at once only in town or hideout <w-info text="Elsewhere they wait for &quot;Reload now&quot;. Automatic saves always wait: GGG's rules need a key press or click for every command." /></span>
    </label>

    <div class="flex items-center gap-2 w-dim text-sm">
      How your edits are kept
      <w-info :text="'Edits are stored as a list of changes (moves, restyles, hidden tiers, your own item rules) keyed by NeverSink\'s $type and $tier tags, and are reapplied every time the filter is opened.\n\nWhen NeverSink updates, changes that no longer fit (an item left the group, a tier was renamed) are flagged under Changes, where you can give each one a new home.\n\nFilters you follow on the website (the game\'s OnlineFilters folder) can be picked too; they\'re read only, so edits are saved as a local copy that won\'t auto-update. If the chat command doesn\'t pick up the change, use the refresh button next to the filter in Options › Game.'" />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import WInfo from '../ui/WInfo.vue'
import { configProp, configModelValue } from '@/web/settings/utils'
import type { LootFilterWidget } from './widget'

export default defineComponent({
  name: 'Loot filter',
  components: { WHotkeyCell, WInfo },
  props: configProp<LootFilterWidget>(),
  setup (props) {
    return {
      sampleHotkey: configModelValue(() => props.configWidget, 'sampleHotkey'),
      editorHotkey: configModelValue(() => props.configWidget, 'editorHotkey'),
      folder: configModelValue(() => props.configWidget, 'folder'),
      // A cleared box gives '' (read as area level 0); keep the last valid level.
      fallbackAreaLevel: computed({
        get: () => props.configWidget.fallbackAreaLevel,
        set: (v: number | string) => {
          const n = Number(v)
          if (v !== '' && Number.isFinite(n) && n >= 1 && n <= 86) props.configWidget.fallbackAreaLevel = Math.round(n)
        }
      }),
      saveMode: configModelValue(() => props.configWidget, 'saveMode'),
      reloadViaChat: configModelValue(() => props.configWidget, 'reloadViaChat'),
      reloadWhenSafe: configModelValue(() => props.configWidget, 'reloadWhenSafe')
    }
  }
})
</script>
