import type { ShortcutAction } from '@ipc/types'
import type { Widget, Anchor } from '@/web/overlay/widgets'

export const CHALLENGES_TYPE = 'woke-challenges'

// CraniumCarnage's league challenge guide. Editable in settings in case it moves.
export const DEFAULT_GUIDE_URL = 'https://craniumviolence.github.io/'

export interface ChallengeSummary {
  done: number
  total: number
  next: Array<{ n: number, name: string }>
}

export interface ChallengesWidget extends Widget {
  anchor: Anchor
  url: string
  hotkey: string | null
  // A dock icon with the count and the next challenges (off by default).
  dockIcon: boolean
  // What the last open saw, for the dock card: the guide itself loads on open.
  summary: ChallengeSummary | null
  // The league that summary is from: a new league's challenges start over.
  summaryLeague?: string | null
  lastSynced: number | null
}

// A challenge as the guide page shows it. `done` is the guide's own tick.
export interface GuideRow {
  n: number
  name: string
  anchor: string
  done: boolean
}

// A challenge as the game's profile page shows it. One challenge has no count.
export interface ProfileRow {
  name: string
  have: number | null
  need: number | null
  done: boolean
}

export interface ProfilePage {
  rows: ProfileRow[]
  notFound: boolean
}

export type ProfileRead = 'ok' | 'not-found' | 'private' | 'waiting'

export interface ChallengeRow extends GuideRow {
  have: number | null
  need: number | null
}

export function guideUrl (custom: string | undefined): string {
  const url = (custom ?? '').trim()
  return /^https:\/\//i.test(url) ? url : DEFAULT_GUIDE_URL
}

// Accounts are "Name#1234" in the game and "Name-1234" in profile links.
export function profileUrl (account: string): string {
  const name = account.trim().replace('#', '-')
  return `https://www.pathofexile.com/account/view-profile/${encodeURIComponent(name)}/challenges`
}

export function hotkeyTarget (wmId: number): string {
  return `woke-challenges:${wmId}`
}

export function parseHotkeyTarget (target: string): number | null {
  const m = /^woke-challenges:(\d+)$/.exec(target)
  return m ? Number(m[1]) : null
}

// The hotkey also gives the overlay focus, so you can scroll and tick at once.
export function challengesShortcuts (widget: ChallengesWidget): ShortcutAction[] {
  if (!widget.hotkey) return []
  return [{ shortcut: widget.hotkey, keepModKeys: true, action: { type: 'trigger-event', target: hotkeyTarget(widget.wmId), focusOverlay: true } }]
}

// Runs inside the guide page.
export const READ_GUIDE_JS = `Array.from(document.querySelectorAll('.complete')).filter((el) => el.closest('h1')).map((el) => {
  const h = el.closest('h1');
  const copy = h.cloneNode(true);
  copy.querySelector('.complete').remove();
  return {
    n: Number(el.dataset.challenge),
    name: copy.textContent.trim().replace(/^\\d+\\s+/, ''),
    anchor: h.id,
    done: el.dataset.complete === 'yes'
  };
})`

// Runs inside the game's profile page.
export const READ_PROFILE_JS = `({
  rows: Array.from(document.querySelectorAll('.achievement')).map((a) => {
    const name = a.querySelector('h2:not(.completion-detail)');
    const count = /(\\d+)\\s*\\/\\s*(\\d+)/.exec(a.querySelector('.completion-detail')?.textContent ?? '');
    return {
      name: name ? name.textContent.trim() : '',
      have: count ? Number(count[1]) : null,
      need: count ? Number(count[2]) : null,
      done: !a.classList.contains('incomplete')
    };
  }),
  notFound: /Resource Not Found/.test(document.body.innerText)
})`

// `attempts` is how many reads came back empty: the page can still be loading
// or passing its bot check at first, and a private profile never shows rows.
export function readProfile (page: ProfilePage, attempts: number): ProfileRead {
  if (page.rows.length) return 'ok'
  if (page.notFound) return 'not-found'
  // A bot check can take a while, so give it most of the 20 reads.
  return attempts >= 15 ? 'private' : 'waiting'
}

// The site's own tick buttons, so its counts and storage stay right.
export function toggleTickJs (n: number): string {
  return `document.querySelector('.complete[data-challenge="${Number(n)}"]')?.click()`
}

// Ticks only: the site's button toggles, so a challenge already ticked there
// (the read may be a moment old) is left alone.
export function tickJs (n: number): string {
  return `(() => { const el = document.querySelector('.complete[data-challenge="${Number(n)}"]'); if (el && el.dataset.complete !== 'yes') el.click() })()`
}

export function scrollToJs (anchor: string): string {
  return `(() => {
    const el = document.getElementById(${JSON.stringify(anchor)});
    if (!el) return false;
    el.scrollIntoView();
    window.scrollBy(0, -8);
    return true;
  })()`
}

// Fits the guide to the panel: our list replaces its side list, and the site's
// phone layout (very large text below 768px) stays off in a narrow panel.
export function guideSkinCss (background: string): string {
  return `
    html, body { background: ${background} !important; }
    #navigation, #toggle, #togglecomplete, #footer, #disclaimer { display: none !important; }
    #contents { max-width: none !important; padding: 4px 16px 0 !important; }
    @media screen and (max-width: 768px) {
      html { max-width: none !important; padding: 0 !important; }
      p { font-size: inherit !important; }
    }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, .22); border-radius: 4px; }
  `
}

// Spelling differences in punctuation and case don't count.
function nameKey (name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function mergeProgress (guide: GuideRow[], profile: ProfileRow[] | null): { rows: ChallengeRow[], toTick: number[], matched: number } {
  const byName = new Map((profile ?? []).map(p => [nameKey(p.name), p]))
  const toTick: number[] = []
  let matched = 0
  const rows = guide.map((g): ChallengeRow => {
    const p = byName.get(nameKey(g.name))
    if (!p) return { ...g, have: null, need: null }
    matched++
    // Only ever adds ticks: a manual tick the game disagrees with stays. The
    // row shows the site's own state, so an untick after the sync shows.
    if (p.done && !g.done) toTick.push(g.n)
    return { ...g, have: p.have, need: p.need }
  })
  return { rows, toTick, matched }
}

export function summarize (rows: GuideRow[]): ChallengeSummary {
  const open = rows.filter(r => !r.done)
  return {
    done: rows.length - open.length,
    total: rows.length,
    next: open.slice(0, 3).map(r => ({ n: r.n, name: r.name }))
  }
}

export function matchesFilter (row: GuideRow, filter: string): boolean {
  const q = filter.trim().toLowerCase()
  return !q || `${row.n} ${row.name}`.toLowerCase().includes(q)
}
