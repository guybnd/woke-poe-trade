import { describe, expect, it } from 'vitest'
import { admit, handleBody, type ToolDef } from '../../../main/src/woke/claude-link/rpc'
import { makeSuggestion, trimList, MAX_SUGGESTIONS } from '../../../main/src/woke/claude-link/suggestions'
import { buildTools, treeOut, type LinkDeps } from '../../../main/src/woke/claude-link/tools'
import { listSettings, settingAllowed } from '@ipc/claude-link'
import type { ClaudeSuggestion } from '@ipc/claude-link'
import { claudeCodeCommand, claudeDesktopJson } from '@/web/woke/claude-link/setup-text'

const info = { version: '1.330.0', instructions: 'test' }
const echo: ToolDef = { name: 'echo', description: 'd', inputSchema: { type: 'object' }, readOnly: true, run: async (a) => a }
const boom: ToolDef = { name: 'boom', description: 'd', inputSchema: { type: 'object' }, readOnly: true, run: async () => { throw new Error('no data') } }

describe('claude link rpc', () => {
  it('initializes with a protocol it knows', async () => {
    const r = await handleBody(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } }), [echo], info) as any
    expect(r.result.protocolVersion).toBe('2025-03-26')
    expect(r.result.capabilities.tools).toBeTruthy()
    const old = await handleBody(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } }), [echo], info) as any
    expect(old.result.protocolVersion).toBe('2025-06-18')
  })

  it('lists and calls tools; a tool error is a result', async () => {
    const list = await handleBody(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }), [echo], info) as any
    expect(list.result.tools[0]).toMatchObject({ name: 'echo', annotations: { readOnlyHint: true } })
    const call = await handleBody(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'echo', arguments: { a: 1 } } }), [echo], info) as any
    expect(JSON.parse(call.result.content[0].text)).toEqual({ a: 1 })
    const bad = await handleBody(JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'boom' } }), [boom], info) as any
    expect(bad.result).toMatchObject({ isError: true, content: [{ text: 'no data' }] })
    const unknown = await handleBody(JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nope' } }), [echo], info) as any
    expect(unknown.error.code).toBe(-32602)
  })

  it('sends nothing back for notifications and answers batches', async () => {
    expect(await handleBody(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }), [echo], info)).toBeNull()
    const batch = await handleBody(JSON.stringify([{ jsonrpc: '2.0', id: 1, method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/initialized' }]), [echo], info) as any[]
    expect(batch).toHaveLength(1)
    expect((await handleBody('{', [echo], info) as any).error.code).toBe(-32700)
  })

  it('admits only the key, on its own address, without a browser origin', () => {
    const h = { host: '127.0.0.1:8586', authorization: 'Bearer secret-key-1234567890' }
    expect(admit(h, 'secret-key-1234567890', 8586).ok).toBe(true)
    expect(admit({ ...h, authorization: 'Bearer wrong' }, 'secret-key-1234567890', 8586).ok).toBe(false)
    expect(admit({ ...h, host: 'evil.com:8586' }, 'secret-key-1234567890', 8586).ok).toBe(false)
    expect(admit({ ...h, origin: 'https://evil.com' }, 'secret-key-1234567890', 8586).ok).toBe(false)
    expect(admit(h, '', 8586).ok).toBe(false)
  })
})

