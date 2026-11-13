<template>
  <div :class="$style.page">
    <w-setting-section title="League">
      <w-setting-row label="League" hint="Price check, market, investments, lab gems, trade searches and farming all use this one.">
        <w-select v-if="leagueOptions.length" :model-value="config.leagueId ?? ''" :options="leagueOptions" @update:model-value="config.leagueId = $event" />
        <span v-else-if="leagues.isLoading.value" class="w-dim">Loading leagues…</span>
        <span v-else class="w-dim">Couldn't load the league list</span>
        <w-button size="sm" icon="fas fa-sync-alt" :disabled="leagues.isLoading.value" title="Load the league list again" @click="leagues.load()" />
      </w-setting-row>
      <w-setting-row label="Private league" hint="Type its full name, like My League (PL12345). Clear it to go back to the list.">
        <w-field :model-value="privateLeague" placeholder="My League (PL12345)" @update:model-value="setPrivate(String($event))" />
      </w-setting-row>
      <w-setting-row label="Game language" show-hint hint="Must match the game, or item text won't be read.">
        <w-select :model-value="config.language" :options="LANGUAGES" @update:model-value="setLanguage($event as Config['language'])" />
      </w-setting-row>
      <!-- woke: the log-reading tools only know the English game text (WOKEPOET-91). -->
      <p v-if="config.language !== 'en'" class="text-xs" style="color: var(--w-warn); margin: 0;" data-qa="log-language-warning">
        <i class="fas fa-exclamation-triangle" /> Tools that read the game's log (campaign, run timer, trades, death recap, farming, league mechanics) know English game text only.
        With the game in another language they still follow zone changes and map counts, but miss zone names, level-ups, boss splits, whispers, deaths and the death recap's map list.
      </p>
      <w-setting-row v-if="config.language === 'cmn-Hant'" label="Realm">
        <w-select :model-value="config.realm" :options="REALMS" @update:model-value="setRealm($event as Config['realm'])" />
      </w-setting-row>
      <w-setting-row v-if="config.language !== 'en' && config.realm === 'pc-ggg'" label="Trade site" :show-hint="forcedIntl"
        :hint="forcedIntl ? 'Always the international site for this language.' : 'Search on the international site instead of your language\'s.'">
        <w-toggle v-model="config.useIntlSite" :disabled="forcedIntl">www.pathofexile.com</w-toggle>
      </w-setting-row>
    </w-setting-section>

    <w-setting-section title="Game folders">
      <w-setting-row stack label="Game log (Client.txt)"
        hint="Zones, level-ups and chat come from here. Leave empty to follow the running game automatically.">
        <w-path-field v-model="config.clientLog" kind="file" :extensions="['txt']" empty-text="Found automatically"
          placeholder="…\Path of Exile\logs\Client.txt">
          <w-button size="sm" :disabled="finding" @click="findLog">{{ finding ? 'Looking…' : 'Find' }}</w-button>
        </w-path-field>
        <div v-if="found.length" :class="$style.found">
          <button v-for="f in found" :key="f.path" type="button" :class="$style.pick" @click="config.clientLog = f.path; found = []">
            <span class="w-mono w-trunc">{{ f.path }}</span><span class="w-dim">{{ f.source === 'running' ? 'running game' : `written ${agoPhrase(f.modified)}` }}</span>
          </button>
        </div>
        <div v-else-if="foundNone" class="w-dim" :class="$style.small">No Client.txt found. Start the game once, or use Browse.</div>
      </w-setting-row>
      <w-setting-row stack label="Game settings (production_Config.ini)" hint="Used to read your in-game keys, like the one that opens chat.">
        <w-path-field v-model="config.gameConfig" kind="file" :extensions="['ini']" empty-text="Not set"
          placeholder="…\Documents\My Games\Path of Exile\production_Config.ini" />
      </w-setting-row>
      <w-setting-row stack label="Loot filter folder" :disabled="!lootFilter" :show-hint="!lootFilter"
        :hint="lootFilter ? 'Where the loot filter editor finds your filters.' : 'Used by the loot filter editor once you add it.'">
        <w-path-field v-if="lootFilter" :model-value="lootFilter.folder || null" kind="dir" empty-text="Default folder"
          placeholder="Documents\My Games\Path of Exile" @update:model-value="lootFilter.folder = $event ?? ''" />
      </w-setting-row>
    </w-setting-section>

    <w-setting-section title="Character">
      <w-setting-row label="Follow character"
        hint="The campaign guide and run timer follow this character's level-ups. Empty: whoever you played last.">
        <w-field :model-value="character" placeholder="Latest from Client.txt" @update:model-value="setCharacter(String($event))" />
      </w-setting-row>
      <w-setting-row label="Account name" hint="Highlights your own listings in price check, and syncs the challenge guide from your public profile.">
        <w-field v-model="config.accountName" placeholder="Account name" />
      </w-setting-row>
    </w-setting-section>
    <StashSignIn v-if="personalOn" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, shallowRef } from 'vue'
