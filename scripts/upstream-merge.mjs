// Three-way merge of upstream Awakened PoE Trade's item and stat data into
// ours, used by scripts/upstream-data.mjs instead of copying upstream's files
// whole (that dropped every entry woke added by hand, PR #651).
//
//   base   = upstream's file at the commit we last took (.github/upstream-data.json)
//   ours   = our file on master
//   theirs = upstream's file now
//
// Rules, per entry (items by namespace + refName, stats by ref):
// - only upstream changed it: upstream's copy
// - only we changed it: ours
// - both changed it: field by field; upstream wins a clash of plain values,
//   matcher lists keep both sides' matchers, trade id lists take upstream's
//   with our own additions and removals applied on top
// - upstream dropped it: ours is kept. 3.30 upstream dropped scarabs, coins
//   and Captured Beasts, which the trade site still lists and Standard still has.
// - upstream renamed a stat (same trade id, new ref, e.g. "nearby" became
//   "within 6 metres"): the stat keeps our ref, since code, filters, fixtures
//   and saved searches key on it, and gets upstream's matchers next to ours.
// - zero-width spaces (3.30 puts one before linked skill names) are taken out
//   of upstream's text: Parser.ts strips them from item text before matching.
//
//   node scripts/upstream-merge.mjs <base> <ours> <theirs> <items|stats> [out]
//
// prints the merged file (or writes out) and a report on stderr. Without a
// rename list it finds renames itself, which is only right for English files.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const ZWSP = /​/g

export function parseNdjson (text) {
  if (text == null) return []
  return text.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim()).map(l => JSON.parse(l))
}

const stableJson = (v) => JSON.stringify(v)
const same = (a, b) => stableJson(a) === stableJson(b)

function statKey (o) {
  if (typeof o.ref === 'string') return o.ref
  // A resolve group ("trivial-merge" and the like) holds several stats.
  return 'resolve:' + stableJson(o.resolve ?? null) + ':' + (o.stats ?? []).map(s => s.ref).join('\n')
}
function itemKey (o) {
  return `${o.namespace}\u0000${o.refName}`
}

// Keys stay unique when a file lists the same key twice (16 items do).
function keyed (list, keyOf) {
  const seen = new Map()
  return list.map(o => {
    const k = keyOf(o)
    const n = seen.get(k) ?? 0
    seen.set(k, n + 1)
    return [n ? `${k}\u0000#${n}` : k, o]
  })
}

const tradeIds = (o) => Object.values(o?.trade?.ids ?? {}).flat()

// Stats upstream renamed: a ref of base that upstream no longer has, and a
// ref upstream added, that share a trade id, one to one. A new ref we already
// have (our own patch added it) isn't a rename: both stats stay.
export function findRenames (base, ours, theirs) {
  const refs = (list) => new Set(list.filter(o => typeof o.ref === 'string').map(o => o.ref))
  const baseRefs = refs(base); const ourRefs = refs(ours); const theirRefs = refs(theirs)
  const oursByRef = new Map(ours.filter(o => typeof o.ref === 'string').map(o => [o.ref, o]))
  const added = new Map()
  for (const o of theirs) {
    if (typeof o.ref !== 'string' || baseRefs.has(o.ref) || ourRefs.has(o.ref)) continue
    for (const id of tradeIds(o)) {
      if (!added.has(id)) added.set(id, new Set())
      added.get(id).add(o.ref)
    }
  }
  const pairs = new Map()
  for (const o of base) {
    if (typeof o.ref !== 'string' || theirRefs.has(o.ref)) continue
    const cand = new Set()
    for (const id of tradeIds(oursByRef.get(o.ref) ?? o)) for (const r of added.get(id) ?? []) cand.add(r)
    if (cand.size === 1) pairs.set(o.ref, [...cand][0])
  }
  // One new ref claimed by two old ones: leave both alone.
  const claims = new Map()
  for (const nu of pairs.values()) claims.set(nu, (claims.get(nu) ?? 0) + 1)
  const renames = new Map()
  for (const [old, nu] of pairs) if (claims.get(nu) === 1) renames.set(nu, old)
  return renames // new ref -> our ref
}

