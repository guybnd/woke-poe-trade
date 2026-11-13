// Where the OCR data (opencv + tesseract) lives. Files the player put in the
// config folder win (other languages, newer data); otherwise the copy that
// ships with the installer is used. When neither folder is complete (an
// antivirus took the installer's copy, an old partial folder), the files are
// downloaded once into the config folder.
import { app, net } from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'

export const USER_OCR_DIR = () => path.join(app.getPath('userData'), 'apt-data/cv-ocr')
export const BUNDLED_OCR_DIR = () => app.isPackaged ? path.join(process.resourcesPath, 'cv-ocr') : path.join(__dirname, '../build/cv-ocr')

// Everything the OCR worker loads; the .wasm files sit next to their .js.
export const OCR_FILES = ['opencv.js', 'opencv_js.wasm', 'tesseract-core-simd.js', 'tesseract-core-simd.wasm', 'eng.traineddata']

// Same archive the installer build bundles (main/build/fetch-ocr.mjs).
export const OCR_ZIP_URL = 'https://github.com/SnosMe/awakened-poe-trade/releases/download/v3.20.10007/cv-ocr.zip'
export const OCR_GUIDE_URL = 'https://guybnd.github.io/woke-poe-trade/ocr-guide'

export function missingOcrFiles (dir: string): string[] {
  try {
    const have = new Set(fs.readdirSync(dir))
    return OCR_FILES.filter(f => !have.has(f))
  } catch {
    return [...OCR_FILES]
  }
}

export function ocrDir (): string {
  const user = USER_OCR_DIR()
  if (!missingOcrFiles(user).length) return user
  const bundled = BUNDLED_OCR_DIR()
  if (!missingOcrFiles(bundled).length) return bundled
  return user
}

let fetching: Promise<void> | null = null
let lastFailure: { at: number, error: string } | null = null
// After a failed download, wait this long before trying again on the next check.
const RETRY_MS = 5 * 60 * 1000

export function lastOcrDownloadError (): string | null {
  return lastFailure?.error ?? null
}

export function ocrDownloading (): boolean {
  return fetching != null
}

// Makes sure some folder has every OCR file, downloading them into the config
// folder when none does. Resolves either way; read ocrDir() afterwards.
// With waitMs, gives up waiting after that long (the download goes on).
export async function ensureOcrFiles (waitMs?: number): Promise<void> {
  if (!missingOcrFiles(ocrDir()).length) return
  if (process.platform !== 'win32') return
  if (lastFailure && Date.now() - lastFailure.at < RETRY_MS) return
  if (!fetching) {
    fetching = downloadOcrFiles(USER_OCR_DIR())
      .then(() => { lastFailure = null })
      .catch((err: unknown) => {
        lastFailure = { at: Date.now(), error: err instanceof Error ? err.message : String(err) }
      })
      .finally(() => { fetching = null })
  }
  if (waitMs == null) {
    await fetching
    return
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  await Promise.race([fetching, new Promise<void>(resolve => { timer = setTimeout(resolve, waitMs) })])
  clearTimeout(timer)
}

async function downloadOcrFiles (dest: string): Promise<void> {
  // net.fetch goes through the system proxy, like the app's other requests.
  const res = await net.fetch(OCR_ZIP_URL, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`download failed (HTTP ${res.status})`)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-cv-ocr-'))
  try {
    const zip = path.join(tmp, 'cv-ocr.zip')
    fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()))
    const out = path.join(tmp, 'out')
    fs.mkdirSync(out)
    // Windows 10 1803+ ships bsdtar, which reads zip archives.
    const tar = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe')
    await new Promise<void>((resolve, reject) => {
      execFile(tar, ['-xf', zip, '-C', out], { timeout: 60_000, windowsHide: true }, (err) => {
        if (err) reject(new Error(`unzip failed (${err.message})`))
        else resolve()
      })
    })
    // The archive holds a cv-ocr/ folder.
    const extracted = fs.existsSync(path.join(out, 'cv-ocr')) ? path.join(out, 'cv-ocr') : out
    const missing = missingOcrFiles(extracted)
    if (missing.length) throw new Error(`archive is missing ${missing.join(', ')}`)
    fs.mkdirSync(dest, { recursive: true })
    // Keep the player's own files (other languages); add or replace ours.
    for (const name of fs.readdirSync(extracted)) {
      fs.copyFileSync(path.join(extracted, name), path.join(dest, name))
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}
