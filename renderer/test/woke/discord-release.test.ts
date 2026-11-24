// The Discord release post (scripts/discord-release.mjs): notes without the
// GitHub-only lines, within Discord's limits, and no surprise pings.
import { describe, it, expect } from 'vitest'
import { buildPayload, cleanNotes, fitDescription } from '../../../scripts/discord-release.mjs'

const body = [
  '**Install:** download the `Woke-PoE-Trade-Setup-….exe` below and run it.',
  '## New',
  '**Net worth**\n- A Listed tab.',
  '## Fixes\n- Map history: unique maps show their item.',
  '[All features](https://example.com)',
  'Windows SmartScreen may warn on first run because the app is not code-signed: click **More info > Run anyway**.'
].join('\n\n')

const release = {
  tag_name: 'v1.330.19',
  html_url: 'https://github.com/guybnd/woke-poe-trade/releases/tag/v1.330.19',
  published_at: '2026-11-24T10:00:00Z',
  body,
  assets: [
    { name: 'Woke-PoE-Trade-Setup-1.330.19.exe', browser_download_url: 'https://x/setup.exe' },
    { name: 'Woke-PoE-Trade-Setup-1.330.19.exe.blockmap', browser_download_url: 'https://x/blockmap' },
    { name: 'Woke-PoE-Trade-1.330.19-portable.exe', browser_download_url: 'https://x/portable.exe' }
  ]
}

describe('cleanNotes', () => {
  it('drops the install how-to and SmartScreen line, and bolds headings', () => {
    const t = cleanNotes(body)
    expect(t.startsWith('__**New**__')).toBe(true)
    expect(t).toContain('__**Fixes**__')
    expect(t).toContain('[All features](https://example.com)')
    expect(t).not.toContain('Install:')
    expect(t).not.toContain('SmartScreen')
  })
})

describe('fitDescription', () => {
  it('cuts long notes at a line with a link to the rest', () => {
    const t = fitDescription('- a line of notes\n'.repeat(400), 'https://u')
    expect(t.length).toBeLessThanOrEqual(4096)
    expect(t).toMatch(/- a line of notes\n\n…and more in the \[full notes\]\(https:\/\/u\)\.$/)
  })
  it('keeps short notes as they are', () => {
    expect(fitDescription('short', 'https://u')).toBe('short')
  })
})

describe('buildPayload', () => {
  it('names the version and links the installer, portable and release page', () => {
    const p = buildPayload(release, { repo: 'guybnd/woke-poe-trade' })
    const e = p.embeds[0]
    expect(e.title).toBe('Woke PoE Trade 1.330.19 is out')
    expect(e.url).toBe(release.html_url)
    expect(e.fields[0].value).toContain('(https://x/setup.exe)')
    expect(e.fields[0].value).toContain('(https://x/portable.exe)')
    expect(e.fields[0].value).not.toContain('blockmap')
    expect(p.allowed_mentions).toEqual({ parse: [] })
    expect(p.content).toBeUndefined()
  })
  it('pings only what the ping names', () => {
    expect(buildPayload(release, { repo: 'r', ping: '<@&42>' }).allowed_mentions).toEqual({ parse: [], roles: ['42'], users: [] })
    expect(buildPayload(release, { repo: 'r', ping: '@everyone' }).allowed_mentions.parse).toEqual(['everyone'])
  })
})
