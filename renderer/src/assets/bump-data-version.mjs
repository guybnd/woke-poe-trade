// Run after merging new item, stat, tooltip or passive tree data: node src/assets/bump-data-version.mjs
// Writes public/data/data-version.json with the next version and the files'
// hashes. Installed apps download the data once they see a newer version.
// @ts-check
import { createHash } from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../public/data')
const LANGUAGES = ['en', 'ru', 'cmn-Hant', 'ko']
const MANIFEST = path.join(DATA, 'data-version.json')
// Item tooltips and the passive tree: one copy for every language. Keep the
// list the same as SHARED_FILES in main/src/woke/live-data.ts.
export const SHARED = ['tips/bases.json', 'tips/gems.json', 'tips/items.json', 'tips/uniques.json', 'tree/passive-tree.json']

// Without carriage returns: a Windows checkout can add them, and the files on
// GitHub don't have them.
/** @param {string} text */
export function hashData (text) {
  return createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex')
}

export function currentHashes () {
  /** @type {Record<string, Record<string, string>>} */
  const out = {}
  for (const lang of LANGUAGES) {
    const hashes = out[lang] = /** @type {Record<string, string>} */ ({})
    for (const name of ['items', 'stats']) {
      hashes[name] = hashData(fs.readFileSync(path.join(DATA, lang, `${name}.ndjson`), 'utf8'))
    }
  }
  return out
}

export function sharedHashes () {
  /** @type {Record<string, string>} */
  const out = {}
  for (const file of SHARED) out[file] = hashData(fs.readFileSync(path.join(DATA, file), 'utf8'))
  return out
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const old = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { version: 0 }
  const next = { format: 1, version: old.version + 1, files: currentHashes(), shared: sharedHashes() }
  fs.writeFileSync(MANIFEST, JSON.stringify(next, null, 2) + '\n')
  console.log(`Item data is now version ${next.version}.`)
}
