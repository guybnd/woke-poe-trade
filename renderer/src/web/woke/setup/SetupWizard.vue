<template>
  <div :class="$style.wizard">
    <nav :class="$style.rail" aria-label="Setup steps">
      <div :class="$style.brand">
        <img :src="appIconUrl(config.appIcon)" alt="" :class="$style.logo">
        <div>
          <div :class="$style.name">Woke PoE Trade</div>
          <div class="w-faint">v{{ version }}</div>
        </div>
      </div>
      <button v-for="(s, i) in STEPS" :key="s.id" type="button"
        :class="[$style.stepBtn, { [$style.on]: i === step, [$style.done]: i < step }]"
        :aria-current="i === step ? 'step' : undefined"
        @click="go(i)">
        <span :class="$style.n">{{ i < step ? '✓' : i + 1 }}</span>{{ s.label }}
      </button>
    </nav>

    <main :class="$style.body">
      <!-- 1. Game -->
      <section v-if="STEPS[step].id === 'game'" :class="$style.page">
        <h1 :class="$style.h">Where is Path of Exile?</h1>
        <p class="w-dim">
          The campaign tracker, run timer, league mechanics and loot filter tools read the game's log file,
          <span class="w-num">Client.txt</span>. Price checks work without it.
        </p>
        <p v-if="prefs?.migration === 'apt-settings'" :class="$style.note">
          <i class="fas fa-check w-up" /> Your Awakened PoE Trade settings (league, hotkeys, language) were brought over.
        </p>
        <p v-else-if="prefs?.migration === 'toolkit'" :class="$style.note">
          <i class="fas fa-check w-up" /> Your settings and market history from the earlier build were brought over.
        </p>

        <div :class="$style.list" role="radiogroup" aria-label="Log file">
          <label :class="[$style.opt, { [$style.optOn]: logChoice === '' }]">
            <input v-model="logChoice" type="radio" value="">
            <div class="min-w-0">
              <div>Automatic <span :class="$style.rec">recommended</span></div>
              <div class="w-faint">Follows whichever copy of the game is running, on any drive.</div>
            </div>
          </label>
          <label v-for="log in logs" :key="log.path" :class="[$style.opt, { [$style.optOn]: logChoice === log.path }]">
            <input v-model="logChoice" type="radio" :value="log.path">
            <div class="min-w-0">
              <div class="w-num w-trunc" :title="log.path">{{ log.path }}</div>
              <div class="w-faint">{{ SOURCE_LABEL[log.source] }} · written {{ ago(log.modified) }}</div>
            </div>
          </label>
          <label v-if="logChoice && !logs.some(l => l.path === logChoice)" :class="[$style.opt, $style.optOn]">
            <input v-model="logChoice" type="radio" :value="logChoice">
            <div class="min-w-0">
              <div class="w-num w-trunc" :title="logChoice">{{ logChoice }}</div>
              <div class="w-faint">Picked by you</div>
            </div>
          </label>
          <div v-if="searching" :class="$style.opt" class="w-dim"><i class="fas fa-circle-notch fa-spin" /> Looking on every drive…</div>
          <div v-else-if="!logs.length" :class="$style.opt" class="w-dim">
            No Client.txt found yet. That's fine: Automatic picks it up when you start the game.
          </div>
        </div>
        <div class="flex gap-2 items-center">
          <w-button size="sm" icon="fas fa-folder-open" @click="browse">Browse…</w-button>
          <w-button size="sm" variant="ghost" icon="fas fa-sync" :disabled="searching" @click="findLogs">Search again</w-button>
        </div>
      </section>

      <!-- 2. League -->
      <section v-else-if="STEPS[step].id === 'league'" :class="$style.page">
        <h1 :class="$style.h">Which league do you play?</h1>
        <p class="w-dim">Price checks, poe.ninja prices and trade searches use this league.</p>
        <div v-if="leagues.isLoading.value" class="w-dim"><i class="fas fa-circle-notch fa-spin" /> Loading leagues…</div>
        <div v-else-if="leagues.error.value" :class="$style.note">
          <i class="fas fa-exclamation-triangle w-down" /> Couldn't load the league list from pathofexile.com.
          <w-button size="sm" @click="leagues.load()">Try again</w-button>
          <span class="w-dim">You can also pick it later in the overlay's settings.</span>
        </div>
        <div v-else :class="$style.chips" role="radiogroup" aria-label="League">
          <button v-for="l in leagues.list.value" :key="l.id" type="button" role="radio"
            :aria-checked="config.leagueId === l.id"
            :class="[$style.chip, { [$style.chipOn]: config.leagueId === l.id }]"
            @click="AppConfig().leagueId = l.id">{{ l.id }}</button>
        </div>

        <h2 :class="$style.h2">Game language</h2>
        <div :class="$style.chips" role="radiogroup" aria-label="Game language">
          <button v-for="l in LANGUAGES" :key="l.id" type="button" role="radio"
            :aria-checked="config.language === l.id"
            :class="[$style.chip, { [$style.chipOn]: config.language === l.id }]"
            @click="setLanguage(l.id)">{{ l.label }}</button>
        </div>
        <p class="w-faint">Must match the game client's language, or price checks can't read items.</p>
      </section>

      <!-- 3. Tools -->
      <section v-else-if="STEPS[step].id === 'tools'" :class="[$style.page, $style.pageFlush]">
        <div :class="$style.pad">
          <h1 :class="$style.h">Which tools do you want?</h1>
          <p class="w-dim">Switched-off tools don't load, don't take hotkeys and don't poll anything. Price check is always on.</p>
        </div>
        <preset-bar :config="wokeConfig" />
        <module-list :config="wokeConfig" />
      </section>

      <!-- 4. Updates -->
      <section v-else-if="STEPS[step].id === 'updates'" :class="$style.page">
        <h1 :class="$style.h">Updates and problems</h1>
        <div v-if="prefs" :class="$style.list">
          <label v-if="prefs.canAutoUpdate" :class="$style.toggle">
            <div class="min-w-0">
              <div>Install updates automatically</div>
              <div class="w-faint">Downloads in the background and installs when you quit. Never in the middle of a map.</div>
            </div>
            <w-toggle :model-value="prefs.autoUpdate" :aria-label="TOGGLE_LABEL.autoUpdate" @update:model-value="v => setPref({ autoUpdate: v })" />
          </label>
          <div v-else :class="$style.toggle">
            <div class="min-w-0">
              <div>Updates</div>
              <div class="w-faint">This copy can't update itself (portable or development build). Get new versions from the releases page.</div>
            </div>
          </div>
          <label :class="$style.toggle">
            <div class="min-w-0">
              <div>Offer to report crashes</div>
              <div class="w-faint">If the app crashes, it asks next time whether to report it. Nothing is sent unless you press Report, and you see the report first.</div>
            </div>
            <w-toggle :model-value="prefs.crashPrompt" :aria-label="TOGGLE_LABEL.crashPrompt" @update:model-value="v => setPref({ crashPrompt: v })" />
          </label>
          <label v-if="prefs.canOpenAtLogin" :class="$style.toggle">
            <div class="min-w-0">
              <div>Start with Windows</div>
              <div class="w-faint">Waits in the tray, ready when the game is.</div>
            </div>
            <w-toggle :model-value="prefs.openAtLogin" :aria-label="TOGGLE_LABEL.openAtLogin" @update:model-value="v => setPref({ openAtLogin: v })" />
          </label>
        </div>
        <div v-else class="w-dim"><i class="fas fa-circle-notch fa-spin" /></div>
      </section>

      <!-- 5. Ready -->
      <section v-else :class="$style.page">
        <h1 :class="$style.h">You're set</h1>
        <p class="w-dim">Open Path of Exile, then use these keys in game:</p>
        <div :class="$style.keys">
          <template v-for="k in keys" :key="k.label + k.key">
            <w-kbd :keys="k.key" />
            <span>{{ k.label }}</span>
          </template>
        </div>
        <p class="w-dim">
          Settings are behind the cog once the overlay is open. Every key can be changed in Settings → Hotkeys.
          The app keeps running in the tray: right-click its icon to quit or run this setup again.
        </p>
      </section>

      <footer :class="$style.foot">
        <span class="w-faint flex-1">You can change all of this later in Settings.</span>
        <w-button v-if="step > 0" variant="ghost" @click="go(step - 1)">Back</w-button>
        <w-button v-if="step < STEPS.length - 1" variant="primary" @click="go(step + 1)">Next</w-button>
        <w-button v-else variant="primary" :disabled="finishing" @click="finish">Finish</w-button>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { DateTime } from 'luxon'
