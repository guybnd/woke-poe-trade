// Moving a whole folder of builds (main/src/woke/pob-builds.ts moveBuildFolder).
import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { moveBuildFolder, recoverFolderMoves } from '../../main/src/woke/pob-builds'

function folder (files: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-pobf-'))
  for (const f of files) {
    fs.mkdirSync(path.join(dir, path.dirname(f)), { recursive: true })
    fs.writeFileSync(path.join(dir, f), '<PathOfBuilding/>')
  }
  return dir
}

describe('moveBuildFolder', () => {
  it('renames and moves a folder with its builds', async () => {
    const dir = folder(['A/x.xml', 'A/B/y.xml'])
    await moveBuildFolder({ dir, from: 'A', to: 'Z/A2' })
    expect(fs.existsSync(path.join(dir, 'Z/A2/x.xml'))).toBe(true)
    expect(fs.existsSync(path.join(dir, 'Z/A2/B/y.xml'))).toBe(true)
    expect(fs.existsSync(path.join(dir, 'A'))).toBe(false)
  })

  it('never goes inside itself, over a folder that exists, or outside the builds folder', async () => {
    const dir = folder(['A/x.xml', 'C/z.xml'])
    await expect(moveBuildFolder({ dir, from: 'A', to: 'A/In' })).rejects.toThrow(/inside itself/)
    await expect(moveBuildFolder({ dir, from: 'A', to: 'C' })).rejects.toThrow(/already a folder/)
    expect(fs.existsSync(path.join(dir, 'A/x.xml'))).toBe(true)
    // Dots in a name are dropped: it stays in the builds folder.
    await moveBuildFolder({ dir, from: 'A', to: '../out' })
    expect(fs.existsSync(path.join(dir, 'out/x.xml'))).toBe(true)
  })

  it('says where it went as the disk names it', async () => {
    const dir = folder(['A/x.xml'])
    expect(await moveBuildFolder({ dir, from: 'A', to: 'Act 1: Lev' })).toEqual({ to: 'Act 1 Lev' })
    expect(fs.existsSync(path.join(dir, 'Act 1 Lev/x.xml'))).toBe(true)
  })

  it('changes only the letter case', async () => {
    const dir = folder(['Box/x.xml'])
    await moveBuildFolder({ dir, from: 'Box', to: 'box' })
    expect(fs.readdirSync(dir)).toContain('box')
    expect(fs.existsSync(path.join(dir, 'box/x.xml'))).toBe(true)
  })

  it('refuses to put builds deeper than the list reads', async () => {
    const dir = folder(['A/B/x.xml'])
    await expect(moveBuildFolder({ dir, from: 'A', to: 'X/Y/Z/A' })).rejects.toThrow(/too deep/)
  })

  it('has nothing to move for a folder that is only in the list', async () => {
    const dir = folder(['A/x.xml'])
    expect(await moveBuildFolder({ dir, from: 'Empty', to: 'Full' })).toEqual({ to: 'Full' })
  })
})

describe('a folder move stopped half way', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('a failed case-only rename puts the folder back under its name', async () => {
    // A case-only rename is a Windows thing (samePath reads the platform).
    const platform = Object.getOwnPropertyDescriptor(process, 'platform')!
    Object.defineProperty(process, 'platform', { value: 'win32' })
    onTestFinished(() => { Object.defineProperty(process, 'platform', platform) })
    const dir = folder(['Lev/x.xml'])
    const rename = fs.promises.rename
    let calls = 0
    vi.spyOn(fs.promises, 'rename').mockImplementation(async (a, b) => {
      if (++calls === 2) throw new Error('disk busy')
      return rename(a, b)
    })
    await expect(moveBuildFolder({ dir, from: 'Lev', to: 'LEV' })).rejects.toThrow(/disk busy/)
    expect(fs.readdirSync(dir)).toEqual(['Lev'])
    expect(fs.existsSync(path.join(dir, 'Lev/x.xml'))).toBe(true)
  })

  it('a leftover in-between folder goes back to its name on start', async () => {
    const dir = folder(['Lev.woke-move-1700000000000/x.xml', 'Acts/Mid.woke-move-1700000000001/y.xml', 'Plain/z.xml'])
    const back = await recoverFolderMoves(dir)
    expect(back.sort()).toEqual([path.join(dir, 'Acts/Mid'), path.join(dir, 'Lev')].sort())
    expect(fs.existsSync(path.join(dir, 'Lev/x.xml'))).toBe(true)
    expect(fs.existsSync(path.join(dir, 'Acts/Mid/y.xml'))).toBe(true)
    expect(fs.existsSync(path.join(dir, 'Plain/z.xml'))).toBe(true)
  })

  it('leaves the leftover alone, and logs, when its name is taken', async () => {
    const dir = folder(['Lev/a.xml', 'Lev.woke-move-1700000000000/x.xml'])
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await recoverFolderMoves(dir)).toEqual([])
    expect(fs.existsSync(path.join(dir, 'Lev.woke-move-1700000000000/x.xml'))).toBe(true)
    expect(fs.existsSync(path.join(dir, 'Lev/a.xml'))).toBe(true)
    expect(warn).toHaveBeenCalledOnce()
  })

  it('never touches folders that only look alike', async () => {
    const dir = folder(['Lev.woke-move-soon/x.xml', '.woke-move-1/y.xml'])
    expect(await recoverFolderMoves(dir)).toEqual([])
    expect(fs.readdirSync(dir).sort()).toEqual(['.woke-move-1', 'Lev.woke-move-soon'])
  })
})
