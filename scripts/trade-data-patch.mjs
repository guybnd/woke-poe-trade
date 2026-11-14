// Our own item and stat data for a new league, before upstream Awakened PoE
// Trade ships it (WOKEPOET-154). Reads the trade site's stat, item and static
// lists, compares them with a snapshot taken before the patch, and adds what
// the patch brought to the English data files:
//
// - a stat id the snapshot didn't have: a new stat, matched by its trade text
// - a stat id whose text changed (3.30: "nearby" became metres): the new text
//   as another matcher of our stat with that id
// - a unique, base type or exchange item the snapshot didn't have: a new item
// - a stat id of ours the trade site dropped: moved to the stat's new id when
//   one is clear (3.30's granted skills and socketed supports), else dropped
//
// Only the difference between the two trade lists is used. Comparing the trade
// lists with our data directly would add thousands of lines upstream leaves
// out on purpose (Crucible, Sanctum, legacy uniques).
//
//   node scripts/trade-data-patch.mjs snapshot   before the patch: save the lists
//   node scripts/trade-data-patch.mjs apply      after it: patch the data files
//   node scripts/trade-data-patch.mjs check      after it: report, change nothing
//   node scripts/trade-data-patch.mjs remap      only move or drop dead stat ids
//   node scripts/trade-data-patch.mjs apply --group viscera
//                                                only one trade item group and the
//                                                implicit stats its items carry
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
const OTHER_LANGUAGES = ['ru', 'cmn-Hant', 'ko']
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
const refText = text => text.replace(LOCAL_TAG, '').trim()
// Our matchers carry no sign on a rolled number: the parser reads "+15%" as
// "#%", so "+#% to Item Rarity" is matched as "#% to Item Rarity".
export const matcherText = text => refText(text).replace(/\+#/g, '#')

const GEAR_GROUPS = new Set(['armour', 'weapon'])

function category (group, base) {
  if (group === 'jewel') return / Eye Jewel$/.test(base) ? 'Abyss Jewel' : / Cluster Jewel$/.test(base) ? 'Cluster Jewel' : 'Jewel'
  if (group === 'accessory') return / Ring$/.test(base) ? 'Ring' : / Amulet$|^Talisman/.test(base) ? 'Amulet' : / (Belt|Sash|Vise|Obi)$/.test(base) ? 'Belt' : null
  if (group === 'flask') return 'Flask'
  // 3.30 Wickerman trophies: one implicit each, slot read from the item text.
  if (group === 'viscera') return 'Viscera'
  return null
}

// How a moved stat's old and new trade texts are compared. 3.30 gave granted
// skills and socketed supports new ids ("explicit.effect_<n>") and new words:
// "Grants Level 20 Anger Skill" became "Grants Level 20 Anger", and "...by
// Level 16 Added Fire Damage" became "...Added Fire Damage Support". A fixed
// level ("Level 20") reads as "Level #", and some lost the level altogether
// ("Grants Embrace Madness"); that looser key is tried only when the first
// finds nothing.
// Two supports were renamed outright.
const RENAMED = [[/ cluster trap$/, ' cluster traps'], [/ power charge on critical strike$/, ' power charge on critical']]
const moveKey = text => RENAMED.reduce((t, [from, to]) => t.replace(from, to),
  matcherText(text).toLowerCase().replace(/\blevel \d+\b/g, 'level #').replace(/ (skill|support)$/, '').trim())
const looseKey = text => moveKey(text).replace(/^grants level # /, 'grants ')

// Our stat ids the trade site no longer has. Each one's new id is the new
// trade entry of the same kind (explicit, implicit...) whose text is the same
// stat's, as moveKey reads it. Only an id the pre-patch snapshot didn't have
// can be a new id, so an older stat with a similar text (Heist's "Grants
// Level # Anger Skill", Forbidden Shako's random supports) is never taken. A
// stat our earlier patch run added for the new id, as if it were a new stat,
// is folded into ours: its ids and its text join our stat, and its line goes.
// A dead id with no new id is dropped: the trade site refuses a search with an
// unknown stat id. The stat and its words stay, but a mod of a kind the stat
// has no id for reads as unknown (3.30 has no fractured granted skills or
// supports at all).
export function remap (before, after, statLines) {
  const report = { moved: [], dropped: [], folded: [], renumbered: [] }
  const touched = new Set()
  const liveIds = new Set(after.stats.map(e => e.id))
  const oldIds = new Set(before.stats.map(e => e.id))
  const standalone = new Set(statLines.filter(l => !l.stats))
  const stats = statLines.flatMap(s => s.stats ?? [s])
  const owner = new Map()
  for (const s of stats) for (const ids of Object.values(s.trade.ids)) for (const id of ids) if (!owner.has(id)) owner.set(id, s)
  const matched = new Set()
  for (const s of stats) for (const m of s.matchers) matched.add(m.string.trim())

  // An option id the trade site gave to another stat: 3.30 renumbered the
  // Foulborn "Skills Socketed in your Helmet are Supported by level # X" list,
  // so "|1|150" went from Fresh Meat to Greater Multiple Projectiles. Our
  // stat loses it (and the other stat's words an earlier run added to it as
  // a rewording), and the id can be the new id of the stat that now owns it.
  const oldText = new Map(before.stats.map(e => [e.id, e.text]))
  const reassigned = new Set()
  for (const e of after.stats) {
    if (!e.id.includes('|') || !ITEM_STAT_TYPES.has(e.type) || !oldText.has(e.id)) continue
    const was = moveKey(oldText.get(e.id))
    const now = moveKey(e.text)
    if (was === now) continue
    const s = owner.get(e.id)
    if (!s || moveKey(s.ref) !== was) continue
    // Only when another stat of ours is named by the new text.
    if (!stats.some(o => o !== s && moveKey(o.ref) === now)) continue
    const list = s.trade.ids[e.type] ?? []
    if (list.includes(e.id)) list.splice(list.indexOf(e.id), 1)
    if (!list.length) delete s.trade.ids[e.type]
    s.matchers = s.matchers.filter(m => moveKey(m.string) !== now)
    owner.delete(e.id)
    reassigned.add(e.id)
    touched.add(s)
    report.renumbered.push({ id: e.id, from: s.ref, to: e.text })
  }
  matched.clear()
  for (const s of stats) for (const m of s.matchers) matched.add(m.string.trim())

  const byKey = new Map()
  const byLoose = new Map()
  for (const e of after.stats) {
    if (!ITEM_STAT_TYPES.has(e.type) || e.text.includes('\n') || (oldIds.has(e.id) && !reassigned.has(e.id))) continue
    for (const [map, key] of [[byKey, moveKey(e.text)], [byLoose, looseKey(e.text)]]) {
      const k = `${e.type}|${key}`
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(e)
    }
  }

  const gone = new Set()
  for (const s of stats) {
    if (gone.has(s)) continue
    for (const type of Object.keys(s.trade.ids)) {
      if (!ITEM_STAT_TYPES.has(type)) continue
      for (const id of [...s.trade.ids[type]]) {
        if (liveIds.has(id)) continue
        const texts = [s.ref, ...s.matchers.map(m => m.string)]
        const find = (map, key) => [...new Map(texts.flatMap(t => map.get(`${type}|${key(t)}`) ?? []).map(e => [e.id, e])).values()]
        let found = find(byKey, moveKey)
        if (!found.length) found = find(byLoose, looseKey)
        // Not one clear new id: drop the dead one and say so.
        const next = found.length === 1 ? found[0] : null
        const list = s.trade.ids[type]
        list.splice(list.indexOf(id), 1)
        touched.add(s)
        if (!next) {
          report.dropped.push({ id, ref: s.ref, candidates: found.map(e => e.id) })
          continue
        }
        const holder = owner.get(next.id)
        if (holder && holder !== s && !touched.has(holder) && standalone.has(holder) &&
            !Object.values(holder.trade.ids).flat().some(i => oldIds.has(i))) {
          // Our earlier patch's stand-in for this stat: fold it into ours.
          for (const [t, ids] of Object.entries(holder.trade.ids)) {
            const into = (s.trade.ids[t] ??= [])
            for (const i of ids) if (!into.includes(i)) { into.push(i); owner.set(i, s) }
          }
          for (const m of holder.matchers) {
            if (!s.matchers.some(o => o.string.trim() === m.string.trim())) s.matchers.push({ ...m })
          }
          gone.add(holder)
          report.folded.push({ ref: s.ref, from: holder.ref })
        }
        if (!list.includes(next.id)) list.push(next.id)
        if (!owner.has(next.id)) owner.set(next.id, s)
        const text = matcherText(next.text)
        // The new words, unless another stat already reads them (two stats
        // that moved to one id: the first keeps the text).
        if (!matched.has(text)) {
          s.matchers.push({ string: text })
          matched.add(text)
        }
        report.moved.push({ from: id, to: next.id, ref: s.ref })
      }
      if (!s.trade.ids[type].length) delete s.trade.ids[type]
    }
  }
  if (gone.size) {
    for (let i = statLines.length - 1; i >= 0; i--) if (gone.has(statLines[i])) statLines.splice(i, 1)
  }
  // A group member we emptied that only repeats a sibling (the Fresh Meat
  // copy that held Greater Multiple Projectiles' id) goes.
  for (const line of statLines) {
    if (!line.stats) continue
    line.stats = line.stats.filter(s => !touched.has(s) || Object.keys(s.trade.ids).length ||
      !line.stats.some(o => o !== s && o.ref === s.ref && Object.keys(o.trade.ids).length))
  }
  return report
}

// Other languages: their texts are upstream's, but their ids are the same as
// ours. A dead id becomes the id English moved it to, or goes.
export function remapIds (statLines, liveIds, moved) {
  let n = 0
  for (const s of statLines.flatMap(l => l.stats ?? [l])) {
    let changed = false
    for (const type of Object.keys(s.trade.ids)) {
      if (!ITEM_STAT_TYPES.has(type)) continue
      const ids = s.trade.ids[type]
      const next = [...new Set(ids.flatMap(id => liveIds.has(id) ? [id] : moved.has(id) ? [moved.get(id)] : []))]
      if (next.length !== ids.length || next.some((id, i) => id !== ids[i])) changed = true
      if (next.length) s.trade.ids[type] = next
      else delete s.trade.ids[type]
    }
    if (changed) n++
  }
  return n
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
        stat = { ref: refText(e.text), better: 1, matchers: [{ string: text }], trade: { ids: {} } }
        added.set(text, stat)
        report.newStats.push(stat)
      }
      ;(stat.trade.ids[e.type] ??= []).push(e.id)
    } else if (!prev.has(text)) {
      const ours = byId.get(e.id)
      if (!ours) continue
      // A map mod's id is shared with its atlas passive ("... in your Maps").
      // The atlas wording would only crowd the map mod checker's list.
      if (ours.fromAreaMods && /\byour Maps\b/.test(text)) continue
      if (!ours.matchers.some(m => m.string.trim() === text)) {
        ours.matchers.push({ string: text })
        report.reworded.push({ id: e.id, from: [...prev].join(' / '), to: e.text })
      }
    }
  }

  const names = new Set(itemLines.map(i => i.refName))
  // Exchange items first: the same currency also shows in the item list, and
  // only the exchange list gives its trade tag and art.
  const oldStatic = new Set(before.static.map(e => e.id))
  for (const e of after.static) {
    if (oldStatic.has(e.id) || names.has(e.text)) continue
    report.newItems.push({ name: e.text, refName: e.text, namespace: 'ITEM', tradeTag: e.id, exchangeable: true, icon: e.image ? `https://web.poecdn.com${e.image}` : '' })
    names.add(e.text)
  }
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
  return report
}