import { AppConfig, saveConfig, pushHostConfig } from '@/web/Config'
import type { Config } from '@/web/Config'
import { Host } from '@/web/background/IPC'
import { useLeagues } from '@/web/background/Leagues'
import { WButton, WKbd, WToggle } from '../ui'
import { hostRequest } from '../shared/host'
import { appIconUrl } from '../ui/app-icon'
import { ensureWokeConfig, WOKE_CONFIG_VERSION } from '../modules'
import PresetBar from '../switchboard/PresetBar.vue'
import ModuleList from '../switchboard/ModuleList.vue'
import { fieldKey, hotkeyFields } from '../settings/hotkey-fields'

interface FoundLog { path: string, source: 'running' | 'standalone' | 'steam' | 'folder', modified: number, size: number }
interface Prefs {
  wizardShown: boolean
  autoUpdate: boolean
  crashPrompt: boolean
  openAtLogin: boolean
  canOpenAtLogin: boolean
  canAutoUpdate: boolean
  version: string
  platform: string
  migration: 'none' | 'toolkit' | 'apt-settings'
}

const STEPS = [
  { id: 'game', label: 'Game' },
  { id: 'league', label: 'League' },
  { id: 'tools', label: 'Tools' },
  { id: 'updates', label: 'Updates' },
  { id: 'ready', label: 'Ready' }
] as const

