// GitHub issue links for problem reports: crash reports (main/src/woke/
// crash-reports.ts) and "Report an issue" (renderer woke/app/ReportDialog.vue).
// Pure, so main builds the link and renderer tests check it. Nothing is sent:
// the link opens GitHub's new issue page, pre-filled, and the player reads and
// edits it there before sending.

export const ISSUES_URL = 'https://github.com/guybnd/woke-poe-trade/issues/new'
// GitHub refuses very long links (around 8 KB). Keep some room.
export const URL_LIMIT = 7500
export const CLIPBOARD_NOTE = 'Log copied to clipboard, paste it here.'

// A public issue must not carry the player's name: their Windows user folder
// shows up in paths, the user name on its own in some errors, and the PoE
// account and character in game lines.
export interface ScrubNames {
  home?: string
  user?: string
  // PoE account and character names.
  names?: string[]
}

function escapeRe (s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

export function scrubText (text: string, names: ScrubNames = {}): string {
  let out = text
  const home = names.home?.replace(/[\\/]+$/, '')
  if (home && home.length > 3) {
    // Either slash, any case (Windows paths).
    const parts = home.split(/[\\/]+/).map(escapeRe)
    out = out.replace(new RegExp(parts.join('[\\\\/]+'), 'gi'), '~')
  }
  // Any other user folder, e.g. from a path the game reported.
  out = out.replace(/([A-Za-z]:[\\/]+Users[\\/]+)[^\\/\s"'<>]+/gi, '$1<user>')
  out = out.replace(/(\/(?:home|Users)\/)[^/\s"'<>]+/g, '$1<user>')
  // A pathofexile.com login cookie must never end up in a report.
  out = out.replace(/(POESESSID[=:"'\s]+)[0-9a-f]{16,}/gi, '$1<hidden>')
  const user = names.user
  if (user && user.length >= 3) out = out.replace(wholeWord(user), '<user>')
  // Account names can end in #1234; character names are letters and _.
  // Longest first, so "Name#1234" goes whole before "Name" alone.
  const own = (names.names ?? []).map(n => n.trim()).filter(n => n.length >= 3).sort((a, b) => b.length - a.length)
  for (const n of own) out = out.replace(wholeWord(n), '<name>')
  return out
}

// \b fails next to # or a non-Latin letter: look for anything that isn't a
// name character on each side instead.
function wholeWord (word: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}_#])${escapeRe(word)}(?![\\p{L}\\p{N}_])`, 'giu')
}

export type IssueKind = 'bug' | 'idea' | 'crash'

export interface IssueDraft {
  kind: IssueKind
  title: string
  // What the player wrote.
  text?: string
  // Shown above the player's text as the question to answer.
  prompt?: string
  // "Details" lines: version, OS, modules, league. Added by the app.
  info?: string[]
  // Error text (a crash's stack).
  error?: string
  // Overlay errors around a crash.
  overlayErrors?: string
  log?: string
}

export interface BuiltIssue {
  url: string
  title: string
  body: string
  labels: string
  // The whole scrubbed log, when only its last lines fit in the link.
  clipboard: string | null
  logLines: number
  logLinesShown: number
}

const LABELS: Record<IssueKind, string> = { bug: 'bug', idea: 'enhancement', crash: 'crash' }

function block (label: string, text: string): string {
  // A ``` in the text would end the code block early.
  const t = text.trim().replace(/```/g, '`​``')
  return t ? `\n\n<details><summary>${label}</summary>\n\n\`\`\`\n${t}\n\`\`\`\n</details>` : ''
}

export function issueUrlFor (title: string, body: string, labels: string): string {
  return `${ISSUES_URL}?${new URLSearchParams({ title, body, labels }).toString()}`
}

// Everything attached is scrubbed. If the link would be too long, the log is
// cut to its last lines and the whole log goes to `clipboard`; then the
// player's text, as a last resort.
export function buildIssue (draft: IssueDraft, names: ScrubNames = {}, limit = URL_LIMIT): BuiltIssue {
  const scrub = (t: string) => scrubText(t, names)
  const labels = LABELS[draft.kind]
  const title = scrub(draft.title.trim()).slice(0, 200) ||
    (draft.kind === 'idea' ? 'Idea' : draft.kind === 'crash' ? 'Crash' : 'Problem report')
  const logAll = draft.log ? scrub(draft.log).trimEnd().split('\n') : []
  let error = draft.error ? scrub(draft.error).slice(0, 2500) : ''
  let overlayErrors = draft.overlayErrors ? scrub(draft.overlayErrors).slice(0, 1500) : ''
  let text = scrub(draft.text?.trim() ?? '')

  const compose = (logLines: string[], cut: boolean, textCut: boolean) => {
    const head = [
      draft.prompt ? `**${draft.prompt}**` : null,
      text ? text + (textCut ? '\n\n(cut short: too long for a link)' : '') : null,
      draft.info?.length ? `**Details** (added by the app)\n${draft.info.map(l => `- ${scrub(l)}`).join('\n')}` : null
    ].filter(p => p != null).join('\n\n')
    const logLabel = cut ? `Log (last ${logLines.length} of ${logAll.length} lines)` : 'Log'
    return head +
      block('Error', error) +
      block('Overlay errors', overlayErrors) +
      (cut ? `\n\n**${CLIPBOARD_NOTE}**` : '') +
      block(logLabel, logLines.join('\n'))
  }

  let shown = logAll
  let cut = false
  let textCut = false
  for (;;) {
    const body = compose(shown, cut, textCut)
    const url = issueUrlFor(title, body, labels)
    if (url.length <= limit) {
      return { url, title, body, labels, clipboard: cut ? logAll.join('\n') : null, logLines: logAll.length, logLinesShown: shown.length }
    }
    if (shown.length) {
      // Drop the oldest lines: the end of a log is where things went wrong.
      cut = true
      shown = shown.length > 4 ? shown.slice(Math.ceil(shown.length / 4)) : []
    } else if (text.length > 200) {
      // Cut what was written (before encoding, so never inside a %XX escape).
      textCut = true
      text = text.slice(0, Math.floor(text.length * 0.75))
    } else if (error.length + overlayErrors.length > 200) {
      // Then the error texts (a stack full of escaped characters).
      error = error.slice(0, Math.floor(error.length * 0.75))
      overlayErrors = overlayErrors.slice(0, Math.floor(overlayErrors.length * 0.75))
    } else {
      // Nothing left to cut (a tiny limit): send it anyway.
      return { url, title, body, labels, clipboard: cut ? logAll.join('\n') : null, logLines: logAll.length, logLinesShown: shown.length }
    }
  }
}
