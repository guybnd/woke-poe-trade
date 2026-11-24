// Runs before every other module (first import in main.ts): pins the data
// folder and, on the first run, brings over data from the folder that older
// builds used.
//
// Builds before 0.1.0 were still named "awakened-poe-trade", so they shared
// %APPDATA%\awakened-poe-trade with a normal Awakened PoE Trade install. Our
// own folder keeps the two apart. The folder name is fixed on purpose: the
// display name can change without moving anyone's data.
// An elevated copy waits for the old one to quit before anything here runs.
import './wait-starter'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export const DATA_FOLDER = 'woke-poe-trade'
const OLD_FOLDER = 'awakened-poe-trade'

// Chromium caches and locks: rebuilt on their own, and copying them can fail.
const SKIP = new Set([
  'Cache', 'Code Cache', 'GPUCache', 'DawnGraphiteCache', 'DawnWebGPUCache',
  'Crashpad', 'blob_storage', 'Shared Dictionary', 'ShaderCache',
  'SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'
])

export type MigrationResult = 'none' | 'toolkit' | 'apt-settings'
export let migration: MigrationResult = 'none'

function migrate (newDir: string): MigrationResult {
  const newConfig = path.join(newDir, 'apt-data', 'config.json')
  if (fs.existsSync(newConfig)) return 'none'
  // Settings of ours that are damaged or being restored: never bring old ones in.
  try {
    if (fs.readdirSync(path.dirname(newConfig)).some(f => f === 'config.backup.json' || f.startsWith('config.broken-'))) return 'none'
  } catch {}

  const oldDir = path.join(app.getPath('appData'), OLD_FOLDER)
  const oldConfig = path.join(oldDir, 'apt-data', 'config.json')
  let contents: string
  try {
    contents = fs.readFileSync(oldConfig, 'utf8')
  } catch {
    return 'none'
  }

  let isToolkit = false
  try {
    isToolkit = (JSON.parse(contents) as { woke?: unknown }).woke != null
  } catch {}

  if (isToolkit) {
    // An older build of this app: take everything (settings, market history,
    // saved searches, overlay storage).
    fs.cpSync(oldDir, newDir, {
      recursive: true,
      errorOnExist: false,
      force: false,
      filter: (src) => !SKIP.has(path.basename(src))
    })
    return 'toolkit'
  }

  // A normal Awakened PoE Trade install: start from its settings (league,
  // hotkeys, language) and its OCR files, leave the rest alone.
  fs.mkdirSync(path.dirname(newConfig), { recursive: true })
  fs.writeFileSync(newConfig, contents)
  const oldOcr = path.join(oldDir, 'apt-data', 'cv-ocr')
  if (fs.existsSync(oldOcr)) {
    fs.cpSync(oldOcr, path.join(newDir, 'apt-data', 'cv-ocr'), { recursive: true })
  }
  return 'apt-settings'
}

const newDir = path.join(app.getPath('appData'), DATA_FOLDER)
app.setPath('userData', newDir)
try {
  migration = migrate(newDir)
} catch (e) {
  // Starting fresh beats not starting.
  console.error('[woke] data migration failed', e)
}