const TOGGLE_LABEL = {
  autoUpdate: 'Install updates automatically',
  crashPrompt: 'Offer to report crashes',
  openAtLogin: 'Start with Windows'
}

const SOURCE_LABEL: Record<FoundLog['source'], string> = {
  running: 'Running now',
  standalone: 'Standalone client',
  steam: 'Steam',
  folder: 'Found on disk'
}

const LANGUAGES: Array<{ id: Config['language'], label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
  { id: 'cmn-Hant', label: '正體中文' },
  { id: 'ko', label: '한국어' }
]

// Always read through AppConfig(): another window's save comes back as
// config-changed, which swaps in a fresh config object.
const config = computed(() => AppConfig())
const wokeConfig = computed(() => ensureWokeConfig(AppConfig()))
const version = Host.version

const step = shallowRef(0)
const finishing = shallowRef(false)

// ── Game ───────────────────────────────────────────────
const logs = shallowRef<FoundLog[]>([])
const searching = shallowRef(false)
const logChoice = shallowRef<string>(AppConfig().clientLog ?? '')

async function findLogs () {
  searching.value = true
  try {
    logs.value = await hostRequest('setup-game-logs', {}, 60_000)
  } catch {
    logs.value = []
  } finally {
    searching.value = false
  }
}
findLogs()

async function browse () {
  try {
    const picked = await hostRequest('setup-browse-log', {}, 10 * 60_000)
    if (picked) logChoice.value = picked
  } catch {}
}

watch(logChoice, (choice) => { AppConfig().clientLog = choice || null })

function ago (ms: number) {
  return DateTime.fromMillis(ms).toRelative() ?? 'a while ago'
}

// ── League ─────────────────────────────────────────────
const leagues = useLeagues()
leagues.load()

function setLanguage (id: Config['language']) {
  if (AppConfig().language === id) return
  AppConfig().language = id
  // The league list comes from the language's own site.
  leagues.load()
}

// ── Updates ────────────────────────────────────────────
const prefs = shallowRef<Prefs | null>(null)
;(hostRequest('setup-prefs', {}) as Promise<Prefs>).then(p => { prefs.value = p }).catch(() => {})

async function setPref (patch: Partial<Prefs>) {
  if (prefs.value) prefs.value = { ...prefs.value, ...patch }
  try {
    prefs.value = await (hostRequest('setup-prefs-set', patch) as Promise<Prefs>)
  } catch {}
}

