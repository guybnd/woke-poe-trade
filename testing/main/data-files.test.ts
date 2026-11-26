// Keyed documents in the user data folder (main/src/woke/data-files.ts):
// imported league histories and the price check log live here.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { docHandlers, safeName, writeAtomic } from '../../main/src/woke/data-files'

describe('keyed documents', () => {
  beforeEach(() => {
    process.env.WOKE_FAKE_USER_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-docs-'))
  })

  it('puts, gets, lists and deletes', async () => {
    await docHandlers['doc-put']({ collection: 'invest-leagues', key: 'Settlers', value: { league: 'Settlers', n: 1 } })
    await docHandlers['doc-put']({ collection: 'invest-leagues', key: 'Necropolis', value: { league: 'Necropolis', n: 2 } })
    expect(await docHandlers['doc-get']({ collection: 'invest-leagues', key: 'Settlers' })).toEqual({ league: 'Settlers', n: 1 })
    expect(await docHandlers['doc-get']({ collection: 'invest-leagues', key: 'Nope' })).toBeNull()
    expect((await docHandlers['doc-list']({ collection: 'invest-leagues' }) as unknown[]).length).toBe(2)
    await docHandlers['doc-delete']({ collection: 'invest-leagues', key: 'Settlers' })
    expect(await docHandlers['doc-list']({ collection: 'invest-leagues' })).toEqual([{ league: 'Necropolis', n: 2 }])
  })

  it('keeps odd keys inside the folder', async () => {
    await docHandlers['doc-put']({ collection: 'x', key: '../../evil', value: 1 })
    const files = fs.readdirSync(path.join(process.env.WOKE_FAKE_USER_DATA!, 'woke-docs', 'x'))
    expect(files).toEqual(['.._.._evil.json'])
  })

  it('keeps "." and ".." from naming a folder', () => {
    expect(safeName('..')).toBe('_')
    expect(safeName('.')).toBe('_')
    expect(safeName('Settlers')).toBe('Settlers')
  })
})

describe('writeAtomic', () => {
  beforeEach(() => {
    process.env.WOKE_FAKE_USER_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-atomic-'))
  })

  it('tries again when antivirus holds the file for a moment', async () => {
    const file = path.join(process.env.WOKE_FAKE_USER_DATA!, 'a.json')
    const busy = Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' })
    const spy = vi.spyOn(fs.promises, 'rename').mockRejectedValueOnce(busy).mockRejectedValueOnce(busy)
    await writeAtomic(file, '{"ok":1}')
    spy.mockRestore()
    expect(fs.readFileSync(file, 'utf8')).toBe('{"ok":1}')
    expect(fs.existsSync(`${file}.tmp`)).toBe(false)
  })

  it('leaves the old file and no temp file when the rename keeps failing', async () => {
    const file = path.join(process.env.WOKE_FAKE_USER_DATA!, 'b.json')
    await writeAtomic(file, 'old')
    const spy = vi.spyOn(fs.promises, 'rename').mockRejectedValue(Object.assign(new Error('EBUSY'), { code: 'EBUSY' }))
    await expect(writeAtomic(file, 'new')).rejects.toThrow('EBUSY')
    spy.mockRestore()
    expect(fs.readFileSync(file, 'utf8')).toBe('old')
    expect(fs.existsSync(`${file}.tmp`)).toBe(false)
  })
})