import type { Config } from '@/web/Config'
import { AppConfig } from '@/web/Config'
import { useLeagues } from '@/web/background/Leagues'
import { WButton, WField, WPathField, WSelect, WSettingRow, WSettingSection, WToggle, agoPhrase } from '../ui'
import { hostRequest } from '../shared/host'
import { personalOn } from '../personal'

// Personal only (personal.flag): never loaded otherwise.
const StashSignIn = defineAsyncComponent(() => import('../net-worth/StashSignIn.vue'))

const props = defineProps<{ config: Config }>()

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'cmn-Hant', label: '正體中文' },
  { value: 'ko', label: '한국어' }
]
const REALMS = [{ value: 'pc-ggg', label: 'International' }, { value: 'pc-garena', label: 'Garena (Taiwan)' }]

const leagues = useLeagues()
if (!leagues.list.value.length && !leagues.isLoading.value) leagues.load()
const leagueOptions = computed(() => {
  const list = leagues.list.value.map(l => ({ value: l.id, label: l.id }))
  const cur = props.config.leagueId
  if (cur && !list.some(o => o.value === cur)) list.push({ value: cur, label: `${cur} (private)` })
  return list
})
const privateLeague = computed(() => {
  const cur = props.config.leagueId ?? ''
  return leagues.list.value.some(l => l.id === cur) ? '' : cur
})
function setPrivate (v: string) {
  const id = v.trim()
  props.config.leagueId = id || leagues.list.value[Math.min(1, leagues.list.value.length - 1)]?.id || props.config.leagueId
}

const forcedIntl = computed(() => props.config.realm === 'pc-ggg' && props.config.language === 'cmn-Hant')
function setLanguage (value: Config['language']) {
  props.config.language = value
  AppConfig().language = value
  if (value !== 'cmn-Hant') props.config.realm = 'pc-ggg'
  props.config.useIntlSite = props.config.realm === 'pc-ggg' && value === 'cmn-Hant'
}
function setRealm (value: Config['realm']) {
  props.config.realm = value
  props.config.useIntlSite = value === 'pc-ggg' && props.config.language === 'cmn-Hant'
}

type W = { wmType: string } & Record<string, unknown>
const widget = (type: string) => (props.config.widgets as unknown as W[]).find(w => w.wmType === type)
const lootFilter = computed(() => widget('woke-loot-filter') as ({ folder: string } & W) | undefined)

// One character for both the campaign guide and the run timer.
const character = computed(() => {
  for (const t of ['woke-campaign', 'woke-run-timer']) {
    const name = widget(t)?.charName
    if (typeof name === 'string' && name.trim()) return name
  }
  return ''
})
function setCharacter (v: string) {
  for (const t of ['woke-campaign', 'woke-run-timer']) {
    const w = widget(t)
    if (w) w.charName = v.trim()
  }
}

interface FoundLog { path: string, source: string, modified: number }
const found = shallowRef<FoundLog[]>([])
const foundNone = shallowRef(false)
const finding = shallowRef(false)
async function findLog () {
  finding.value = true
  foundNone.value = false
  try {
    const list = await hostRequest('setup-game-logs', null, 60_000)
    found.value = list.slice(0, 4)
    foundNone.value = !list.length
  } catch {
    foundNone.value = true
  } finally {
    finding.value = false
  }
}
</script>

<style module>
.page { display: flex; flex-direction: column; gap: var(--w-s5); }
.found { display: flex; flex-direction: column; gap: 2px; }
.pick {
  display: flex; justify-content: space-between; gap: var(--w-s3); text-align: left;
  padding: var(--w-s1) var(--w-s2); border-radius: var(--w-r-sm); font-size: var(--w-fs-sm); color: var(--w-fg);
  background: var(--w-panel-2); border: 1px solid var(--w-line);
}
.pick:hover { border-color: var(--w-accent); }
.small { font-size: var(--w-fs-sm); }
</style>
