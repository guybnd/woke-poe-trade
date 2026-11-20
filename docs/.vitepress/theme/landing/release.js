// The line under the header: the latest release, its date and a few of its
// headlines, read from GitHub when the page loads so it never goes stale. If
// GitHub doesn't answer, the page leaves the line out.

export const LATEST = 'https://api.github.com/repos/guybnd/woke-poe-trade/releases/latest'

// Markdown to plain text: **bold**, `code`, [text](url).
const plain = (s) => s
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/\*\*|__|`/g, '')
  .trim()

/**
 * Up to `count` headlines from the notes' "## New" section: its bullet lines,
 * short ones first in their own order (a long one doesn't fit on the line),
 * leaving out fixes.
 * @param {string} body
 * @param {number} count
 */
export function headlines (body, count = 3, max = 80) {
  const lines = (body ?? '').replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex(l => /^##\s+New\b/i.test(l))
  const bullets = []
  for (const l of lines.slice(start + 1)) {
    if (start < 0) break
    if (/^##\s/.test(l)) break
    const m = /^\s*[-*]\s+(.+)$/.exec(l)
    if (!m) continue
    const text = plain(m[1])
    if (!text || /^fixed\b/i.test(text)) continue
    bullets.push(text)
  }
  const short = bullets.filter(b => b.length <= max)
  return (short.length >= count ? short : bullets).slice(0, count)
}

/**
 * GitHub's latest release, as the page shows it; null when it can't.
 * @param {{ tag_name?: string, name?: string, published_at?: string, html_url?: string, body?: string }} json
 */
export function releaseLine (json) {
  const version = (json?.tag_name ?? '').replace(/^v/, '')
  if (!/^\d+\.\d+\.\d+$/.test(version)) return null
  const at = json.published_at ? new Date(json.published_at) : null
  const date = at && !isNaN(at.getTime())
    ? at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    : ''
  return { version, date, url: json.html_url ?? '', lines: headlines(json.body ?? '') }
}
