// NeverSink upstream watch (Guy 2026-11-28): we no longer use NeverSink's
// filter, but his releases still tell us about new bases, retiered items and
// new rules. This compares two versions of his Regular filter and writes a
// report for us to read. It never changes our filter.
//
//   node scripts/neversink-watch.mjs                 latest release vs the one before
//   node scripts/neversink-watch.mjs <old> <new>     two tags, or two local .filter files
//
// Writes the report to stdout, or to $REPORT when set. With $GITHUB_OUTPUT it
// also sets tag= (the newer version) and changed=true|false.
import fs from 'node:fs'

const REPO = 'NeverSinkDev/NeverSink-Filter'
const FILE = "NeverSink's filter - 1-REGULAR.filter"
const HEADERS = { 'User-Agent': 'woke-poe-trade-neversink-watch', ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}) }

async function releases () {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=10`, { headers: { ...HEADERS, Accept: 'application/vnd.github+json' } })
  if (!res.ok) throw new Error(`releases: HTTP ${res.status}`)
  return (await res.json()).filter(r => !r.draft && !r.prerelease).map(r => ({ tag: r.tag_name, url: r.html_url, body: r.body ?? '' }))
}

async function load (ref) {
  if (fs.existsSync(ref)) return fs.readFileSync(ref, 'utf8')
  const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${encodeURIComponent(ref)}/${encodeURIComponent(FILE)}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`${ref}: HTTP ${res.status}`)
  return await res.text()
}

// Each block: its "$type->x $tier->y" name, the items it names and the
// conditions it checks.
export function parse (text) {
  const blocks = []
  let cur = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    const head = /^(Show|Hide|Minimal)\b(.*)$/.exec(line)
    if (head) {
      const type = /\$type->(\S+)/.exec(head[2])?.[1] ?? '?'
      const tier = /\$tier->(\S+)/.exec(head[2])?.[1] ?? '?'
      cur = { id: `${type}/${tier}`, action: head[1], names: [], conds: new Set() }
      blocks.push(cur)
      continue
    }
    if (!cur || !line || line.startsWith('#')) continue
    const word = line.split(/\s/)[0]
    if (/^(Set|Play|Minimap|Custom|Disable|Continue)/.test(word)) continue
    cur.conds.add(word)
    if (word === 'BaseType') cur.names.push(...[...line.matchAll(/"([^"]+)"/g)].map(m => m[1]))
  }
  const where = new Map()
  for (const b of blocks) for (const n of b.names) where.set(n, (where.get(n) ?? new Set()).add(b.id))
  return { blocks, where, version: /^# VERSION:\s*(\S+)/m.exec(text)?.[1] ?? '?' }
}

export function compare (a, b) {
  const added = [...b.where.keys()].filter(n => !a.where.has(n)).sort()
  const removed = [...a.where.keys()].filter(n => !b.where.has(n)).sort()
  // An item named in several blocks: only the blocks it joined or left.
  const moved = [...b.where].filter(([n]) => a.where.has(n)).map(([n, now]) => {
    const was = a.where.get(n)
    return { n, joined: [...now].filter(x => !was.has(x)), left: [...was].filter(x => !now.has(x)) }
  }).filter(m => m.joined.length || m.left.length).sort((x, y) => x.n.localeCompare(y.n))
  const ids = bl => new Set(bl.blocks.map(x => x.id))
  const newBlocks = [...ids(b)].filter(x => !ids(a).has(x))
  const goneBlocks = [...ids(a)].filter(x => !ids(b).has(x))
  const conds = bl => new Set(bl.blocks.flatMap(x => [...x.conds]))
  const newConds = [...conds(b)].filter(x => !conds(a).has(x))
  return { added, removed, moved, newBlocks, goneBlocks, newConds }
}

function list (title, rows, max = 150) {
  if (!rows.length) return ''
  const shown = rows.slice(0, max).map(r => `- ${r}`).join('\n')
  return `### ${title} (${rows.length})\n\n${shown}${rows.length > max ? `\n- …and ${rows.length - max} more` : ''}\n\n`
}

export function report (oldName, newName, d, notes = '') {
  const changed = d.added.length + d.removed.length + d.moved.length + d.newBlocks.length + d.goneBlocks.length + d.newConds.length > 0
  let md = `NeverSink's Regular filter, ${oldName} → ${newName}. For us to read: nothing here is applied to our filter.\n\n`
  if (!changed) md += 'No item, tier or rule changes.\n\n'
  md += list('New items (check each has a Loot row)', d.added)
  md += list('Items gone from his filter', d.removed)
  md += list('Items he retiered', d.moved.map(m => `${m.n}: ${[...m.joined.map(x => `now in ${x}`), ...m.left.map(x => `out of ${x}`)].join(', ')}`))
  md += list('New rule blocks', d.newBlocks)
  md += list('Rule blocks gone', d.goneBlocks)
  md += list('New conditions (does our filter writer know them?)', d.newConds)
  if (notes.trim()) md += `### His release notes\n\n${notes.trim().slice(0, 6000)}\n`
  return { md, changed }
}

async function main () {
  let [oldRef, newRef] = process.argv.slice(2)
  let notes = ''
  if (!oldRef || !newRef) {
    const rel = await releases()
    if (rel.length < 2) throw new Error('fewer than two releases')
    newRef = rel[0].tag
    oldRef = rel[1].tag
    notes = `${rel[0].url}\n\n${rel[0].body}`
  }
  const [a, b] = [parse(await load(oldRef)), parse(await load(newRef))]
  const { md, changed } = report(oldRef, newRef, compare(a, b), notes)
  if (process.env.REPORT) fs.writeFileSync(process.env.REPORT, md)
  else process.stdout.write(md)
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `tag=${newRef}\nchanged=${changed}\n`)
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) await main()