// Upstream's copy, with renamed refs put back to ours (inside resolve groups
// too) and zero-width spaces taken out.
function normalizeTheirs (list, renames) {
  const fix = (v) => {
    if (typeof v === 'string') return v.replace(ZWSP, '')
    if (Array.isArray(v)) return v.map(fix)
    if (v && typeof v === 'object') {
      const out = {}
      for (const [k, x] of Object.entries(v)) {
        out[k] = (k === 'ref' && typeof x === 'string' && renames?.has(x.replace(ZWSP, ''))) ? renames.get(x.replace(ZWSP, '')) : fix(x)
      }
      if (Array.isArray(out.matchers)) out.matchers = dedupe(out.matchers)
      return out
    }
    return v
  }
  return list.map(fix)
}

function dedupe (list) {
  const seen = new Set()
  return list.filter(x => { const k = stableJson(x); if (seen.has(k)) return false; seen.add(k); return true })
}

// Wordings merge as a union, one matcher per wording, ours first with our own
// copy of each (code reads matchers[0], e.g. a timeless jewel's "advanced"
// form, which 3.30 upstream left off). A wording we took out stays out. One
// upstream took out stays, since items still carry old wordings (Maven's
// Orrery's "Nearby Enemies are Scorched" in 3.30), except on map and area
// mods (fromAreaMods): those lists are offered whole in the map mod picker,
// and maps show today's wording.
function mergeMatchers (b, o, t, area) {
  const word = (m) => `${m?.negate ? '-' : '+'}${m?.string}\u0000${m?.value ?? ''}`
  const inB = new Set((Array.isArray(b) ? b : []).map(word))
  const inT = new Set(t.map(word))
  const inO = new Set(o.map(word))
  const seen = new Set()
  const keep = (x, ok) => {
    const w = word(x)
    if (!ok(w) || seen.has(w)) return false
    seen.add(w)
    return true
  }
  return [
    ...o.filter(x => keep(x, w => !area || inT.has(w) || !inB.has(w))),
    ...t.filter(x => keep(x, w => !inB.has(w) || inO.has(w)))
  ]
}

// Three-way merge of one value. undefined = absent.
function merge3 (b, o, t, path, area = false) {
  if (same(o, t)) return o
  const last = path[path.length - 1]
  // Wordings are merged even where we changed nothing, so our copy of a
  // wording keeps fields upstream left off.
  if (last === 'matchers' && Array.isArray(o) && Array.isArray(t)) return mergeMatchers(b, o, t, area)
  const holdsMatchers = Array.isArray(o?.matchers) && Array.isArray(t?.matchers) && !same(o.matchers, t.matchers)
  if (!holdsMatchers && same(o, b)) return t
  if (!holdsMatchers && same(t, b)) return o
  if (Array.isArray(o) && Array.isArray(t)) {
    const bl = Array.isArray(b) ? b : []
    const has = (list, x) => list.some(y => same(x, y))
    // Trade ids: a dead id breaks a search, so removals on either side win.
    if (path.includes('ids')) {
      const ourAdds = o.filter(x => !has(bl, x))
      const ourDrops = bl.filter(x => !has(o, x))
      return dedupe([...t, ...ourAdds]).filter(x => !has(ourDrops, x))
    }
    return t
  }
  const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v)
  if (isObj(o) && isObj(t)) {
    const bo = isObj(b) ? b : {}
    const out = {}
    for (const k of new Set([...Object.keys(t), ...Object.keys(o)])) {
      const v = merge3(bo[k], o[k], t[k], [...path, k], area || Boolean(t.fromAreaMods ?? o.fromAreaMods))
      if (v !== undefined) out[k] = v
    }
    return out
  }
  return t === undefined ? o : t
}

const placeholder = (o) => typeof o?.ref === 'string' && Array.isArray(o.matchers) && o.matchers.length > 0 &&
  o.matchers.every(m => m.string === o.ref + ' ')

// Refs whose upstream entry is such a placeholder, found in English (where the
// wording is the ref) and used for every language.
export function findPlaceholders (base, theirs) {
  const before = new Map(base.filter(o => typeof o.ref === 'string').map(o => [o.ref, o]))
  return new Set(theirs.filter(t => placeholder(t) && before.has(t.ref) && !placeholder(before.get(t.ref))).map(t => t.ref))
}

