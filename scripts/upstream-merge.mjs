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

// A key some file lists more than once (16 items: Precursor's Emblem's
// variants and the like) is keyed by its whole entry, so variants pair up by
// content, not by position.
const DUP = '\u0000#'
function dupKeys (lists, keyOf) {
  const dups = new Set()
  for (const list of lists) {
    const seen = new Set()
    for (const o of list) { const k = keyOf(o); if (seen.has(k)) dups.add(k); seen.add(k) }
  }
  return dups
}
function keyed (list, keyOf, dups) {
  const seen = new Set()
  const out = []
  for (const o of list) {
    let k = keyOf(o)
    if (dups.has(k)) k += DUP + stableJson(o)
    if (seen.has(k)) continue // the very same entry twice
    seen.add(k)
    out.push([k, o])
  }
  return out
}

const tradeIds = (o) => Object.values(o?.trade?.ids ?? {}).flat()

// Stats upstream renamed: a ref of ours that upstream doesn't have, and a ref
// of upstream's that we don't have, sharing a trade id, one to one. Found
// against ours rather than base, so a rename kept on one run is found again on
// the next (base then has upstream's new ref). Base isn't needed; the
// parameter stays for callers.
export function findRenames (_base, ours, theirs) {
  // Refs inside stat groups count too: upstream renamed some grouped stats
  // into single ones ("Nearby Enemies are Chilled").
  const members = (list) => list.flatMap(o => typeof o.ref === 'string' ? [o] : (o.stats ?? []))
  const refs = (list) => new Set(members(list).filter(o => typeof o.ref === 'string').map(o => o.ref.replace(ZWSP, '')))
  const ourRefs = refs(ours); const theirRefs = refs(theirs)
  const added = new Map()
  for (const o of members(theirs)) {
    if (typeof o.ref !== 'string') continue
    const ref = o.ref.replace(ZWSP, '')
    if (ourRefs.has(ref)) continue
    for (const id of tradeIds(o)) {
      if (!added.has(id)) added.set(id, new Set())
      added.get(id).add(ref)
    }
  }
  const pairs = new Map()
  for (const o of members(ours)) {
    if (typeof o.ref !== 'string' || theirRefs.has(o.ref)) continue
    const cand = new Set()
    for (const id of tradeIds(o)) for (const r of added.get(id) ?? []) cand.add(r)
    if (cand.size === 1) pairs.set(o.ref, [...cand][0])
  }
  // One new ref claimed by two old ones: leave both alone.
  const claims = new Map()
  for (const nu of pairs.values()) claims.set(nu, (claims.get(nu) ?? 0) + 1)
  const renames = new Map()
  for (const [old, nu] of pairs) if (claims.get(nu) === 1) renames.set(nu, old)
  return renames // new ref -> our ref
}

