// Downloads the OCR data (opencv.js, tesseract, traineddata) into build/cv-ocr
// so electron-builder can ship it with the installer. Skips the download when
// the folder is already there.
// @ts-check
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const URL = 'https://github.com/SnosMe/awakened-poe-trade/releases/download/v3.20.10007/cv-ocr.zip'
const NEEDED = ['tesseract-core-simd.js', 'opencv.js', 'eng.traineddata']

const here = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(here, 'cv-ocr')

if (NEEDED.every(f => fs.existsSync(path.join(outDir, f)))) {
  console.info('cv-ocr: already present')
  process.exit(0)
}

const res = await fetch(URL)
if (!res.ok) throw new Error(`cv-ocr: download failed (${res.status})`)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-ocr-'))
const zip = path.join(tmp, 'cv-ocr.zip')
fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()))

// 7zip-bin (a dev dependency) ships 7za for every build machine.
const require = createRequire(import.meta.url)
const { path7za } = require('7zip-bin')
try { fs.chmodSync(path7za, 0o755) } catch {}
execFileSync(path7za, ['x', zip, `-o${tmp}`, '-y'], { stdio: 'ignore' })

// The archive holds a cv-ocr/ folder.
const extracted = fs.existsSync(path.join(tmp, 'cv-ocr')) ? path.join(tmp, 'cv-ocr') : tmp
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
for (const name of fs.readdirSync(extracted)) {
  if (name === 'cv-ocr.zip') continue
  fs.cpSync(path.join(extracted, name), path.join(outDir, name), { recursive: true })
}
fs.rmSync(tmp, { recursive: true, force: true })

const missing = NEEDED.filter(f => !fs.existsSync(path.join(outDir, f)))
if (missing.length) throw new Error(`cv-ocr: archive is missing ${missing.join(', ')}`)
console.info(`cv-ocr: ${fs.readdirSync(outDir).join(', ')}`)
