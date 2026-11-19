// Run by .github/workflows/upstream-data.yml: merges upstream Awakened PoE
// Trade's item and stat data into ours when it changes (scripts/upstream-merge.mjs:
// woke's own entries and stat refs survive), bumps data-version.json, and
// writes the pull request text, including upstream's code changes since the
// last copy (league parser fixes come that way and need merging by hand).
//
//   node scripts/upstream-data.mjs <upstream checkout>
//
// Prints changed=true|false for the workflow. Changes nothing when the data
// is the same.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findPlaceholders, findRenames, mergeData, newClashes, parseNdjson, toNdjson } from './upstream-merge.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const UPSTREAM = process.argv[2]
if (!UPSTREAM) throw new Error('Usage: node scripts/upstream-data.mjs <upstream checkout>')
const STATE = path.join(ROOT, '.github/upstream-data.json')
const LANGUAGES = ['en', 'ru', 'cmn-Hant', 'ko']
// Item and stat data reach players without a release. client_strings.js is
// left alone and only listed: it goes with upstream's parser code (3.30 renamed
// MAP_MORE_SCARABS, which Parser.ts reads), so it's ported with that by hand.
const FILES = ['items.ndjson', 'stats.ndjson']
const STRINGS = 'client_strings.js'
const DATA = 'renderer/public/data'

const state = JSON.parse(fs.readFileSync(STATE, 'utf8'))
const git = (...args) => execFileSync('git', ['-C', UPSTREAM, ...args], { encoding: 'utf8' }).trim()
const head = git('rev-parse', 'HEAD')

// Line ends aside: a Windows checkout may have added carriage returns.
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null

// Upstream's copy of a file at the last commit copied, or null when unknown.
function seenCopy (rel) {
  try {
    return execFileSync('git', ['-C', UPSTREAM, 'show', `${state.seen}:${rel}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n')
  } catch {
    return null
  }
}

let seenReachable = true
try { git('cat-file', '-e', `${state.seen}^{commit}`) } catch { seenReachable = false }

const changed = []
const report = []
const clashes = []

// Stat renames are found once, in English, and used for every language: refs
// are English in all of them.
// So are upstream's placeholder pseudo stats (scripts/upstream-merge.mjs).
let renames = new Map()
let placeholders = new Set()
// The merged English stats, which the other languages follow.
let english
{
  const rel = `${DATA}/en/stats.ndjson`
  const theirs = read(path.join(UPSTREAM, rel))
  if (theirs != null) {
    const base = parseNdjson(seenCopy(rel))
    renames = findRenames(base, parseNdjson(read(path.join(ROOT, rel))), parseNdjson(theirs))
    placeholders = findPlaceholders(base, parseNdjson(theirs))
  }
}

for (const lang of LANGUAGES) {
  for (const name of FILES) {
    const rel = `${DATA}/${lang}/${name}`
    const theirs = read(path.join(UPSTREAM, rel))
    if (theirs == null) continue
    // Only a file upstream itself changed is looked at.
    // A file new since then has an empty base.
    const seen = seenCopy(rel) ?? (seenReachable ? '' : null)
    // Without upstream's copy at the commit we last took, the merge can't tell
    // our changes from upstream's: renames would come back as second stats.
    if (seen == null) throw new Error(`Upstream's ${rel} at ${state.seen} is out of reach (force-pushed, or past the clone depth). Merge this one by hand.`)
    if (seen.trim() === theirs.trim()) continue
    const file = path.join(ROOT, rel)
    const oursText = read(file)
    const kind = name.startsWith('items') ? 'items' : 'stats'
    const ours = parseNdjson(oursText)
    const res = mergeData({ base: parseNdjson(seen), ours, theirs: parseNdjson(theirs), kind, ...(kind === 'stats' ? { renames, placeholders, english: lang === 'en' ? undefined : english } : {}) })
    const text = toNdjson(res.list)
    if (lang === 'en' && kind === 'stats') english = { refs: new Set(res.list.flatMap(o => typeof o.ref === 'string' ? [o.ref] : (o.stats ?? []).map(st => st.ref))), covered: res.covered, droppedGroups: res.droppedGroups, groups: res.groups, joined: res.joined, keptGroups: res.keptGroups }
    report.push(`| \`${lang}/${name}\` | ${Object.entries(res.count).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(', ')} |`)
    if (kind === 'stats') for (const c of newClashes(res.list, ours, parseNdjson(theirs))) clashes.push(`${lang}: ${c}`)
    // read() drops carriage returns; files are written with \n, like upstream's.
    if (text !== (oursText ?? '')) {
      fs.writeFileSync(file, text)
      changed.push(rel)
    }
  }
}

const strings = LANGUAGES.map(lang => `${DATA}/${lang}/${STRINGS}`).filter(rel => {
  const theirs = read(path.join(UPSTREAM, rel))
  const seen = seenCopy(rel)
  return theirs != null && seen != null && theirs.trim() !== seen.trim()
})

let commits = []
try {
  commits = git('log', '--format=%h %ad %s', '--date=short', `${state.seen}..HEAD`).split('\n').filter(Boolean)
} catch {
  // The last seen commit is gone from upstream's history: show the latest.
  commits = git('log', '--format=%h %ad %s', '--date=short', '-20').split('\n').filter(Boolean)
}

const out = process.env.GITHUB_OUTPUT
const say = (line) => { if (out) fs.appendFileSync(out, line + '\n'); else console.log(line) }

if (!changed.length) {
  say('changed=false')
  console.log(`Upstream ${head.slice(0, 7)}: item and stat data unchanged. ${commits.length} new upstream commits.`)
} else {
  execFileSync(process.execPath, [path.join(ROOT, 'renderer/src/assets/bump-data-version.mjs')], { stdio: 'inherit' })
  fs.writeFileSync(STATE, JSON.stringify({ ...state, seen: head }, null, 2) + '\n')
  const version = JSON.parse(fs.readFileSync(path.join(ROOT, DATA, 'data-version.json'), 'utf8')).version
  const body = [
    `Upstream [${state.repo}](https://github.com/${state.repo}) changed its item data (at ${head.slice(0, 7)}).`,
    `Merging this makes it data version ${version}; players' apps pick it up without a release.`,
    '',
    '### Files',
    ...changed.map(f => `- \`${f}\``),
    '',
    `### Upstream commits since ${state.seen.slice(0, 7)}`,
    'Code changes here are not copied. Merge league parser fixes among them in a pull request of their own: this branch is rebuilt from master whenever upstream changes again.',
    '',
    ...(commits.length ? commits.map(c => `- ${c}`) : ['- none']),
    '',
    ...(strings.length
      ? ['### Not copied', `Upstream changed ${strings.map(f => `\`${f}\``).join(', ')}. Port it with the parser code that reads it, in a pull request of its own.`, '']
      : []),
    '### Merge',
    'Merged with ours three ways (scripts/upstream-merge.mjs): woke-only entries, entries upstream dropped and our stat refs are kept; upstream renames keep our ref with upstream\'s matchers added.',
    `Stat renames found: ${renames.size}.`,
    '',
    '| File | Entries |',
    '| --- | --- |',
    ...report,
    '',
    ...(clashes.length
      ? ['**Matching clashes this merge adds (one wording or ref on two stats). Fix before merging:**', ...clashes.slice(0, 40).map(c => `- ${c}`), '']
      : ['No new matching clashes (one wording or ref on two stats).', ''])
  ].join('\n')
  fs.writeFileSync(path.join(ROOT, '.upstream-data-pr.md'), body)
  say('changed=true')
  say(`version=${version}`)
  say(`upstream=${head.slice(0, 7)}`)
}
