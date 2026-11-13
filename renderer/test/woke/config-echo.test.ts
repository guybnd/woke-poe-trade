// A page drops the echo of its own config save (WOKEPOET-215), unless another
// page's save landed in between.
import { describe, it, expect, vi, beforeAll } from 'vitest'

// Just enough of a browser for Config.ts and what it imports.
vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>
  g.window ??= { innerHeight: 1080, location: { hash: '' }, addEventListener () {} }
  const style: Record<string, unknown> = {}
  g.document ??= {
    createElement: () => ({}),
    addEventListener () {},
    documentElement: { dataset: {}, style: Object.assign(style, { setProperty: (k: string, v: string) => { style[k] = v } }) }
  }
})

type Payload = { contents: string }
const handlers = new Map<string, (payload: Payload) => void>()
const sent: Array<{ name: string, payload: Payload }> = []
vi.mock('@/web/background/IPC', () => ({
  MainProcess: { onEvent () {}, sendEvent () {} },
  Host: {
    isElectron: false,
    onEvent: (name: string, fn: (payload: Payload) => void) => { handlers.set(name, fn) },
    sendEvent: (e: { name: string, payload: Payload }) => { sent.push(e) },
    getConfig: async () => null
  }
}))
vi.mock('@/web/overlay/widget-registry.js', () => ({ registry: { widgets: [] } }))

/* eslint-disable import-x/first */
import { AppConfig, initConfig, saveConfig } from '@/web/Config'

function echo (contents: string) {
  handlers.get('MAIN->CLIENT::config-changed')!({ contents })
}
function save () {
  const before = sent.length
  saveConfig()
  const e = sent.slice(before).find(e => e.name === 'CLIENT->MAIN::save-config')
  return e!.payload.contents
}

beforeAll(async () => {
  await initConfig()
})

describe('config echo', () => {
  it('keeps changes made after a save when its echo comes back', () => {
    AppConfig().fontSize = 17
    const first = save()
    AppConfig().fontSize = 18
    echo(first)
    expect(AppConfig().fontSize).toBe(18)
    expect(document.documentElement.style.fontSize).toBe('18px')
  })

  it("applies our later echo after another page's save", () => {
    AppConfig().fontSize = 19
    const ours = save()
    const theirs = JSON.parse(ours)
    theirs.fontSize = 12
    echo(JSON.stringify(theirs))
    expect(AppConfig().fontSize).toBe(12)
    echo(ours)
    expect(AppConfig().fontSize).toBe(19)
  })

  it('takes a save from another page', () => {
    const other = JSON.parse(JSON.stringify(AppConfig()))
    other.fontSize = 14
    echo(JSON.stringify(other))
    expect(AppConfig().fontSize).toBe(14)
  })
})