// ── Ready ──────────────────────────────────────────────
const keys = computed(() => {
  // Worked out when the step opens, after module picks.
  if (STEPS[step.value].id !== 'ready') return []
  const fields = hotkeyFields(AppConfig()).filter(f => !f.off && fieldKey(f))
  const out: Array<{ key: string, label: string }> = [{ key: AppConfig().overlayKey, label: 'Open or close the overlay' }]
  const pc = fields.find(f => f.id === 'pc')
  if (pc) out.push({ key: fieldKey(pc)!, label: 'Price check the item under your cursor' })
  // Then the toolkit's own keys (fields of a placed widget: "<wmId>-…").
  for (const f of fields) {
    if (out.length >= 10) break
    if (!/^\d/.test(f.id)) continue
    out.push({ key: fieldKey(f)!, label: f.label })
  }
  return out
})

// ── Flow ───────────────────────────────────────────────
function persist () {
  saveConfig()
  pushHostConfig()
}

function go (i: number) {
  persist()
  step.value = Math.max(0, Math.min(STEPS.length - 1, i))
}

async function finish () {
  finishing.value = true
  const woke = ensureWokeConfig(AppConfig()).woke
  woke.setupDone = true
  // A fresh config is already in today's shape: no woke fix-up is due on it.
  woke.version ??= WOKE_CONFIG_VERSION
  persist()
  try {
    await hostRequest('setup-finish', {})
  } catch {
    window.close()
  }
}
</script>

<style module>
.wizard {
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-columns: 200px 1fr;
  background: var(--w-panel-2);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
}
.rail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 16px 10px;
  background: var(--w-panel);
  border-right: 1px solid var(--w-line);
}
.brand { display: flex; gap: 10px; align-items: center; padding: 0 6px 16px; }
.logo { width: 32px; height: 32px; }
.name { white-space: nowrap; font-family: var(--w-head); font-size: var(--w-fs-lg); color: var(--w-accent); letter-spacing: var(--w-head-track); }
.stepBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: var(--w-radius-sm);
  color: var(--w-dim);
  text-align: left;
}
.stepBtn:hover { color: var(--w-fg); }
.on { background: var(--w-accent-soft); color: var(--w-fg); }
.done { color: var(--w-up); }
.n { width: 16px; font-family: var(--w-num); font-size: var(--w-fs-xs); text-align: center; }
.body { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.page {
  flex: 1;
  overflow-y: auto;
  padding: 22px 26px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pageFlush { padding: 0 0 12px; gap: 0; }
.pad { padding: 22px 26px 0; display: flex; flex-direction: column; gap: 8px; }
.page p { max-width: 62ch; }
.h { font-family: var(--w-head); font-size: var(--w-fs-xl); color: var(--w-fg); letter-spacing: var(--w-head-track); }
.h2 { font-family: var(--w-head); font-size: var(--w-fs-lg); color: var(--w-fg); margin-top: 10px; }
.note {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
  padding: 8px 10px;
  border: 1px solid var(--w-line);
  border-radius: var(--w-radius-sm);
  background: var(--w-panel);
}
.rec { margin-left: 6px; font-size: var(--w-fs-caps); letter-spacing: 0.06em; text-transform: var(--w-caps-case); color: var(--w-accent); font-family: var(--w-caps-face); }
.list { display: flex; flex-direction: column; border: 1px solid var(--w-line); border-radius: var(--w-radius-sm); overflow: hidden; }
.opt, .toggle {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid var(--w-line-soft);
  cursor: pointer;
}
.opt:first-child, .toggle:first-child { border-top: 0; }
.opt input { accent-color: var(--w-accent); flex: none; }
.optOn { background: var(--w-accent-soft); }
.toggle { justify-content: space-between; cursor: default; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 3px 12px; border-radius: var(--w-r-pill); border: 1px solid var(--w-line); color: var(--w-dim); }
.chip:hover { color: var(--w-fg); }
.chipOn { border-color: var(--w-accent); color: var(--w-accent); background: var(--w-accent-soft); }
.keys { display: grid; grid-template-columns: max-content 1fr; gap: 8px 14px; align-items: center; }
.foot {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 16px;
  border-top: 1px solid var(--w-line);
  background: var(--w-panel);
}
</style>
