// Our own item and stat data for a new league, before upstream Awakened PoE
// Trade ships it (WOKEPOET-154). Reads the trade site's stat, item and static
// lists, compares them with a snapshot taken before the patch, and adds what
// the patch brought to the English data files:
//
// - a stat id the snapshot didn't have: a new stat, matched by its trade text
// - a stat id whose text changed (3.30: "nearby" became metres): the new text
//   as another matcher of our stat with that id
// - a unique, base type or exchange item the snapshot didn't have: a new item
//
// Only the difference between the two trade lists is used. Comparing the trade
// lists with our data directly would add thousands of lines upstream leaves
// out on purpose (Crucible, Sanctum, legacy uniques).
//
//   node scripts/trade-data-patch.mjs snapshot   before the patch: save the lists
//   node scripts/trade-data-patch.mjs apply      after it: patch the data files
//   node scripts/trade-data-patch.mjs check      after it: report, change nothing
//
// After `apply`, run `node renderer/src/assets/bump-data-version.mjs` and
// commit: players get the files without a release. Other languages keep the
// upstream text until upstream catches up.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE = path.join(ROOT, 'scripts/trade-baseline')
const DATA = path.join(ROOT, 'renderer/public/data/en')
const API = 'https://www.pathofexile.com/api/trade/data'
const KINDS = ['stats', 'items', 'static']
const UA = 'woke-poe-trade data patch (github.com/guybnd/woke-poe-trade)'
// Stat kinds an item's own text can carry. Others (pseudo, Crucible trees,
// Sanctum, Ultimatum) aren't read from an item copy.
const ITEM_STAT_TYPES = new Set(['explicit', 'implicit', 'enchant', 'fractured', 'crafted', 'scourge', 'mercenary'])

async function fetchList (kind) {
  const res = await fetch(`${API}/${kind}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`${kind}: HTTP ${res.status}`)
  return (await res.json()).result
}

// Just what the diff reads, so the snapshot stays small.
function compact (kind, groups) {
  if (kind === 'stats') return groups.flatMap(g => g.entries.map(e => ({ id: e.id, text: e.text, type: e.type })))
  if (kind === 'items') return groups.flatMap(g => g.entries.map(e => ({ group: g.id, name: e.name ?? null, type: e.type })))
  return groups.flatMap(g => g.entries.filter(e => e.text).map(e => ({ group: g.id, id: e.id, text: e.text, image: e.image ?? '' })))
}

const readNdjson = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l))
// Keep the file's own line ends, so only patched lines show in the diff.
const eolOf = file => fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n'

// Trade texts mark the item kind a stat is local to; our matchers don't.
const LOCAL_TAG = / \((Local|Shields|Staves|Maps|Legacy|Jewel|Flasks?|Abyss Jewels?|Tincture|Implicit)\)$/
export const matcherText = text => text.replace(LOCAL_TAG, '').trim()

const GEAR_GROUPS = new Set(['armour', 'weapon'])

function category (group, base) {
  if (group === 'jewel') return / Eye Jewel$/.test(base) ? 'Abyss Jewel' : / Cluster Jewel$/.test(base) ? 'Cluster Jewel' : 'Jewel'
  if (group === 'accessory') return / Ring$/.test(base) ? 'Ring' : / Amulet$|^Talisman/.test(base) ? 'Amulet' : / (Belt|Sash|Vise|Obi)$/.test(base) ? 'Belt' : null
  if (group === 'flask') return 'Flask'
  return null
}

export function diff (before, after, statLines, itemLines) {
  const stats = statLines.flatMap(s => s.stats ?? [s])
  const byId = new Map()
  for (const s of stats) for (const ids of Object.values(s.trade.ids)) for (const id of ids) byId.set(id, s)
  const byText = new Map()
  for (const s of stats) for (const m of s.matchers) if (!byText.has(m.string.trim())) byText.set(m.string.trim(), s)
  const report = { newStats: [], newIds: [], reworded: [], newItems: [], byName: [], skipped: [] }

  // One id can carry several texts (an atlas "in your Maps" line and the map's
  // own "in Area" line), so an id is reworded only when its text is new to it.
  const oldTexts = new Map()
  for (const e of before.stats) {
    if (!oldTexts.has(e.id)) oldTexts.set(e.id, new Set())
    oldTexts.get(e.id).add(matcherText(e.text))
  }
  const added = new Map()
  for (const e of after.stats) {
    if (!ITEM_STAT_TYPES.has(e.type) || e.text.includes('\n')) continue
    const prev = oldTexts.get(e.id)
    const text = matcherText(e.text)
    if (!prev) {
      const ours = byId.get(e.id)
      if (ours) continue
      // A text we already match gets the new id (a new kind of an old stat),
      // so two stats never share a text. Otherwise one new stat per text,
      // holding every kind's id.
      const known = byText.get(text)
      if (known) {
        ;(known.trade.ids[e.type] ??= []).push(e.id)
        report.newIds.push({ id: e.id, text })
        continue
      }
      let stat = added.get(text)
      if (!stat) {
        stat = { ref: text, better: 1, matchers: [{ string: text }], trade: { ids: {} } }
        added.set(text, stat)
        report.newStats.push(stat)
      }
      ;(stat.trade.ids[e.type] ??= []).push(e.id)
    } else if (!prev.has(text)) {
      const ours = byId.get(e.id)
      if (!ours) continue
      if (!ours.matchers.some(m => m.string.trim() === text)) {
        ours.matchers.push({ string: text })
        report.reworded.push({ id: e.id, from: [...prev].join(' / '), to: e.text })
      }
    }
  }

  const names = new Set(itemLines.map(i => i.refName))
  const key = e => `${e.group}|${e.name}|${e.type}`
  const oldItems = new Set(before.items.map(key))
  for (const e of after.items) {
    if (oldItems.has(key(e))) continue
    const name = e.name ?? e.type
    if (names.has(name)) continue
    if (e.name) {
      report.newItems.push({ name, refName: name, namespace: 'UNIQUE', unique: { base: e.type }, icon: '' })
    } else {
      const cat = category(e.group, e.type)
      if (cat) report.newItems.push({ name, refName: name, namespace: 'ITEM', craftable: { category: cat }, icon: '' })
      else if (e.group === 'monster') report.newItems.push({ name, refName: name, namespace: 'CAPTURED_BEAST', icon: '' })
      // Armour and weapons need their category for mod search: added by hand.
      else if (GEAR_GROUPS.has(e.group)) report.skipped.push(`${e.group}: ${name} (no category)`)
      // A league's new kind of item (3.30's Wickerman trophies): known by name,
      // so price check and lookups at least recognise it.
      else {
        report.newItems.push({ name, refName: name, namespace: 'ITEM', icon: '' })
        report.byName.push(`${e.group}: ${name}`)
      }
    }
    names.add(name)
  }
  const oldStatic = new Set(before.static.map(e => e.id))
  for (const e of after.static) {
    if (oldStatic.has(e.id) || names.has(e.text)) continue
    report.newItems.push({ name: e.text, refName: e.text, namespace: 'ITEM', tradeTag: e.id, exchangeable: true, icon: e.image ? `https://web.poecdn.com${e.image}` : '' })
    names.add(e.text)
  }
  return report
}

