// Features that replaced a duplicate: the old data is carried over once.
import { describe, it, expect, vi } from 'vitest'
import { moveStashSearchToLibrary } from '@/web/woke/regex-library/apt-import'
import { parseImport } from '@/web/woke/regex-library/widget'

describe('Stash search strings move into the Regex library', () => {
  it('moves changed strings, skips untouched starters and duplicates, drops the widgets', () => {
    const widgets: Array<Record<string, unknown> & { wmId: number, wmType: string }> = [
      { wmId: 1, wmType: 'settings' },
      {
        wmId: 2,
        wmType: 'stash-search',
        wmTitle: 'Map rolling',
        entries: [
          { id: 1, name: '', text: 'Reflect', hotkey: null },
          { id: 2, name: 'Bad mods', text: '"!eflec|regen"', hotkey: 'Ctrl + 1' },
          { id: 3, name: '', text: 'Fossil', hotkey: 'F5' }
        ]
      },
      {
        wmId: 3,
        wmType: 'woke-regex-library',
        entries: [{ id: 7, name: 'Mine', text: '"!eflec|regen"', category: 'Maps', tags: [], notes: '', hotkey: null }]
      },
      { wmId: 4, wmType: 'stash-search', wmTitle: '', entries: [{ id: 1, name: '', text: 'abyss', hotkey: null }] }
    ]
    expect(moveStashSearchToLibrary(widgets)).toBe(2)
    expect(widgets.map(w => w.wmType)).toEqual(['settings', 'woke-regex-library'])
    const lib = widgets[1].entries as Array<{ id: number, text: string, category: string, hotkey: string | null }>
    expect(lib.map(e => e.text)).toEqual(['"!eflec|regen"', 'Fossil', 'abyss'])
    expect(lib[1]).toMatchObject({ id: 8, category: 'Map rolling', hotkey: 'F5' })
    expect(lib[2]).toMatchObject({ id: 9, category: 'Stash search' })
  })

  it('makes a library when there is none and leaves configs without stash search alone', () => {
    const widgets: Array<Record<string, unknown> & { wmId: number, wmType: string }> = [
      { wmId: 5, wmType: 'stash-search', wmTitle: 'Dump', entries: [{ id: 1, name: 'Six-link', text: '"Sockets: \\S-\\S-\\S-\\S-\\S-\\S"', hotkey: null }] }
    ]
    expect(moveStashSearchToLibrary(widgets)).toBe(1)
    expect(widgets).toHaveLength(1)
    expect(widgets[0]).toMatchObject({ wmType: 'woke-regex-library', wmId: 6 })
    const none = [{ wmId: 1, wmType: 'settings' }]
    expect(moveStashSearchToLibrary(none)).toBe(0)
  })
})

describe('one Client.txt stream for every module', () => {
  it('replays the start-up tail after `since`, then live lines held meanwhile', async () => {
    vi.resetModules()
    let emit: (e: { lines: string[] }) => void = () => {}
    let listeners = 0
    vi.doMock('@/web/background/IPC', () => ({
      Host: {
        onEvent: (name: string, cb: typeof emit) => {
          if (name === 'MAIN->CLIENT::game-log') { listeners++; emit = cb }
          return { abort () {} }
        }
      }
    }))
    let release: (t: { path: string, lines: string[] }) => void = () => {}
    vi.doMock('@/web/woke/campaign/log-tail', async (orig) => ({
      ...(await orig<object>()),
      logTail: () => new Promise(resolve => { release = resolve })
    }))
    const { followGameLog, onGameLog } = await import('@/web/woke/shared/game-log')

    const got: Array<[string, boolean]> = []
    const since = new Date(2026, 10, 4, 12, 0, 0).getTime()
    followGameLog({ since: () => since, onLines: (lines, live) => { for (const l of lines) got.push([l.ev?.kind ?? 'other', live]) } })
    const alsoLive: string[] = []
    onGameLog(lines => { for (const l of lines) alsoLive.push(l.line) })
    expect(listeners).toBe(1)

    emit({ lines: ['2026/11/04 12:05:00 1 2 [INFO Client 1] : You have entered Lioneye\'s Watch.'] })
    expect(got).toEqual([])
    release({
      path: 'Client.txt',
      lines: [
        '2026/11/04 11:59:00 1 2 [DEBUG Client 1] Generating level 1 area "1_1_1" with seed 1',
        '2026/11/04 12:01:00 1 2 [DEBUG Client 1] Generating level 2 area "1_1_town" with seed 2'
      ]
    })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(got).toEqual([['area', false], ['zone', true]])
    expect(alsoLive).toHaveLength(1)
    vi.doUnmock('@/web/background/IPC')
    vi.doUnmock('@/web/woke/campaign/log-tail')
  })
})

describe('one icon per module', () => {
  it('every module has an icon, and the tab bar uses it', async () => {
    const { MODULES } = await import('@/web/woke/modules')
    const { iconFor } = await import('@/web/woke/tab-bar/tools')
    for (const m of MODULES) {
      expect(m.icon.fa, m.id).toMatch(/^fa[srb] fa-/)
      for (const t of m.widgetTypes) expect(`fas ${iconFor(t)}`).toBe(m.icon.fa)
    }
  })
})

describe('regex library import', () => {
  it('takes a plain search string that starts with a bracket', () => {
    const added = parseImport(['[89]0%', '{ok}'].join('\n'), [])
    expect(added.map(e => e.text)).toEqual(['[89]0%', '{ok}'])
  })

  it('still reads a JSON export', () => {
    expect(parseImport('[{"name":"a","text":"b"}]', []).map(e => e.text)).toEqual(['b'])
    expect(parseImport('{"entries":[{"text":"c"}]}', []).map(e => e.text)).toEqual(['c'])
    expect(parseImport('[ ]', [])).toEqual([])
  })
})
