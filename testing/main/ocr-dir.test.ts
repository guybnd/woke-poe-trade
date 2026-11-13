// Where the OCR files are read from, and the download when no folder has
// them all (main/src/woke/ocr-dir.ts).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'child_process'
import { net } from 'electron'
import { OCR_FILES, USER_OCR_DIR, ocrDir, missingOcrFiles, ensureOcrFiles, lastOcrDownloadError } from '../../main/src/woke/ocr-dir'
import { checkOcr, ensureOcr } from '../../main/src/woke/map-scan'

const fakeNet = net as unknown as { fetch?: (url: string) => Promise<Response> }

let root: string
const prevUserData = process.env.WOKE_FAKE_USER_DATA

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-ocr-dir-'))
  process.env.WOKE_FAKE_USER_DATA = root
})
afterEach(() => {
  process.env.WOKE_FAKE_USER_DATA = prevUserData
  delete fakeNet.fetch
  fs.rmSync(root, { recursive: true, force: true })
})

function fill (dir: string, names: string[]) {
  fs.mkdirSync(dir, { recursive: true })
  for (const n of names) fs.writeFileSync(path.join(dir, n), n)
}

describe('ocr dir', () => {
  it('uses the config folder when it has every file', () => {
    fill(USER_OCR_DIR(), OCR_FILES)
    expect(ocrDir()).toBe(USER_OCR_DIR())
    expect(missingOcrFiles(ocrDir())).toEqual([])
  })

  it('lists what a partial folder lacks', () => {
    fill(USER_OCR_DIR(), ['opencv.js'])
    expect(missingOcrFiles(USER_OCR_DIR())).toEqual(OCR_FILES.filter(f => f !== 'opencv.js'))
  })

  it('the missing-files message points at our guide, not the original app', () => {
    const check = checkOcr()
    if (process.platform !== 'win32') return
    expect(check.ok).toBe(false)
    expect(check.message).toContain('guybnd.github.io/woke-poe-trade/ocr-guide')
    expect(check.message).not.toContain('Awakened')
  })
})

describe.runIf(process.platform === 'win32')('ocr download', () => {
  it('downloads and unzips the files into the config folder', async () => {
    const src = path.join(root, 'zip-src')
    fill(path.join(src, 'cv-ocr'), [...OCR_FILES, 'rus.traineddata'])
    const zip = path.join(root, 'cv-ocr.zip')
    // Windows' own bsdtar, as the app uses (Git's GNU tar can't write zip).
    execFileSync(path.join(process.env.SystemRoot ?? 'C:/Windows', 'System32', 'tar.exe'), ['-a', '-cf', zip, '-C', src, 'cv-ocr'])
    const bytes = fs.readFileSync(zip)
    let calls = 0
    fakeNet.fetch = async () => { calls++; return new Response(bytes) }
    // A player's own extra language stays.
    fill(USER_OCR_DIR(), ['kor.traineddata'])

    await ensureOcrFiles()
    expect(calls).toBe(1)
    expect(missingOcrFiles(USER_OCR_DIR())).toEqual([])
    expect(fs.existsSync(path.join(USER_OCR_DIR(), 'kor.traineddata'))).toBe(true)
    expect(ocrDir()).toBe(USER_OCR_DIR())

    // Complete now: no second download.
    await ensureOcrFiles()
    expect(calls).toBe(1)
  })

  it('a slow download says so instead of holding the request', async () => {
    let finish!: (r: Response) => void
    fakeNet.fetch = async () => await new Promise<Response>(resolve => { finish = resolve })
    const check = await ensureOcr(50)
    expect(check.ok).toBe(false)
    expect(check.message).toContain('Downloading the OCR files')
    finish(new Response('nope', { status: 500 }))
    await ensureOcr(5_000)
  })

  it('a failed download is reported and not retried right away', async () => {
    // The slow test above failed one download: wait out its retry pause.
    vi.setSystemTime(Date.now() + 10 * 60 * 1000)
    let calls = 0
    fakeNet.fetch = async () => { calls++; return new Response('nope', { status: 404 }) }
    await ensureOcrFiles()
    expect(lastOcrDownloadError()).toContain('404')
    expect(checkOcr().message).toContain('Downloading them failed')
    await ensureOcrFiles()
    expect(calls).toBe(1)
    vi.useRealTimers()
  })
})
