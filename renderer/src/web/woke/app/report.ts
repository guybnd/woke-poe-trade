// Problem reports: crash prompts in the overlay, and "Report an issue" in
// Settings and Ctrl+Space (ReportDialog.vue). The main process builds the
// GitHub issue (crash-reports.ts, with ipc/issue-report.ts).
import { shallowRef, type ComponentPublicInstance } from 'vue'
import { AppConfig } from '@/web/Config'
import type { WokeIssue } from '@ipc/woke-ops'
import { MODULES, isModuleOn } from '../modules'
import { hostRequest } from '../shared/host'

export function toolsContext (): string {
  const on = MODULES.filter(m => m.group !== 'apt' && isModuleOn(AppConfig(), m.id)).map(m => m.id)
  return `Tools on: ${on.length ? on.join(', ') : 'none'}`
}

// The players' Discord server (Guy's permanent invite): Settings, About and Ctrl+Space.
export const DISCORD_URL = 'https://discord.gg/XrUcvXrt4e'
export function openDiscord () { window.open(DISCORD_URL) }

// "Report an issue" dialog: open or not, shown while the overlay is.
export const reportDialogOpen = shallowRef(false)
export function openReportDialog () { reportDialogOpen.value = true }

export interface IssueForm {
  kind: 'bug' | 'idea'
  title: string
  text: string
  includeInfo: boolean
  includeLog: boolean
}

// The overlay's part of "Include app info": main adds version, Electron and OS.
export function appInfoLines (): string[] {
  const config = AppConfig()
  return [toolsContext(), `League: ${config.leagueId || 'not set'}`]
}

// Names a public issue must not show: the PoE account and followed character.
function privateNames (): string[] {
  const config = AppConfig()
  const out = [config.accountName.replace(/#\d+$/, ''), config.accountName]
  for (const w of config.widgets as unknown as Array<{ wmType: string, charName?: unknown }>) {
    if ((w.wmType === 'woke-campaign' || w.wmType === 'woke-run-timer') && typeof w.charName === 'string') out.push(w.charName)
  }
  return [...new Set(out.map(n => n.trim()).filter(Boolean))]
}

// open false: only build it, for the preview of what will be sent.
export async function issueReport (form: IssueForm, open: boolean): Promise<WokeIssue> {
  return await hostRequest('issue-report', {
    ...form,
    info: form.includeInfo ? appInfoLines() : undefined,
    names: privateNames(),
    open
  })
}

// Opens a pre-filled GitHub issue for a saved crash.
export async function reportProblem (crashId: string) {
  await hostRequest('crash-report', { id: crashId, context: toolsContext(), names: privateNames() })
}

export async function openCrashFolder () {
  await hostRequest('crash-folder', {})
}

// Overlay errors are kept (in memory, in main) to attach to the next report.
let lastSent = 0
function send (text: string) {
  const now = Date.now()
  if (now - lastSent < 2000 || /ResizeObserver loop/.test(text)) return
  lastSent = now
  hostRequest('renderer-error', { text }).catch(() => {})
}

// Vue catches errors in renders and watchers itself and only prints them, so
// without this they never reach the window handlers below or the log.
export function captureVueError (err: unknown, instance: ComponentPublicInstance | null, info: string) {
  console.error(err)
  const where = instance?.$options.name ?? instance?.$options.__name ?? 'app'
  send(`Vue error in <${where}> (${info}): ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`)
}

export function captureRendererErrors () {
  window.addEventListener('error', (e) => {
    send(e.error instanceof Error ? (e.error.stack ?? e.error.message) : `${e.message} (${e.filename}:${e.lineno})`)
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as unknown
    send(`Unhandled promise rejection: ${r instanceof Error ? (r.stack ?? r.message) : String(r)}`)
  })
}
