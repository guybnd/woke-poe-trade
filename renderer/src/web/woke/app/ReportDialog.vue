<template>
  <div v-if="reportDialogOpen && wm.active.value" ref="box" :class="$style.place" :style="spot ? { left: `${spot.x * 100}%`, top: `${spot.y * 100}%` } : undefined">
  <!-- Keys stay in the dialog: Settings listens on the window (Esc, Ctrl+F). Esc closes only the dialog. -->
  <div data-w-popup role="dialog" aria-label="Report an issue" :class="$style.dialog" @keydown.stop="onKey">
    <div ref="handle" :class="$style.head" title="Drag to move" @pointerdown="drag">
      <i class="fas fa-bug w-accent" />
      <span :class="$style.heading">Report an issue</span>
      <button type="button" class="w-icon-btn" title="Close" aria-label="Close" @pointerdown.stop @click="close"><i class="fas fa-times" /></button>
    </div>
    <div :class="$style.body">
      <w-segmented v-model="kind" :options="KINDS" />
      <w-field v-model="title" :placeholder="kind === 'idea' ? 'Your idea in a few words' : 'What went wrong, in a few words'" label="Title" />
      <textarea v-model="text" class="w-input" :class="$style.text" rows="6" aria-label="What happened"
        :placeholder="kind === 'idea' ? 'What would you like it to do?' : 'What happened, and what were you doing?'" />
      <div :class="$style.toggles">
        <w-toggle v-model="includeInfo" title="Version, Windows, Electron, modules on and league">Include app info</w-toggle>
        <w-toggle v-model="includeLog" title="The app's recent log, with your names and folders hidden">Include recent log</w-toggle>
      </div>
      <div v-if="previewOn" :class="$style.preview" aria-label="Preview">
        <div v-if="previewError" class="w-down">{{ previewError }}</div>
        <template v-else-if="preview">
          <div class="w-dim">Title: <span class="w-fg">{{ preview.title }}</span> · Label: {{ preview.labels }}</div>
          <div v-if="preview.clipboard" class="w-accent">The log is too long for a link: the issue gets its last {{ preview.logLinesShown }} of {{ preview.logLines }} lines, and the whole log goes to your clipboard to paste.</div>
          <pre :class="$style.pre">{{ preview.body }}</pre>
        </template>
        <div v-else class="w-dim">…</div>
      </div>
      <div class="w-dim" :class="$style.note">Opens a pre-filled issue on GitHub in your browser. You can edit it there before sending. Needs a GitHub account.</div>
    </div>
    <div :class="$style.foot">
      <w-button size="sm" variant="ghost" :aria-pressed="previewOn" @click="previewOn = !previewOn">{{ previewOn ? 'Hide preview' : 'Preview' }}</w-button>
      <span :class="$style.grow" />
      <w-button size="sm" variant="ghost" @click="close">Cancel</w-button>
      <w-button size="sm" variant="primary" icon="fas fa-external-link-alt" :disabled="sending || !canSend" @click="send">Open on GitHub</w-button>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
// "Report an issue": a small pop-up over the overlay (Settings, Ctrl+Space).
// It never sends anything itself: Open on GitHub opens a pre-filled issue.
import { computed, inject, onUnmounted, shallowRef, watch } from 'vue'
import type { WokeIssue } from '@ipc/woke-ops'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { WButton, WField, WSegmented, WToggle, toast } from '../ui'
import { dragSpot, type Spot } from '../ui/drag-spot'
import { issueReport, reportDialogOpen, type IssueForm } from './report'

const wm = inject<WidgetManager>('wm')!

const KINDS = [{ value: 'bug', label: 'Bug' }, { value: 'idea', label: 'Idea' }]
const kind = shallowRef<IssueForm['kind']>('bug')
const title = shallowRef('')
const text = shallowRef('')
const includeInfo = shallowRef(true)
const includeLog = shallowRef(false)
const previewOn = shallowRef(false)
const preview = shallowRef<WokeIssue | null>(null)
const previewError = shallowRef<string | null>(null)
const sending = shallowRef(false)
const canSend = computed(() => title.value.trim() !== '' || text.value.trim() !== '')

const form = (): IssueForm => ({ kind: kind.value, title: title.value, text: text.value, includeInfo: includeInfo.value, includeLog: includeLog.value })

