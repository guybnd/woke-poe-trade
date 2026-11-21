// ipc/issue-report.ts: the GitHub issue link for "Report an issue" and crash
// reports. Scrubbed, encoded, and short enough for GitHub.
import { describe, it, expect } from 'vitest'
import { buildIssue, scrubText, ISSUES_URL, URL_LIMIT, CLIPBOARD_NOTE } from '../../ipc/issue-report'

const names = { home: 'C:\\Users\\Guy-Desktop', user: 'Guy-Desktop', names: ['SomeAccount', 'SomeAccount#1234', 'Zappy_Witch'] }

const params = (url: string) => new URL(url).searchParams

describe('scrubText', () => {
  it('hides account and character names as whole words', () => {
    expect(scrubText('trade with SomeAccount#1234 for Zappy_Witch', names)).toBe('trade with <name> for <name>')
    expect(scrubText('SomeAccountant and Zappy_Witches stay', names)).toBe('SomeAccountant and Zappy_Witches stay')
  })
  it('hides POESESSID and user folders', () => {
    expect(scrubText('POESESSID=0123456789abcdef0123456789abcdef', names)).toBe('POESESSID=<hidden>')
    expect(scrubText('C:\\Users\\Guy-Desktop\\Documents\\My Games', names)).toBe('~\\Documents\\My Games')
  })
  it('ignores names too short to hide safely', () => {
    expect(scrubText('an ox', { names: ['ox', ' '] })).toBe('an ox')
  })
})

describe('buildIssue', () => {
  it('builds a github new-issue link with title, body and label', () => {
    const issue = buildIssue({ kind: 'idea', title: 'Show map tier', text: 'In the dock & elsewhere?', info: ['Version: 1.330.0'] }, names)
    expect(issue.url.startsWith(`${ISSUES_URL}?`)).toBe(true)
    const p = params(issue.url)
    expect(p.get('title')).toBe('Show map tier')
    expect(p.get('labels')).toBe('enhancement')
    expect(p.get('body')).toBe(issue.body)
    expect(issue.body).toContain('In the dock & elsewhere?')
    expect(issue.body).toContain('- Version: 1.330.0')
    // & ? # are escaped, so the body isn't cut at them.
    expect(issue.url).not.toMatch(/elsewhere\?/)
    expect(issue.clipboard).toBeNull()
  })

  it('labels bugs and crashes, and fills an empty title', () => {
    expect(buildIssue({ kind: 'bug', title: '  ' }).labels).toBe('bug')
    expect(buildIssue({ kind: 'bug', title: '' }).title).toBe('Problem report')
    expect(buildIssue({ kind: 'crash', title: 'x' }).labels).toBe('crash')
  })

  it('scrubs everything attached, title included', () => {
    const issue = buildIssue({
      kind: 'bug',
      title: 'ENOENT C:\\Users\\Guy-Desktop\\a',
      text: 'I am Zappy_Witch',
      info: ['League: x', 'by Guy-Desktop'],
      error: 'at C:\\Users\\Guy-Desktop\\b',
      overlayErrors: 'POESESSID: 0123456789abcdef0123',
      log: 'whisper from SomeAccount#1234'
    }, names)
    const all = decodeURIComponent(issue.url.replace(/\+/g, ' '))
    expect(all).not.toMatch(/guy-desktop|zappy|someaccount|0123456789abcdef/i)
    expect(issue.title).toBe('ENOENT ~\\a')
  })

  it('keeps a code block from being closed early by the log', () => {
    const issue = buildIssue({ kind: 'bug', title: 't', log: 'a\n```\nb' })
    expect(issue.body.match(/```/g)).toHaveLength(2)
  })

  it('keeps the whole log when it fits', () => {
    const log = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n')
    const issue = buildIssue({ kind: 'bug', title: 't', log })
    expect(issue.logLinesShown).toBe(20)
    expect(issue.clipboard).toBeNull()
    expect(issue.body).not.toContain(CLIPBOARD_NOTE)
  })

  it('cuts a long log to its last lines and puts the whole log on the clipboard', () => {
    const log = Array.from({ length: 2000 }, (_, i) => `[12:00:00] info line ${i} C:\\Users\\Guy-Desktop\\x`).join('\n')
    const issue = buildIssue({ kind: 'bug', title: 'Long', text: 'help', log }, names)
    expect(issue.url.length).toBeLessThanOrEqual(URL_LIMIT)
    expect(issue.logLines).toBe(2000)
    expect(issue.logLinesShown).toBeGreaterThan(0)
    expect(issue.logLinesShown).toBeLessThan(2000)
    expect(issue.body).toContain(CLIPBOARD_NOTE)
    expect(issue.body).toContain('line 1999')
    expect(issue.body).not.toContain('info line 0 ')
    expect(issue.body).toContain(`last ${issue.logLinesShown} of 2000 lines`)
    // The clipboard log is complete and scrubbed too.
    expect(issue.clipboard!.split('\n')).toHaveLength(2000)
    expect(issue.clipboard).not.toMatch(/guy-desktop/i)
    // The link still decodes: never cut inside a %XX escape.
    expect(() => decodeURIComponent(issue.url)).not.toThrow()
  })

  it('cuts very long text last, and keeps the link valid', () => {
    const text = 'ä\\'.repeat(5000)
    const issue = buildIssue({ kind: 'bug', title: 't', text })
    expect(issue.url.length).toBeLessThanOrEqual(URL_LIMIT)
    expect(issue.body).toContain('(cut short: too long for a link)')
    expect(() => decodeURIComponent(issue.url)).not.toThrow()
  })

  it('cuts long error texts when nothing else is left', () => {
    const issue = buildIssue({ kind: 'crash', title: 't', error: '\\'.repeat(2500), overlayErrors: '\\'.repeat(1500) })
    expect(issue.url.length).toBeLessThanOrEqual(URL_LIMIT)
  })
})
