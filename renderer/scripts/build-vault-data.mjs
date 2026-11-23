// 3.30 Templar Vaults (Zealot's, Scholar's, Arkhon's, Machinist's): each
// vault's quadrant, the pinnacle bosses that can spawn it and its reliquary
// rewards, for Ctrl+Space and the Nightmare map check (src/web/woke/vaults).
//
//   npm run vault-data                 fetch the four poewiki pages and rebuild
//   npm run vault-data -- <dir>        rebuild from saved wikitext (<dir>/<Page>.txt)
//
// The wiki's reward bullets are read as they stand; how each one is priced on
// poe.ninja is the PRICES table below, by the bullet's plain text. A bullet
// with no entry is still listed, unpriced, and the script says so: add it to
// PRICES and run again. GGG publishes no reward weights and no vault spawn
// chance; RARE marks the rewards the wiki says turn up rarely.
//
// Writes public/data/league/vaults.json; then run src/assets/bump-data-version.mjs.
// @ts-check
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const API = 'https://www.poewiki.net/w/api.php'
const WIKI = 'https://www.poewiki.net/wiki/'
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/data/league/vaults.json')

const PAGES = ["Machinist's Vault", "Zealot's Vault", "Scholar's Vault", "Arkhon's Vault"]

/**
 * poe.ninja names for a bullet. qty: copies (a range's middle); several items
 * are averaged (one of them, unknown which). variant '1': gems at level 1, as
 * the wiki gives no level. icon: an item whose art stands for an unpriced
 * reward (a priced one shows its first item's art).
 * @type {Record<string, { kind: string, items?: Array<{ name: string, variant?: string }>, qty?: number, note?: string, icon?: string }>}
 */
const PRICES = {
  'T3+ Unique weapon/jewellery': { kind: 'unique', note: 'Depends on the unique' },
  '11-20x Stacked Decks': { kind: 'currency', items: [{ name: 'Stacked Deck' }], qty: 15.5 },
  '1-2x rarer divination cards': { kind: 'card', note: 'Depends on the card', icon: 'The Doctor' },
  'Greater Multistrike Support': { kind: 'gem', items: [{ name: 'Greater Multistrike Support', variant: '1' }] },
  'Invention Support': { kind: 'gem', items: [{ name: 'Invention Support', variant: '1' }] },
  'T3+ Unique armour/jewellery': { kind: 'unique', note: 'Depends on the unique' },
  'Valuable gems (20/20, 21/20, Empower/Enhance/Enlighten)': { kind: 'gem', note: 'Depends on the gem', icon: 'Enlighten Support' },
  "Facetor's Lens (350m, 500m, 750m)": { kind: 'currency', note: 'Priced by stored experience; not on poe.ninja', icon: "Facetor's Lens" },
  '1-5x Valuable currency': { kind: 'currency', note: 'Depends on the currency', icon: 'Divine Orb' },
  '20x regular currency': { kind: 'currency', note: 'Depends on the currency', icon: 'Chaos Orb' },
  'Orb of Intention, Orb of Remembrance, Orb of Unravelling': { kind: 'currency', items: [{ name: 'Orb of Intention' }, { name: 'Orb of Remembrance' }, { name: 'Orb of Unravelling' }], note: 'One of the three' },
  'Reflecting Mist': { kind: 'currency', items: [{ name: 'Reflecting Mist' }] },
  "Valdo's Puzzle Box": { kind: 'fragment', items: [{ name: "Valdo's Puzzle Box" }] },
  'Greater Spell Cascade Support': { kind: 'gem', items: [{ name: 'Greater Spell Cascade Support', variant: '1' }] },
  'Cooldown Recovery Support': { kind: 'gem', items: [{ name: 'Cooldown Recovery Support', variant: '1' }] },
  'Shaper Guardian/Elder Guardian/Conqueror maps': { kind: 'map', note: 'Depends on the map', icon: 'Shaper Guardian Map' },
  'Synthesised maps (including Cortex)': { kind: 'map', note: 'Depends on the map', icon: 'Cortex' },
  'Nightmare maps': { kind: 'map', items: [{ name: 'Nightmare Map' }] },
  '#x Threads': { kind: 'currency', note: 'Depends on the thread and how many', icon: 'Abyss Thread' },
  'Uber Elder Fragments': { kind: 'fragment', items: [{ name: 'Fragment of Shape' }, { name: 'Fragment of Knowledge' }, { name: 'Fragment of Terror' }, { name: 'Fragment of Emptiness' }], note: 'One of the four' }
}

