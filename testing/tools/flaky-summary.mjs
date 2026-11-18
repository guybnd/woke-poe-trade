// Markdown list of the flaky and failed tests in a Playwright JSON report,
// for the GitHub job summary. A retry turns a flaky test green, so without
// this a run only says how many there were.
//   node tools/flaky-summary.mjs report/results.json >> "$GITHUB_STEP_SUMMARY"
import fs from 'fs'

const file = process.argv[2]
if (!file) {
  console.error('usage: node tools/flaky-summary.mjs <results.json>')
  process.exit(2)
}
const report = JSON.parse(fs.readFileSync(file, 'utf8'))

const found = { flaky: [], unexpected: [] }
function walk (suite) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      if (test.status in found) found[test.status].push(`\`${spec.file}:${spec.line}\` ${spec.title}`)
    }
  }
  for (const child of suite.suites ?? []) walk(child)
}
for (const suite of report.suites ?? []) walk(suite)

const out = ['### Fake-game tests', '']
if (!found.flaky.length && !found.unexpected.length) out.push('No flaky or failed tests.')
if (found.unexpected.length) out.push(`**Failed (${found.unexpected.length})**`, '', ...found.unexpected.map(t => `- ${t}`), '')
if (found.flaky.length) out.push(`**Flaky: passed only on a retry (${found.flaky.length})**`, '', ...found.flaky.map(t => `- ${t}`), '')
console.log(out.join('\n'))