// The preview is built by the same code as the link, so it shows exactly what goes.
let previewTimer: ReturnType<typeof setTimeout> | undefined
let previewSeq = 0
function refreshPreview () {
  clearTimeout(previewTimer)
  if (!previewOn.value || !reportDialogOpen.value) return
  previewTimer = setTimeout(async () => {
    const seq = ++previewSeq
    try {
      const built = await issueReport(form(), false)
      if (seq === previewSeq) { preview.value = built; previewError.value = null }
    } catch (e) {
      if (seq === previewSeq) previewError.value = `Couldn't build the preview: ${e instanceof Error ? e.message : String(e)}`
    }
  }, 250)
}
watch([previewOn, kind, title, text, includeInfo, includeLog, reportDialogOpen], refreshPreview)

async function send () {
  if (sending.value || !canSend.value) return
  sending.value = true
  try {
    const built = await issueReport(form(), true)
    toast(built.clipboard ? 'Opened GitHub in your browser. The log is on your clipboard: paste it into the issue.' : 'Opened GitHub in your browser.', { ms: 5000 })
    title.value = ''
    text.value = ''
    close()
  } catch (e) {
    toast(`Couldn't open GitHub: ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    sending.value = false
  }
}

function onKey (e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onUnmounted(() => { clearTimeout(previewTimer); previewSeq++ })

function close () {
  clearTimeout(previewTimer)
  previewSeq++
  previewError.value = null
  reportDialogOpen.value = false
  previewOn.value = false
  preview.value = null
}

// Where it was dragged to: kept for next time, on this PC.
const SPOT_KEY = 'woke.reportDialog.spot'
function loadSpot (): Spot | null {
  try {
    const s = JSON.parse(localStorage.getItem(SPOT_KEY) ?? 'null') as Spot | null
    return s && typeof s.x === 'number' && typeof s.y === 'number' ? s : null
  } catch { return null }
}
const spot = shallowRef<Spot | null>(loadSpot())
const box = shallowRef<HTMLElement | null>(null)
const handle = shallowRef<HTMLElement | null>(null)
function drag (e: PointerEvent) {
  if (!handle.value || !box.value) return
  dragSpot(e, handle.value, (s, done) => {
    spot.value = s
    if (done) {
      try { localStorage.setItem(SPOT_KEY, JSON.stringify(s)) } catch {}
    }
  }, box.value)
}
</script>

<style module>
/* The spot is the top centre (drag-spot.ts). Zoom goes on the dialog inside, so
   the spot stays a share of the screen at any UI size. */
.place {
  position: fixed;
  left: 50%;
  top: 18%;
  transform: translateX(-50%);
  /* The pop-up band (AppNotices 1000, HelpCard 1002): panels' own z-index grows with use. */
  z-index: 1001;
}
.dialog {
  width: 440px;
  max-width: calc(100vw - 32px);
  display: flex;
  flex-direction: column;
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
  color: var(--w-fg);
  background: var(--w-panel);
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-md, 6px);
  box-shadow: var(--w-shadow);
  zoom: var(--w-ui-scale, 1);
}
.head {
  display: flex;
  align-items: center;
  gap: var(--w-s2);
  padding: var(--w-s2) var(--w-s2) var(--w-s2) var(--w-s3);
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.heading { flex: 1; font-family: var(--w-title, inherit); color: var(--w-accent); }
.body { display: flex; flex-direction: column; gap: var(--w-s2); padding: 0 var(--w-s3) var(--w-s2); }
.text { resize: vertical; min-height: 80px; padding: var(--w-s1) var(--w-s2); font-family: var(--w-body); font-size: var(--w-fs-md); }
.toggles { display: flex; flex-wrap: wrap; gap: var(--w-s4); }
.preview { display: flex; flex-direction: column; gap: var(--w-s1); font-size: var(--w-fs-sm); }
.pre {
  max-height: 220px;
  overflow: auto;
  margin: 0;
  padding: var(--w-s2);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--w-mono, monospace);
  font-size: var(--w-fs-xs, 11px);
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
}
.note { font-size: var(--w-fs-sm); }
.foot { display: flex; align-items: center; gap: var(--w-s2); padding: var(--w-s2) var(--w-s3) var(--w-s3); }
.grow { flex: 1; }
</style>