describe('claude link suggestions', () => {
  const noCheck = () => null
  it('keeps a trade search with its query', () => {
    const s = makeSuggestion('trade-search', { title: ' Hubris ', query: { query: { name: 'x' }, sort: { price: 'asc' } } }, 'a', 1, noCheck)
    expect(s).toMatchObject({ title: 'Hubris', status: 'new', query: { query: { name: 'x' } } })
    expect(() => makeSuggestion('trade-search', { title: 't', query: { name: 'x' } }, 'a', 1, noCheck)).toThrow(/query/)
  })

  it('checks filter edits and settings', () => {
    const e = makeSuggestion('filter-change', { title: 't', edit: { kind: 'visibility', type: 'currency', tier: 't5', visibility: 'Hide', id: 9 } }, 'a', 1, noCheck)
    expect(e.edit).not.toHaveProperty('id')
    expect(() => makeSuggestion('filter-change', { title: 't', edit: { kind: 'rm -rf', type: 'x' } }, 'a', 1, noCheck)).toThrow()
    expect(() => makeSuggestion('setting', { title: 't', key: 'a.b', value: 1 }, 'a', 1, () => 'locked')).toThrow('locked')
  })

  it('drops old answered rows first, never open ones', () => {
    const row = (i: number, status: ClaudeSuggestion['status']): ClaudeSuggestion => ({ id: String(i), kind: 'setting', title: '', why: '', createdAt: i, status, resolvedAt: null })
    const list = [row(0, 'new'), ...Array.from({ length: MAX_SUGGESTIONS }, (_, i) => row(i + 1, 'applied'))]
    const out = trimList(list)
    expect(out).toHaveLength(MAX_SUGGESTIONS)
    expect(out[0].id).toBe('0')
    expect(out.find(s => s.id === '1')).toBeUndefined()
  })
})

describe('claude link settings', () => {
  it('allows plain values of the same type, never hotkeys, folders or ids', () => {
    expect(settingAllowed('app.fontSize', 16, 18)).toBe(true)
    expect(settingAllowed('app.fontSize', 16, '18')).toBe(false)
    expect(settingAllowed('app.fontSize', 16, 5000)).toBe(false)
    expect(settingAllowed('app.gameConfig', 'C:/a.ini', 'D:/b.ini')).toBe(false)
    expect(settingAllowed('app.overlayBackground', 'rgba(0,0,0,0)', 'url(x)')).toBe(false)
    expect(settingAllowed('price-check.showSeller', false, true)).toBe(true)
    expect(settingAllowed('app.overlayKey', 'Shift + Space', 'X')).toBe(false)
    expect(settingAllowed('woke-pob-builds.buildsDir', '', 'C:/')).toBe(false)
    expect(settingAllowed('price-check.wmId', 1, 2)).toBe(false)
    expect(settingAllowed('price-check.hotkey', 'D', 'E')).toBe(false)
    expect(settingAllowed('app.widgets', [], [])).toBe(false)
  })

  it('lists the first widget of each type', () => {
    const all = listSettings({ fontSize: 16, accountName: 'me', widgets: [{ wmId: 1, wmType: 'price-check', showSeller: true, hotkey: 'D' }, { wmId: 2, wmType: 'price-check', showSeller: false }] })
    expect(all).toEqual({ 'app.fontSize': 16, 'price-check.showSeller': true })
    expect(listSettings({ gameConfig: 'C:/x.ini', widgets: [] })).toEqual({})
  })
})

