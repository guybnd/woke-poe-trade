// Farming session files and the maps CSV (main/src/woke/session-store.ts).
import { describe, it, expect, beforeAll, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { sessionHandlers } from '../../main/src/woke/session-store'

const dir = () => path.join(process.env.WOKE_FAKE_USER_DATA!, 'woke-sessions')
const session = (league: string) => ({ id: 's1', league, startedAt: 1 })

describe('session store', () => {
  beforeAll(async () => {
    process.env.WOKE_FAKE_USER_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-sessions-'))
    await sessionHandlers['sessions-save']({ session: session('Allflame') })
  })

  it('keeps a session whose new league file could not be written', async () => {
    const spy = vi.spyOn(fs.promises, 'writeFile').mockRejectedValueOnce(new Error('ENOSPC: no space left on device'))
    await expect(sessionHandlers['sessions-save']({ session: session('Standard') })).rejects.toThrow('ENOSPC')
    spy.mockRestore()
    expect(fs.existsSync(path.join(dir(), 'Allflame', 's1.json'))).toBe(true)
  })

  it('moves a session to its new league', async () => {
    await sessionHandlers['sessions-save']({ session: session('Standard') })
    expect(fs.existsSync(path.join(dir(), 'Allflame', 's1.json'))).toBe(false)
    expect(fs.existsSync(path.join(dir(), 'Standard', 's1.json'))).toBe(true)
  })

  it('writes the maps CSV with a byte order mark so Excel reads accents', async () => {
    const file = await sessionHandlers['sessions-export']({ rows: [{ map: 'Maelström', drops: '1x Doppelgänger Guise' }] }) as string
    const text = fs.readFileSync(file, 'utf8')
    expect(text.charCodeAt(0)).toBe(0xFEFF)
    expect(text.slice(1).split('\r\n')).toEqual(['map,drops', 'Maelström,1x Doppelgänger Guise'])
  })
})

describe('deck session store', () => {
  it('keeps Stacked Deck sessions in their own folder, apart from the farming sessions', async () => {
    const deck = { id: 'd1', league: 'Allflame', decks: 2, draws: ['Rain of Chaos', 'The Doctor'] }
    await sessionHandlers['deck-sessions-save']({ session: deck })
    const decksDir = path.join(process.env.WOKE_FAKE_USER_DATA!, 'woke-deck-sessions')
    expect(fs.existsSync(path.join(decksDir, 'Allflame', 'd1.json'))).toBe(true)
    expect(await sessionHandlers['deck-sessions-list']({})).toEqual([deck])
    expect((await sessionHandlers['sessions-list']({}) as Array<{ id: string }>).map(s => s.id)).not.toContain('d1')
    await sessionHandlers['deck-sessions-delete']({ id: 'd1' })
    expect(fs.existsSync(path.join(decksDir, 'Allflame', 'd1.json'))).toBe(false)
    expect(await sessionHandlers['deck-sessions-list']({})).toEqual([])
  })
})
