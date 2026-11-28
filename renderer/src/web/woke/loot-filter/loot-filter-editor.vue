<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
      <span class="flex items-center gap-2">Hotkey: show the rule for the hovered item <w-info text="Works in your inventory, stash and on ground labels.
- Keep [[Alt]] in the hotkey to reach hidden items: they only have a label while Alt is held." /></span>
      <w-hotkey-cell v-model="sampleHotkey" />
      <span>Hotkey: open the editor</span>
      <w-hotkey-cell v-model="editorHotkey" />
      <span>Filter folder</span>
      <input v-model="folder" class="rounded w-input px-1 block w-full font-sans" placeholder="Documents\My Games\Path of Exile">
      <span>Area level when unknown</span>
      <input v-model.number="fallbackAreaLevel" type="number" min="1" max="86" class="rounded w-input px-1 block w-24 font-sans">
    </div>

    <div v-if="namedProfile" class="flex flex-col gap-1">
      <span>Where saves go</span>
      <span class="w-dim text-sm">The profile in use, {{ namedProfile }}, saves to its own file. Pick it in game once.</span>
    </div>
    <div v-else class="flex flex-col gap-1">
      <span>Where saves go</span>
      <label class="flex items-start gap-2">
        <input v-model="saveMode" type="radio" value="copy" style="margin-top: 2px;">
        <span class="flex items-center gap-2">A separate copy (recommended) <w-info text="Saved as **&lt;filter&gt; (woke).filter**.
- The NeverSink file stays untouched, so a new version never fights your edits.
- Pick the (woke) filter in game once." /></span>
      </label>
      <label class="flex items-start gap-2">
        <input v-model="saveMode" type="radio" value="overwrite" style="margin-top: 2px;">
        <span class="flex items-center gap-2">Overwrite the NeverSink file <w-info text="Keeps your in-game filter choice.
- The original is kept as **&lt;filter&gt;.filter.bak**.
- After a new NeverSink download, open the editor and save to put your edits back." /></span>
      </label>
    </div>

    <WToggle v-model="reloadViaChat">After saving, type <code>/itemfilter &lt;name&gt;</code> in chat so the game reloads the filter</WToggle>
    <div class="flex items-center gap-2 ml-6">
      <WToggle v-model="reloadWhenSafe" :disabled="!reloadViaChat">Quick fixes reload at once only in town or hideout</WToggle>
      <w-info text="Elsewhere they wait for &quot;Reload now&quot;. Automatic saves always wait: GGG's rules need a key press or click for every command." />
    </div>

    <div class="flex items-center gap-2 w-dim text-sm">
      How your edits are kept
      <w-info :text="'Your edits are a list of changes, put back on NeverSink\'s filter each time it opens.\n- Moves, restyles, hidden tiers and your own rules all count.\n- After a NeverSink update, a change that no longer fits shows under **Changes**, to give it a new home.\n- A filter you follow on the website is read only: edits save as a local copy that won\'t auto-update.\n- If the chat command misses a change, press refresh by the filter in the game\'s Options › Game.'" />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import WInfo from '../ui/WInfo.vue'
import WToggle from '../ui/WToggle.vue'
import { configProp, configModelValue } from '@/web/settings/utils'
import type { LootFilterWidget } from './widget'

export default defineComponent({
  name: 'Loot filter',
  components: { WHotkeyCell, WInfo, WToggle },
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
      // A named profile always saves to "<name> (woke).filter": copy or overwrite doesn't apply.
      namedProfile: computed(() => {
        const w = props.configWidget
        const p = w.profiles?.find(x => x.id === w.activeProfile)
        return p && !p.legacyFile ? `${p.name} (woke).filter` : null
      }),
      reloadViaChat: configModelValue(() => props.configWidget, 'reloadViaChat'),
      reloadWhenSafe: configModelValue(() => props.configWidget, 'reloadWhenSafe')
    }
  }
})
</script>
