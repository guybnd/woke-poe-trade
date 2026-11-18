// What a pull request needs to test, from the files it changes (one per line
// on stdin): the overlay specs (testing/e2e/scope.json) and the renderer files
// whose unit tests to run (vitest related). "all" when a change reaches
// shared code. Master and releases run everything and never ask this.
//   git diff --name-only origin/master... | node testing/tools/ci-scope.mjs
// prints {"e2e": "all" | ["a.spec.ts", ...], "unit": "all" | ["src/x.ts", ...]}
// with unit paths relative to renderer/, as vitest there takes them.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const SCOPE = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../e2e/scope.json', import.meta.url)), 'utf8'))

// Unit tests that read source files instead of importing them (font sizes,
// panel tags, the dock order, the README's module table): vitest related can't
// trace them, so a pull request that changes renderer code always runs them.
export const SCANS = [
  'test/woke/app-icon.test.ts', 'test/woke/cluster-graph.test.ts', 'test/woke/dock-order.test.ts',
  'test/woke/filter-tag-words.test.ts', 'test/woke/live-data.test.ts', 'test/woke/panel-drag.test.ts',
  'test/woke/panel-opacity.test.ts', 'test/woke/readme.test.ts', 'test/woke/text-scale.test.ts'
]

// Changes no test can see. README.md is read by readme.test.ts.
const IGNORED = [/^docs\//, /^(?!README\.md$).*\.md$/, /^testing\/fixtures\/screens\/frames\//, /^testing\/e2e\/landing-/, /^testing\/e2e\/demo-record/]

export function scope (files, scopeDoc = SCOPE) {
  files = files.map(f => f.trim().replace(/\\/g, '/')).filter(f => f && !IGNORED.some(r => r.test(f)))
  return { e2e: e2eScope(files, scopeDoc), unit: unitScope(files) }
}

function e2eScope (files, doc) {
  const picked = new Set()
  for (const f of files) {
    // Unit tests and main's own tests (run with the OCR job in full) touch nothing the overlay runs.
    if (/^renderer\/test\/|^testing\/main\/|^testing\/vision\//.test(f) || f === 'README.md') continue
    const spec = /^testing\/e2e\/([^/]+\.spec\.ts)$/.exec(f)
    if (spec) { picked.add(spec[1]); continue }
    const specs = Object.entries(doc.specs).filter(([, paths]) => paths.some(p => p.endsWith('/') ? f.startsWith(p) : f === p))
    if (!specs.length) return 'all'
    for (const [s] of specs) picked.add(s)
  }
  if (!picked.size) return []
  for (const s of doc.smoke) picked.add(s)
  return [...picked].sort()
}

function unitScope (files) {
  const related = new Set()
  for (const f of files) {
    if (/^testing\/(main|vision|e2e|tools)\//.test(f)) continue
    if (f === 'README.md') { related.add('test/woke/readme.test.ts'); continue }
    if (/^(renderer\/src|main\/src|ipc)\//.test(f) || /^renderer\/test\/.*\.test\.ts$/.test(f)) {
      related.add(path.posix.relative('renderer', f))
      continue
    }
    // Test helpers and setup, data, config, packages: everything.
    return 'all'
  }
  if ([...related].some(f => !f.startsWith('test/'))) SCANS.forEach(f => related.add(f))
  return [...related].sort()
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = fs.readFileSync(0, 'utf8')
  console.log(JSON.stringify(scope(input.split('\n'))))
}