// Merges one file. base/ours/theirs are parsed ndjson lists. Returns the
// merged list and counts for the report.
/**
 * @param {{ base: any[], ours: any[], theirs: any[], kind: string, renames?: Map<string, string>, placeholders?: Set<string> }} args
 * @returns {{ list: any[], count: Record<string, number>, renames: Map<string, string> }}
 */
export function mergeData ({ base, ours, theirs, kind, renames, placeholders }) {
  const keyOf = kind === 'items' ? itemKey : statKey
  if (kind === 'stats' && !renames) renames = findRenames(base, ours, theirs)
  renames ??= new Map()
  if (kind === 'stats' && !placeholders) placeholders = findPlaceholders(base, theirs)
  placeholders ??= new Set()
  const B = new Map(keyed(base, keyOf))
  const O = keyed(ours, keyOf)
  const Om = new Map(O)
  const T = keyed(normalizeTheirs(theirs, renames), keyOf)
  const Tm = new Map(T)

  const count = { upstreamNew: 0, upstreamChanged: 0, oursKept: 0, merged: 0, kept: 0, keptDropped: 0, renamed: 0, ourDeletes: 0, upstreamPlaceholder: 0 }
  const rows = new Map() // key -> merged entry
  for (const [k, theirsEntry] of T) {
    const b = B.get(k); const o = Om.get(k)
    let t = theirsEntry
    // 3.30 upstream's data turned 86 pseudo stats (every Temple room, increased
    // rarity) into a single "<ref> " wording no item has, and dropped their
    // trade option. Such an entry is taken as unchanged.
    if (kind === 'stats' && b && placeholders.has(t.ref)) { t = b; count.upstreamPlaceholder++ }
    const v = merge3(b, o, t, [])
    if (v === undefined) { count.ourDeletes++; continue }
    rows.set(k, v)
    if (b === undefined && o === undefined) count.upstreamNew++
    else if (same(v, t) && !same(t, b)) count.upstreamChanged++
    else if (same(v, o) && !same(o, b)) count.oursKept++
    else if (!same(v, o) && !same(v, t)) count.merged++
  }
  for (const nu of renames.keys()) if (theirs.some(x => x.ref === nu)) count.renamed++

  // Ours that upstream doesn't have, in place after the entry before it in ours.
  for (const [k, o] of O) if (!Tm.has(k)) rows.set(k, o)
  if (kind === 'stats') Object.assign(count, settleClashes(rows, B, T, O))

  const after = new Map() // key emitted -> keys to put after it
  const head = []
  let prev = null
  for (const [k, o] of O) {
    if (Tm.has(k)) { if (rows.has(k)) prev = k; continue }
    if (B.has(k)) count.keptDropped++
    else count.kept++
    if (prev == null) head.push(k)
    else { if (!after.has(prev)) after.set(prev, []); after.get(prev).push(k) }
    prev = k
  }
  const out = []
  const emit = (k) => {
    out.push(rows.get(k))
    for (const k2 of after.get(k) ?? []) emit(k2)
  }
  for (const k of head) emit(k)
  for (const [k] of T) if (rows.has(k) && Tm.has(k)) emit(k)
  return { list: out, count, renames }
}

const matcherKey = (m) => typeof m?.string === 'string' ? `${m.negate ? '-' : '+'}${m.string}` : null

