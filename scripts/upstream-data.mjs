// Run by .github/workflows/upstream-data.yml: copies upstream Awakened PoE
// Trade's item and stat data when it changes, bumps data-version.json, and
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

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const UPSTREAM = process.argv[2]
if (!UPSTREAM) throw new Error('Usage: node scripts/upstream-data.mjs <upstream checkout>')
const STATE = path.join(ROOT, '.github/upstream-data.json')
const LANGUAGES = ['en', 'ru', 'cmn-Hant', 'ko']
// Item and stat data reach players without a release; client_strings.js ships
// with the next one.
const FILES = ['items.ndjson', 'stats.ndjson', 'client_strings.js']
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

const changed = []
for (const lang of LANGUAGES) {
  for (const name of FILES) {
    const rel = `${DATA}/${lang}/${name}`
    const theirs = read(path.join(UPSTREAM, rel))
    if (theirs == null) continue
    // Only a file upstream itself changed is copied: our own launch-day patch
    // (scripts/trade-data-patch.mjs) must not be undone by upstream's old copy.
    const seen = seenCopy(rel)
    if (seen != null && seen.trim() === theirs.trim()) continue
    if (theirs !== read(path.join(ROOT, rel))) {
      fs.writeFileSync(path.join(ROOT, rel), theirs)
      changed.push(rel)
    }
  }
}

let commits = []
try {
  commits = git('log', '--format=%h %ad %s', '--date=short', `${state.seen}..HEAD`).split('\n').filter(Boolean)
} catch {
  // The last seen commit is gone from upstream's history: show the latest.
  commits = git('log', '--format=%h %ad %s', '--date=short', '-20').split('\n').filter(Boolean)
}

const out = process.env.GITHUB_OUTPUT
const say = (line) => { if (out) fs.appendFileSync(out, line + '\n'); else console.log(line) }

// Upstream's English files replace ours whole, so whatever our launch-day
// patch (scripts/trade-data-patch.mjs) added and upstream still lacks is run
// again on top. It only adds; a failed run (the trade site down or refusing
// the runner) leaves upstream's files as they are and says so in the PR.
function reapplyPatch () {
  if (!changed.some(f => f.startsWith(`${DATA}/en/`))) return null
  if (!fs.existsSync(path.join(ROOT, 'scripts/trade-baseline/stats.json'))) return null
  try {
    const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts/trade-data-patch.mjs'), 'apply'], { encoding: 'utf8', timeout: 180_000 })
    const lines = out.split('\n').filter(Boolean)
    const counts = lines.filter(l => /^(New|Reworded|Left out)/.test(l))
    const shown = lines.filter(l => /^\s+[+~]/.test(l)).slice(0, 40)
    return ['```', ...counts, ...shown, '```'].join('\n')
  } catch (e) {
    return `Could not run it: ${String(e.message ?? e).split('\n')[0]}. Run \`node scripts/trade-data-patch.mjs apply\` on this branch by hand.`
  }
}

if (!changed.some(f => !f.endsWith('client_strings.js'))) {
  // Only data reaching players is worth a pull request; the rest waits for one.
  for (const rel of changed) execFileSync('git', ['-C', ROOT, 'checkout', '--', rel])
  say('changed=false')
  console.log(`Upstream ${head.slice(0, 7)}: item and stat data unchanged. ${commits.length} new upstream commits.`)
} else {
  const patch = reapplyPatch()
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
    ...(patch ? ['### Our trade-site data patch, run again on top', patch, ''] : [])
  ].join('\n')
  fs.writeFileSync(path.join(ROOT, '.upstream-data-pr.md'), body)
  say('changed=true')
  say(`version=${version}`)
  say(`upstream=${head.slice(0, 7)}`)
}