// Upstream's copy (now, and at base), with renamed refs put back to ours
// (inside resolve groups too) and zero-width spaces taken out.
function normalizeUpstream (list, renames) {
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
  // Upstream's "no icon found" marker never beats a value of ours.
  if (t === undefined || (t === '%NOT_FOUND%' && o !== undefined)) return o
  return t
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
 * @param {{ base: any[], ours: any[], theirs: any[], kind: string, renames?: Map<string, string>, placeholders?: Set<string>, english?: { refs: Set<string>, covered: Map<string, string>, droppedGroups?: Set<string>, groups?: Set<string>, joined?: Map<string, string>, keptGroups?: Set<string> } }} args
 * @returns {{ list: any[], count: Record<string, number>, renames: Map<string, string>, covered: Map<string, string>, droppedGroups: Set<string>, groups: Set<string>, joined: Map<string, string>, keptGroups: Set<string> }}
 */
export function mergeData ({ base, ours, theirs, kind, renames, placeholders, english }) {
  const keyOf = kind === 'items' ? itemKey : statKey
  if (kind === 'stats' && !renames) renames = findRenames(base, ours, theirs)
  renames ??= new Map()
  if (kind === 'stats' && !placeholders) placeholders = findPlaceholders(base, theirs)
  placeholders ??= new Set()
  const baseN = normalizeUpstream(base, renames)
  const theirsN = normalizeUpstream(theirs, renames)
  const dups = dupKeys([baseN, ours, theirsN], keyOf)
  const B = new Map(keyed(baseN, keyOf, dups))
  const O = keyed(ours, keyOf, dups)
  const Om = new Map(O)
  const T = keyed(theirsN, keyOf, dups)
  const Tm = new Map(T)

  const count = { upstreamNew: 0, upstreamChanged: 0, oursKept: 0, merged: 0, kept: 0, keptDropped: 0, renamed: 0, ourDeletes: 0, upstreamPlaceholder: 0, droppedLikeUpstream: 0 }
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
  const upstreamKeys = new Set([...Tm.keys()].map(k => k.includes(DUP) ? k.slice(0, k.indexOf(DUP)) : k))
  // Kept even so: an entry upstream dropped (scarabs, coins, Captured Beasts
  // are still on the trade site). Not kept when we never changed it and it is
  // one variant of a repeated item upstream still lists in other variants: it
  // would stand beside its successor. (Split stat groups: dropSplitGroups.)
  for (const [k, o] of O) {
    if (Tm.has(k)) continue
    const b = B.get(k)
    if (b && same(o, b) && k.includes(DUP) && upstreamKeys.has(k.slice(0, k.indexOf(DUP)))) { count.droppedLikeUpstream++; continue }
    // Another language follows the merged English: a stat English no longer
    // has, upstream dropped here too.
    if (english && typeof o.ref === 'string' && !english.refs.has(o.ref)) { count.droppedLikeUpstream++; continue }
    // A group upstream dropped here that English doesn't have, unchanged by
    // us, was this language's own (two English stats sharing one wording).
    if (english?.keptGroups && b && same(o, b) && typeof o.ref !== 'string' && !english.keptGroups.has(k)) { count.droppedLikeUpstream++; continue }
    rows.set(k, o)
  }
  const joined = new Map()
  if (kind === 'stats') {
    count.droppedLikeUpstream += dropSplitGroups(rows, B, Tm, Om, english?.groups, english?.joined, joined)
    // Stat groups English left out are left out here too.
    for (const k of english?.droppedGroups ?? []) if (rows.delete(k)) count.droppedLikeUpstream++
  }
  let covered = new Map()
  if (kind === 'stats') {
    const settled = settleClashes(rows, B, T, O)
    covered = settled.covered
    count.matchersMoved = settled.matchersMoved
    count.upstreamCovered = settled.upstreamCovered
    count.droppedLikeUpstream += settled.droppedLikeUpstream
    // Upstream stats English left out for ours: left out here too.
    for (const [loser, winner] of english?.covered ?? []) {
      const lk = [...rows.keys()].find(k => rows.get(k).ref === loser && !B.has(k) && !Om.has(k))
      const wk = [...rows.keys()].find(k => rows.get(k).ref === winner)
      if (lk == null || wk == null) continue
      joinIds(rows, wk, rows.get(lk))
      rows.delete(lk)
      count.upstreamCovered++
    }
  }

  const after = new Map() // key emitted -> keys to put after it
  const head = []
  let prev = null
  for (const [k, o] of O) {
    if (Tm.has(k) || !rows.has(k)) { if (rows.has(k)) prev = k; continue }
    if (B.has(k)) count.keptDropped++
    else count.kept++
    if (prev == null) head.push(k)
    else { if (!after.has(prev)) after.set(prev, []); after.get(prev).push(k) }
    prev = k
  }
  // The very same entry twice (a group reached under two keys) is written once.
  const out = []
  const written = new Set()
  const emit = (k) => {
    const line = stableJson(rows.get(k))
    if (!written.has(line)) { written.add(line); out.push(rows.get(k)) }
    for (const k2 of after.get(k) ?? []) emit(k2)
  }
  for (const k of head) emit(k)
  for (const [k] of T) if (rows.has(k) && Tm.has(k)) emit(k)
  const droppedGroups = new Set([...Tm.keys(), ...O.map(([k]) => k)].filter(k => k.startsWith('resolve:') && !rows.has(k)))
  const groups = new Set([...Tm.keys()].filter(k => k.startsWith('resolve:')))
  const keptGroups = new Set([...rows.keys()].filter(k => k.startsWith('resolve:')))
  return { list: out, count, renames, covered, droppedGroups, groups, joined, keptGroups }
}

// A stat group upstream dropped whose stats all stand on their own after the
// merge (3.30 split "trivial-merge" and Heist "select" groups into single
// stats) would put one ref both in the group and on its own, and lookups pick
// either. Unchanged by us, the group goes. Changed by us (#434 routed the
// granted skills' 3.30 wording through such a group), the group stays and
// upstream's new single stats for it go.
function dropSplitGroups (rows, B, Tm, Om, englishGroups, englishJoined, joined) {
  const word = (m) => `${matcherKey(m)}0000${m?.value ?? ''}`
  const single = new Map()
  for (const [k, r] of rows) if (typeof r.ref === 'string') single.set(r.ref, k)
  let n = 0
  for (const [k, r] of [...rows]) {
    if (typeof r.ref === 'string' || Tm.has(k) || !Array.isArray(r.stats) || !r.stats.length) continue
    if (!r.stats.every(st => single.has(st.ref))) continue
    if (B.has(k) && same(r, B.get(k))) {
      rows.delete(k)
      n++
      continue
    }
    for (const st of r.stats) {
      const sk = single.get(st.ref)
      if (sk != null && rows.has(sk) && !B.has(sk) && !Om.has(sk)) { rows.delete(sk); n++ }
    }
  }
  // The other way round: upstream folded single stats into a new group (3.30:
  // "#% more Maximum Life", the Raise Spectre and granted-aura stats). Our
  // single stats stay, as code and tests read them that way (a folded random
  // gem searches only its own id), so the new group goes.
  // Upstream's new single stat that one of our groups already answers for
  // (#434's granted-skill groups read "Grants Level # Anger" and carry its
  // trade ids): its other wordings ("Grants Anger") join that group stat and
  // it goes.
  const groupWords = new Map() // wording -> [group key, stat index]
  for (const [k, r] of rows) {
    if (typeof r.ref === 'string' || !Om.has(k)) continue
    ;(r.stats ?? []).forEach((st, i) => {
      for (const m of st.matchers ?? []) groupWords.set(word(m), [k, i])
    })
  }
  for (const [k, r] of [...rows]) {
    if (typeof r.ref !== 'string' || B.has(k) || Om.has(k) || !r.matchers?.length) continue
    // Another language finds the group the English merge picked.
    let hit = r.matchers.map(m => groupWords.get(word(m))).find(Boolean)
    if (!hit && englishJoined?.has(r.ref) && rows.has(englishJoined.get(r.ref))) {
      const gk = englishJoined.get(r.ref)
      const i = rows.get(gk).stats.findIndex(st => tradeIds(r).every(id => tradeIds(st).includes(id)))
      if (i >= 0) hit = [gk, i]
    }
    if (!hit) continue
    const [gk, i] = hit
    const group = rows.get(gk)
    const st = group.stats[i]
    if (!tradeIds(r).every(id => tradeIds(st).includes(id))) continue
    joined.set(r.ref, gk)
    const have = new Set((st.matchers ?? []).map(word))
    const add = r.matchers.filter(m => !have.has(word(m)))
    const stats = group.stats.map((x, j) => j === i ? { ...x, matchers: [...(x.matchers ?? []), ...add] } : x)
    rows.set(gk, { ...group, stats })
    rows.delete(k)
    n++
  }
  // A group only another language has (two English stats share one Russian
  // wording) is upstream's own business: our unchanged single stats go.
  for (const [k, r] of [...rows]) {
    if (typeof r.ref === 'string' || !Tm.has(k) || B.has(k) || !Array.isArray(r.stats) || !r.stats.length) continue
    if (englishGroups && !englishGroups.has(k)) {
      for (const st of r.stats) {
        const sk = single.get(st.ref)
        if (sk != null && rows.has(sk) && B.has(sk) && same(rows.get(sk), B.get(sk))) { rows.delete(sk); n++ }
      }
      continue
    }
    if (!r.stats.every(st => single.has(st.ref) && Om.has(single.get(st.ref)))) continue
    rows.delete(k)
    n++
  }
  return n
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
  const counts = { matchersMoved: 0, upstreamCovered: 0, droppedLikeUpstream: 0, covered: new Map() }
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
    if (row.matchers.length) continue
    // One upstream dropped, now with no wording and nothing the winner lacks.
    if (!Tm.has(k)) {
      const has = new Set(tradeIds(rows.get(win)))
      if (tradeIds(row).every(id => has.has(id))) { rows.delete(k); counts.droppedLikeUpstream++ }
      continue
    }
    if (B.has(k) || Om.has(k)) continue
    rows.delete(k)
    counts.upstreamCovered++
    counts.covered.set(row.ref, rows.get(win).ref)
    joinIds(rows, win, row)
  }
  return counts
}

