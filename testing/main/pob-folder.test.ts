// Moving a whole folder of builds (main/src/woke/pob-builds.ts moveBuildFolder).
import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { moveBuildFolder } from '../../main/src/woke/pob-builds'

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
})