async function main () {
  const mode = process.argv[2]
  if (mode === 'snapshot') {
    fs.mkdirSync(BASELINE, { recursive: true })
    for (const kind of KINDS) {
      const list = compact(kind, await fetchList(kind))
      fs.writeFileSync(path.join(BASELINE, `${kind}.json`), JSON.stringify(list) + '\n')
      console.log(`${kind}: ${list.length} entries saved`)
    }
    return
  }
  if (mode !== 'apply' && mode !== 'check') throw new Error('Usage: node scripts/trade-data-patch.mjs snapshot|apply|check')

  const before = {}
  const after = {}
  for (const kind of KINDS) {
    before[kind] = JSON.parse(fs.readFileSync(path.join(BASELINE, `${kind}.json`), 'utf8'))
    after[kind] = compact(kind, await fetchList(kind))
  }
  const statsFile = path.join(DATA, 'stats.ndjson')
  const itemsFile = path.join(DATA, 'items.ndjson')
  const statLines = readNdjson(statsFile)
  const itemLines = readNdjson(itemsFile)
  const report = diff(before, after, statLines, itemLines)

  console.log(`New stats: ${report.newStats.length}`)
  for (const s of report.newStats) console.log(`  + ${s.ref}`)
  console.log(`New ids on known stats: ${report.newIds.length}`)
  for (const n of report.newIds) console.log(`  + ${n.id}  ${n.text}`)
  console.log(`Reworded stats: ${report.reworded.length}`)
  for (const r of report.reworded) console.log(`  ~ ${r.from}  ->  ${r.to}`)
  console.log(`New items: ${report.newItems.length}`)
  for (const i of report.newItems) console.log(`  + ${i.namespace} ${i.name}`)
  if (report.byName.length) console.log(`Added by name only (no item class known): ${report.byName.length}\n  ${report.byName.slice(0, 40).join('\n  ')}`)
  if (report.skipped.length) console.log(`Left out (add by hand if needed):\n  ${report.skipped.join('\n  ')}`)
  if (mode === 'check') return

  const write = (file, lines) => {
    const eol = eolOf(file)
    fs.writeFileSync(file, lines.map(l => JSON.stringify(l)).join(eol) + eol)
  }
  write(statsFile, [...statLines, ...report.newStats])
  write(itemsFile, [...itemLines, ...report.newItems])
  console.log('Patched. Next: node renderer/src/assets/bump-data-version.mjs')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e.message); process.exit(1) })
}