function joinIds (rows, win, row) {
  const into = rows.get(win)
  const ids = { ...(into.trade?.ids ?? {}) }
  for (const [type, list] of Object.entries(row.trade?.ids ?? {})) ids[type] = dedupe([...(ids[type] ?? []), ...list])
  rows.set(win, { ...into, trade: { ...into.trade, ids } })
}

export function toNdjson (list, eol = '\n') {
  return list.map(o => JSON.stringify(o)).join(eol) + eol
}

// Problems that would break matching: one ref on two stats, one matcher
// wording on two stats, a stat with no wording, one trade id on two stats, a
// ref both in a stat group and on its own. Only those in neither ours nor
// upstream's file count.
export function newClashes (merged, ours, theirs) {
  const clashes = (list) => {
    const seen = new Map(); const refs = new Set(); const out = new Set(); const ids = new Map(); const grouped = new Set(); let gi = 0
    for (const s of list) {
      // Resolve groups repeat their stats' refs on purpose.
      if (typeof s.ref !== 'string') {
        // A group's stats may share refs, wordings and ids among themselves
        // on purpose; not with a stat outside the group.
        const owner = 'group ' + gi++
        for (const g of s.stats ?? []) {
          if (typeof g.ref !== 'string') continue
          grouped.add(g.ref)
          for (const m of g.matchers ?? []) {
            if (typeof m.string !== 'string') continue
            const k = m.string + '\u0000' + (m.negate ? '-' : '') + (m.value ?? '')
            if (seen.has(k) && seen.get(k) !== owner) out.add('matcher: ' + m.string)
            else seen.set(k, owner)
          }
          for (const id of tradeIds(g)) {
            if (ids.has(id) && ids.get(id) !== owner) out.add('trade id on two stats: ' + id)
            else ids.set(id, owner)
          }
        }
        continue
      }
      if (refs.has(s.ref)) out.add('ref: ' + s.ref)
      refs.add(s.ref)
      if (!s.matchers?.length) out.add('no wording: ' + s.ref)
      for (const id of tradeIds(s)) {
        if (ids.has(id) && ids.get(id) !== s.ref) out.add('trade id on two stats: ' + id)
        else ids.set(id, s.ref)
      }
      for (const m of s.matchers ?? []) {
        if (typeof m.string !== 'string') continue
        const k = m.string + '\u0000' + (m.negate ? '-' : '') + (m.value ?? '')
        if (seen.has(k) && seen.get(k) !== s.ref) out.add('matcher: ' + m.string)
        else seen.set(k, s.ref)
      }
    }
    for (const r of grouped) if (refs.has(r)) out.add('in a group and on its own: ' + r)
    return out
  }
  const before = clashes(ours)
  // Upstream's own (it lists some trade ids on two stats) aren't the merge's.
  const upstream = clashes(normalizeUpstream(theirs ?? [], new Map()))
  return [...clashes(merged)].filter(k => !before.has(k) && !upstream.has(k))
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
