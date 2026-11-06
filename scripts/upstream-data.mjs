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

const changed = []
for (const lang of LANGUAGES) {
  for (const name of FILES) {
    const rel = `${DATA}/${lang}/${name}`
    const theirs = read(path.join(UPSTREAM, rel))
    if (theirs == null) continue
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

if (!changed.some(f => !f.endsWith('client_strings.js'))) {
  // Only data reaching players is worth a pull request; the rest waits for one.
  for (const rel of changed) execFileSync('git', ['-C', ROOT, 'checkout', '--', rel])
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
    ''
  ].join('\n')
  fs.writeFileSync(path.join(ROOT, '.upstream-data-pr.md'), body)
  say('changed=true')
  say(`version=${version}`)
  say(`upstream=${head.slice(0, 7)}`)
}