describe('claude link tools', () => {
  const deps = (over: Partial<LinkDeps> = {}): LinkDeps => ({
    appVersion: '1',
    config: async () => ({ leagueId: 'Keepers', widgets: [{ wmType: 'woke-trade-searches', entries: [{ name: 'Hubris', url: 'u', category: 'Gear', tags: ['es'], notes: '' }] }] }),
    op: async () => null,
    dailyHistory: async () => [{ date: '2026-11-14', chaos: 199 }],
    lastItem: () => ({ text: 'Rarity: Unique\nMageblood', at: 1 }),
    passiveTree: async () => null,
    askOverlay: async () => null,
    stashCache: async () => null,
    character: async () => null,
    suggestions: { list: async () => [], add: async () => { throw new Error('x') } },
    ...over
  })
  const run = async (d: LinkDeps, name: string, args: Record<string, unknown> = {}) => await buildTools(d).find(t => t.name === name)!.run(args) as any

  it('reads saved searches from the config', async () => {
    expect((await run(deps(), 'saved_searches', { search: 'gear' })).searches[0]).toMatchObject({ name: 'Hubris', folder: 'Gear' })
  })

  it('gives the last item text', async () => {
    expect((await run(deps(), 'last_item')).item.text).toContain('Mageblood')
  })

  it('finds prices by name, exact name first', async () => {
    const op = async () => [{ ts: 1, divine: 200, items: [{ type: 'Currency', name: 'Divine Orb', variant: '', chaos: 200 }, { type: 'Currency', name: 'Divine Vessel', variant: '', chaos: 2 }] }]
    const r = await run(deps({ op }), 'prices', { name: 'divine orb' })
    expect(r.matches[0]).toMatchObject({ name: 'Divine Orb', chaos: 200, divine: 1 })
    expect(r.historyOfFirst).toEqual([{ date: '2026-11-14', chaos: 199 }])
  })

  it('names a character jewel by its slot, not its index', async () => {
    const nodes = new Map([[26725, { kind: 'jewel', name: 'Jewel Socket A', stats: [] }]])
    const character = async () => ({ version: 1, character: { name: 'C' }, tree: { nodes: [26725], jewels: [{ x: 0, item: { rarity: 'RARE', name: 'J', base: 'Cobalt Jewel', sockets: '', implicits: [], mods: [] } }, { x: 9, item: { rarity: 'RARE', name: 'K', base: 'Cobalt Jewel', sockets: '', implicits: [], mods: [] } }] } })
    const tree = (await run(deps({ character, passiveTree: async () => ({ nodes, masteryEffects: {}, jewelSlots: [26725] }) }), 'current_character', { part: 'tree' })).tree
    expect(tree.jewels.map((j: any) => j.socket)).toEqual(['Jewel Socket A', 'jewel slot 9'])
    const named = treeOut({ title: 'T', url: '', isActive: true, nodes: [], jewels: [], sockets: [{ node: 22994, item: { rarity: 'RARE', name: 'J', base: 'Crimson Jewel', sockets: '', implicits: [], mods: [] } }] }, { nodes, masteryEffects: {} }) as any
    expect(named.jewels[0]).toMatchObject({ socket: 'Jewel socket', socketNode: 22994 })
  })

  it('says when there is no character', async () => {
    expect((await run(deps(), 'current_character')).note).toMatch(/No character/)
  })

  it('names tree nodes and picked masteries', () => {
    const nodes = new Map([[1, { kind: 'key', name: 'Iron Reflexes', stats: [] }], [2, { kind: 'notable', name: 'Heart of Oak', stats: [] }], [3, { kind: 'mastery', name: 'Life Mastery', stats: [] }], [4, { kind: 'small', name: '+10 Str', stats: [] }]])
    const out = treeOut({ title: 'T', url: '', isActive: true, nodes: [1, 2, 3, 4, 99], jewels: [], masteries: { 3: 7 } }, { nodes, masteryEffects: { 7: ['+50 to maximum Life'] } }) as any
    expect(out).toMatchObject({ keystones: ['Iron Reflexes'], notables: ['Heart of Oak'], masteries: ['Life Mastery: +50 to maximum Life'], smallPassives: 1, points: 5 })
  })
})

describe('claude link filter edits', () => {
  it('keeps only the fields of the kind', async () => {
    const { cleanEdit } = await import('@/web/woke/claude-link/clean-edit')
    expect(cleanEdit({ kind: 'visibility', type: 'currency', tier: 't5', visibility: 'Hide', junk: 'x' })).toEqual({ kind: 'visibility', type: 'currency', tier: 't5', visibility: 'Hide' })
  })
})

describe('claude link setup text', () => {
  it('puts the key in the Claude Code header and the Desktop env', () => {
    expect(claudeCodeCommand('http://127.0.0.1:8586/mcp', 'K')).toContain('--header "Authorization: Bearer K"')
    expect(claudeCodeCommand('http://127.0.0.1:8586/mcp', 'K')).toContain('--scope user')
    const desktop = JSON.parse(claudeDesktopJson('http://127.0.0.1:8586/mcp', 'K'))
    expect(desktop.mcpServers['woke-poe-trade'].env.WOKE_AUTH).toBe('Bearer K')
    expect(desktop.mcpServers['woke-poe-trade'].args).toContain('Authorization:${WOKE_AUTH}')
  })
})
