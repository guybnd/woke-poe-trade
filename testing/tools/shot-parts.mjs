// The website's pictures, in parts you can retake on their own: one per section
// of the landing page. Each part names the landing tests that take its shots and
// clip (by the start of their titles), and the app folders it shows, so
// "changed since" can pick the parts a release touched.
//
//   node tools/shot-parts.mjs --list
//   node tools/shot-parts.mjs --parts price-check,pob
//   node tools/shot-parts.mjs --changed-since v1.330.17
//
// Prints the playwright -g pattern for the picked parts (nothing when no part
// is picked), and which parts and why on stderr. "all" picks every part.
import { execFileSync } from 'node:child_process'

const W = 'renderer/src/web/woke/'
export const PARTS = {
  'price-check': { titles: ['price check:', 'clip: price check'], paths: ['renderer/src/web/price-check/', `${W}trade-searches/`, `${W}price-insight/`, `${W}gem-versions/`] },
  'pob': { titles: ['pob:', 'clip: pob'], paths: [`${W}pob-builds/`] },
  'loot-filter': { titles: ['filter:', 'tour: the loot filter', 'clip: filter'], paths: [`${W}loot-filter/`] },
  'market': { titles: ['market:', 'tour: market', 'tour: boss runs', 'clip: market'], paths: [`${W}market/`, `${W}scarab-flip/`, `${W}disenchant/`, `${W}boss-runs/`, `${W}lab-gems/`, `${W}stacked-decks/`] },
  'profit': { titles: ['profit:', 'clip: profit'], paths: [`${W}net-worth/`, `${W}analytics/`, `${W}session-story/`] },
  'on-screen': { titles: ['on screen:', 'clip: on screen'], paths: [`${W}mechanics/`, `${W}trade/`, `${W}campaign/`, `${W}lab/`, `${W}challenges/`, `${W}drop-counter/`, `${W}death-recap/`, `${W}wickerman/`, `${W}harvest-swap/`] },
  'quick-search': { titles: ['search:', 'clip: quick search'], paths: [`${W}search/`, `${W}item-lookup/`] },
  'maps': { titles: ['maps:'], paths: [`${W}essence-scan/`, `${W}atlas/`, 'renderer/src/web/map-check/'] },
  'regex': { titles: ['regex:'], paths: [`${W}map-mods/`, `${W}regex-library/`] },
  'setup': { titles: ['setup:'], paths: [`${W}setup/`] }
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export function pattern (parts) {
  const titles = parts.flatMap(p => PARTS[p].titles)
  return titles.length ? `(${titles.map(escape).join('|')})` : ''
}

export function changedParts (since) {
  const files = execFileSync('git', ['diff', '--name-only', `${since}...HEAD`], { encoding: 'utf8' }).split('\n').filter(Boolean)
  return Object.keys(PARTS).filter(p => files.some(f => PARTS[p].paths.some(dir => f.startsWith(dir))))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const value = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] ?? '' : null }
  if (args.includes('--list')) {
    for (const [id, p] of Object.entries(PARTS)) console.log(`${id}: ${p.titles.join(', ')}`)
    process.exit(0)
  }
  const picked = new Set()
  for (const p of (value('--parts') ?? '').split(/[\s,]+/).filter(Boolean)) {
    if (p === 'all') Object.keys(PARTS).forEach(k => picked.add(k))
    else if (PARTS[p]) picked.add(p)
    else { console.error(`No part "${p}". Parts: ${Object.keys(PARTS).join(', ')}`); process.exit(1) }
  }
  const since = value('--changed-since')
  if (since) {
    const changed = changedParts(since)
    console.error(`Changed since ${since}: ${changed.join(', ') || 'none'}`)
    changed.forEach(p => picked.add(p))
  }
  console.error(`Retaking: ${[...picked].join(', ') || 'nothing'}`)
  console.log(pattern([...picked]))
}