// "It may rarely contain ..." (Templar Vault page).
const RARE = new Set(['Greater Multistrike Support', 'Invention Support', 'Greater Spell Cascade Support', 'Cooldown Recovery Support'])

/** @param {string} title */
async function wikitext (title) {
  const dir = process.argv[2]
  if (dir) return fs.readFileSync(path.join(dir, `${title}.txt`), 'utf8')
  const url = `${API}?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&formatversion=2&redirects=1`
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { 'User-Agent': 'woke-poe-trade vault-data' } })
  if (!res.ok) throw new Error(`${title}: ${res.status}`)
  const data = await res.json()
  const text = data?.parse?.wikitext
  if (typeof text !== 'string') throw new Error(`${title}: no wikitext (${JSON.stringify(data).slice(0, 120)})`)
  return text
}

/** Wiki markup to plain text. @param {string} s */
export function plain (s) {
  let out = s
  for (let i = 0; i < 3; i++) {
    out = out
      .replace(/\{\{il\|([^{}|]+)\|([^{}]+)\}\}/g, '$2')
      .replace(/\{\{il\|([^{}]+)\}\}/g, '$1')
      .replace(/\{\{c\|[^{}|]+\|([^{}]+)\}\}/g, '$1')
      .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
  }
  return out.replace(/\s+/g, ' ').trim()
}

/** @param {string} title @param {string} text */
export function readVault (title, text) {
  const area = /areas\.id="(MapWorldsMemoryVault\d)"/.exec(text)?.[1]
  const intro = /can appear after defeating a pinnacle boss in the (\w+) region \(([^)]*)\)/.exec(text)
  if (!area || !intro) throw new Error(`${title}: the page has changed shape (area id or quadrant line)`)
  const bosses = [...intro[2].matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map(m => m[1])
  const list = /display cases which can grant one of the following rewards:\s*\n((?:\*[^\n]*\n?)+)/.exec(text)?.[1]
  if (!list) throw new Error(`${title}: no reward list`)
  /** @type {string[]} */
  const missing = []
  const rewards = list.split('\n').filter(l => l.startsWith('*')).map(l => {
    const text = plain(l.slice(1))
    const p = PRICES[text]
    if (!p) missing.push(text)
    return {
      text,
      kind: p?.kind ?? 'other',
      ...(RARE.has(text) ? { rare: true } : {}),
      ...(p?.items ? { items: p.items } : {}),
      ...(p?.qty ? { qty: p.qty } : {}),
      ...(p?.icon ? { icon: p.icon } : {}),
      ...(p?.note ? { note: p.note } : p ? {} : { note: 'New on the wiki; not priced yet' })
    }
  })
  const quadrant = intro[1][0].toUpperCase() + intro[1].slice(1)
  return { vault: { id: area, name: title, quadrant, bosses, wiki: WIKI + encodeURIComponent(title.replace(/ /g, '_')), rewards }, missing }
}

async function main () {
  const vaults = []
  /** @type {string[]} */
  const missing = []
  for (const title of PAGES) {
    const r = readVault(title, await wikitext(title))
    vaults.push(r.vault)
    missing.push(...r.missing.map(m => `${title}: ${m}`))
  }
  const out = {
    source: 'poewiki (Templar Vault and the four vault pages)',
    read: new Date().toISOString().slice(0, 10),
    note: 'Four reliquaries, take one. GGG publishes no reward weights and no vault spawn chance.',
    vaults
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
  console.log(`Wrote ${vaults.length} vaults, ${vaults.reduce((n, v) => n + v.rewards.length, 0)} rewards to ${path.relative(process.cwd(), OUT)}`)
  if (missing.length) {
    console.warn(`\n${missing.length} reward line(s) with no poe.ninja pricing; add them to PRICES:\n  ${missing.join('\n  ')}`)
    process.exitCode = 2
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main()
