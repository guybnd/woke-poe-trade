// Groups the layout audit's findings (e2e/layout-audit.ts):
//   WOKE_LAYOUT_AUDIT=.cache/layout npx playwright test
//   node tools/layout-report.mjs .cache/layout
// One line per distinct spot, grouped by rule then window, with the
// screenshot's name under <folder>/shots/.
import fs from 'node:fs'
import path from 'node:path'

const dir = process.argv[2]
if (!dir) {
  console.error('Usage: node tools/layout-report.mjs <folder WOKE_LAYOUT_AUDIT wrote to>')
  process.exit(1)
}
const seen = new Map()
for (const line of fs.readFileSync(path.join(dir, 'issues.jsonl'), 'utf8').split('\n')) {
  if (!line.trim()) continue
  const i = JSON.parse(line)
  const k = `${i.rule}|${i.widget}|${i.where}`
  if (!seen.has(k)) seen.set(k, { ...i, tests: new Set() })
  seen.get(k).tests.add(i.test.split(' › ').slice(-1)[0])
}
const byRule = new Map()
for (const i of seen.values()) {
  if (!byRule.has(i.rule)) byRule.set(i.rule, [])
  byRule.get(i.rule).push(i)
}
for (const [rule, list] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${rule} (${list.length})`)
  list.sort((a, b) => String(a.widget).localeCompare(String(b.widget)))
  for (const i of list) {
    console.log(`  ${i.widget ?? 'page'} · ${JSON.stringify(i.text.slice(0, 50))} · ${i.detail} · shots/${i.key}.png`)
    console.log(`      ${i.where}`)
  }
}