// The trade group a scoped run patches, and the stat kind its items carry.
// Skill grants and socketed supports are left out: in 3.30 the trade site
// moved them to new ids ("effect_") with new wording, which a scoped run must
// not decide.
const GROUP_STAT_TYPES = { viscera: 'implicit' }
const SKILL_GRANT = /^(Grants |Socketed Gems are Supported by Level #)/
const isSkillGrant = e => e.id.includes('.effect_') || SKILL_GRANT.test(e.text)

export function scope (after, group) {
  const type = GROUP_STAT_TYPES[group]
  if (!type) throw new Error(`No scoped run for trade group "${group}". Known: ${Object.keys(GROUP_STAT_TYPES).join(', ')}`)
  return {
    stats: after.stats.filter(e => e.type === type && !isSkillGrant(e)),
    items: after.items.filter(e => e.group === group),
    static: []
  }
}

async function main () {
  const mode = process.argv[2]
  const groupAt = process.argv.indexOf('--group')
  const group = groupAt > 0 ? process.argv[groupAt + 1] : null
  if (mode === 'snapshot') {
    fs.mkdirSync(BASELINE, { recursive: true })
    for (const kind of KINDS) {
      const list = compact(kind, await fetchList(kind))
      fs.writeFileSync(path.join(BASELINE, `${kind}.json`), JSON.stringify(list) + '\n')
      console.log(`${kind}: ${list.length} entries saved`)
    }
    return
  }
  if (!['apply', 'check', 'remap'].includes(mode)) throw new Error('Usage: node scripts/trade-data-patch.mjs snapshot|apply|check|remap')

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
  // A short or broken stat list would read as thousands of dead ids.
  // Each kind on its own: a missing fractured group is a tenth of the list.
  const countBy = list => list.reduce((m, e) => m.set(e.type, (m.get(e.type) ?? 0) + 1), new Map())
  const had = countBy(before.stats)
  const has = countBy(after.stats)
  for (const [type, n] of had) {
    if (ITEM_STAT_TYPES.has(type) && (has.get(type) ?? 0) < n * 0.9) throw new Error(`The trade site's stat list has ${has.get(type) ?? 0} ${type} entries, the snapshot ${n}: not trusting it`)
  }
  // Moved ids first, so diff below doesn't take their new ids for new stats.
  // A scoped run leaves ids alone, like it leaves skill grants alone.
  const moves = group ? { moved: [], dropped: [], folded: [], renumbered: [] } : remap(before, after, statLines)
  // 3.30 dropped about 120. Far more is a broken list, not a patch.
  if (moves.dropped.length > 500) throw new Error(`${moves.dropped.length} of our stat ids are gone from the trade site: not trusting the list`)
  // remap: moved and dropped ids only, no new stats, texts or items.
  const report = mode === 'remap'
    ? { newStats: [], newIds: [], reworded: [], newItems: [], byName: [], skipped: [] }
    : diff(before, group ? scope(after, group) : after, statLines, itemLines)

  console.log(`Moved stat ids: ${moves.moved.length}`)
  for (const m of moves.moved) console.log(`  > ${m.from} -> ${m.to}  ${m.ref}`)
  console.log(`Renumbered option ids: ${moves.renumbered.length}`)
  for (const r of moves.renumbered) console.log(`  ~ ${r.id}  ${r.from}  ->  ${r.to}`)
  console.log(`Folded stand-in stats: ${moves.folded.length}`)
  for (const f of moves.folded) console.log(`  = ${f.from}  into  ${f.ref}`)
  console.log(`Dropped stat ids (gone from the trade site): ${moves.dropped.length}`)
  for (const d of moves.dropped) console.log(`  - ${d.id}  ${d.ref}${d.candidates.length ? `  (unclear: ${d.candidates.join(', ')})` : ''}`)
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
  const liveIds = new Set(after.stats.map(e => e.id))
  const moved = new Map(moves.moved.map(m => [m.from, m.to]))
  for (const lang of group ? [] : OTHER_LANGUAGES) {
    const file = path.join(DATA, '..', lang, 'stats.ndjson')
    if (!fs.existsSync(file)) continue
    const lines = readNdjson(file)
    const n = remapIds(lines, liveIds, moved)
    if (n) write(file, lines)
    console.log(`${lang}: ${n} stats with moved or dropped ids`)
  }
  console.log('Patched. Next: node renderer/src/assets/bump-data-version.mjs')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e.message); process.exit(1) })
}
