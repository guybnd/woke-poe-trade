// App preferences (main/src/woke/app-prefs.ts): graphics-card drawing is on by
// default from 1.330.10, unless the player chose otherwise.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

const prefsFile = () => path.join(process.env.WOKE_FAKE_USER_DATA!, 'apt-data', 'woke-app.json')
const write = (o: object) => { fs.mkdirSync(path.dirname(prefsFile()), { recursive: true }); fs.writeFileSync(prefsFile(), JSON.stringify(o)) }
const load = async () => { vi.resetModules(); return await import('../../main/src/woke/app-prefs') }

describe('graphics-card drawing default', () => {
  beforeEach(() => {
    process.env.WOKE_FAKE_USER_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-prefs-'))
  })

  it('is on for a fresh install', async () => {
    expect((await load()).appPrefs().gpuDrawing).toBe(true)
  })

  it('turns on for an older file that only saved the old default', async () => {
    write({ autoUpdate: true, gpuDrawing: false })
    expect((await load()).appPrefs().gpuDrawing).toBe(true)
  })

  it('keeps a choice the player made, across starts', async () => {
    const first = await load()
    first.setAppPrefs({ gpuDrawing: false })
    first.setAppPrefs({ autoUpdate: false })
    const again = await load()
    expect(again.appPrefs().gpuDrawing).toBe(false)
    again.setAppPrefs({ gpuDrawing: true })
    expect((await load()).appPrefs().gpuDrawing).toBe(true)
  })
})