// One wording on two stats matches wrongly, so where the merge puts one on
// two stats, one keeps it:
// - a wording we added to a stat stays there. Our launch-day patch routed
//   3.30 wordings onto our stats ("#% to Item Rarity" onto increased rarity,
//   with its pseudo total); code and tests rely on that. A stat upstream added
//   for the same wording gives it up, and when that leaves it no wordings it
//   is left out and its trade ids join our stat (its ref would match too).
// - otherwise the stats upstream gives the wording keep it, and a stat upstream
//   dropped and we kept gives it up.
// Clashes already in ours stay as they were.
function settleClashes (rows, B, T, O) {
  const byMatcher = (entries) => {
    const map = new Map()
    for (const [k, o] of entries) {
      if (typeof o?.ref !== 'string') continue
      for (const m of o.matchers ?? []) {
        const mk = matcherKey(m)
        if (!mk) continue
        if (!map.has(mk)) map.set(mk, new Set())
        map.get(mk).add(k)
      }
    }
    return map
  }
  const has = (o, mk) => (o?.matchers ?? []).some(m => matcherKey(m) === mk)
  const Tm = new Map(T)
  const Om = new Map(O)
  const theirs = byMatcher(T)
  const before = byMatcher(O)
  const ourAdds = new Map()
  for (const [k, o] of O) {
    if (typeof o.ref !== 'string') continue
    for (const m of o.matchers ?? []) {
      const mk = matcherKey(m)
      if (!mk || has(B.get(k), mk)) continue
      if (!ourAdds.has(mk)) ourAdds.set(mk, new Set())
      ourAdds.get(mk).add(k)
    }
  }
  const counts = { matchersMoved: 0, upstreamCovered: 0 }
  const winnerOf = new Map() // losing key -> a key that kept its wording
  for (const [mk, keys] of byMatcher(rows)) {
    if (keys.size < 2) continue
    const old = before.get(mk)
    const ours = [...keys].filter(k => ourAdds.get(mk)?.has(k))
    const winners = ours.length ? ours : [...keys].filter(k => theirs.get(mk)?.has(k) && has(Tm.get(k), mk))
    if (!winners.length) continue
    for (const k of keys) {
      if (winners.includes(k)) continue
      // Ours already had it on this stat and another one: leave it.
      if (old?.has(k) && [...keys].some(x => x !== k && old.has(x))) continue
      const row = rows.get(k)
      rows.set(k, { ...row, matchers: row.matchers.filter(m => matcherKey(m) !== mk) })
      counts.matchersMoved++
      if (!winnerOf.has(k)) winnerOf.set(k, winners[0])
    }
  }
  for (const [k, win] of winnerOf) {
    const row = rows.get(k)
    if (row.matchers.length || B.has(k) || Om.has(k)) continue
    rows.delete(k)
    counts.upstreamCovered++
    const into = rows.get(win)
    const ids = { ...(into.trade?.ids ?? {}) }
    for (const [type, list] of Object.entries(row.trade?.ids ?? {})) ids[type] = dedupe([...(ids[type] ?? []), ...list])
    rows.set(win, { ...into, trade: { ...into.trade, ids } })
  }
  return counts
}

export function toNdjson (list, eol = '\n') {
  return list.map(o => JSON.stringify(o)).join(eol) + eol
}

// Problems that would break matching: one ref on two stats, or one matcher
// wording on two stats. Only those not already in ours count.
export function newClashes (merged, ours) {
  const clashes = (list) => {
    const seen = new Map(); const refs = new Set(); const out = new Set()
    for (const s of list) {
      // Resolve groups repeat their stats' refs on purpose.
      if (typeof s.ref !== 'string') continue
      if (refs.has(s.ref)) out.add('ref: ' + s.ref)
      refs.add(s.ref)
      for (const m of s.matchers ?? []) {
        if (typeof m.string !== 'string') continue
        const k = m.string + '\u0000' + (m.negate ? '-' : '') + (m.value ?? '')
        if (seen.has(k) && seen.get(k) !== s.ref) out.add('matcher: ' + m.string)
        else seen.set(k, s.ref)
      }
    }
    return out
  }
  const before = clashes(ours)
  return [...clashes(merged)].filter(k => !before.has(k))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const [baseF, oursF, theirsF, kind, outF] = process.argv.slice(2)
  if (!kind) throw new Error('Usage: node scripts/upstream-merge.mjs <base> <ours> <theirs> <items|stats> [out]')
  const read = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null
  const oursText = read(oursF)
  const res = mergeData({ base: parseNdjson(read(baseF)), ours: parseNdjson(oursText), theirs: parseNdjson(read(theirsF)), kind })
  const text = toNdjson(res.list, oursText?.includes('\r\n') ? '\r\n' : '\n')
  if (outF) fs.writeFileSync(outF, text); else process.stdout.write(text)
  console.error(JSON.stringify(res.count))
}
