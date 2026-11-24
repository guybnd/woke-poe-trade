// Guy's rule: every row naming an item shows the item tooltip on hover. The
// fake-game tests check what they render (testing/e2e/tip-audit.ts), finding
// rows by `data-item-tip`; this checks the source for what they can't see.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function vueFiles (dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) return vueFiles(p)
    return name.endsWith('.vue') ? [p] : []
  })
}

const SRC = path.resolve(__dirname, '../../src/web')
const files = vueFiles(SRC).map(f => ({ file: path.relative(SRC, f).replace(/\\/g, '/'), text: readFileSync(f, 'utf8') }))

// The start tag around a position in a template: from its `<` to its `>`.
// Template expressions here hold `=>` but no `<`.
function startTag (text: string, at: number): string {
  const open = text.lastIndexOf('<', at)
  const close = text.indexOf('>', text.indexOf('"', at + 1) + 1)
  return text.slice(open, close + 1)
}

describe('item tooltip rule', () => {
  it('an element showing an item tooltip by hand carries data-item-tip', () => {
    const missing: string[] = []
    for (const { file, text } of files) {
      const template = text.slice(0, text.indexOf('<script') >= 0 ? text.indexOf('<script') : undefined)
      for (const m of template.matchAll(/@mouseenter="[^"]*showTip(?:At)?\([^"]*kind: 'item'/g)) {
        if (!startTag(template, m.index).includes('data-item-tip')) {
          missing.push(`${file}:${template.slice(0, m.index).split('\n').length}`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('Net worth\'s Best chip and the chart\'s sold names show the item tooltip', () => {
    const src = (f: string) => files.find(x => x.file === f)!.text
    expect(src('woke/net-worth/NetWorthPanel.vue')).toMatch(/<span v-item-tip="[^"]+">\{\{ best\.name \}\}<\/span>/)
    const chart = src('woke/net-worth/LedgerChart.vue')
    expect(chart).toMatch(/Sold: <template v-for="\(x, i\) in shownSales\.list"[^>]*><span v-item-tip="x\.tip[^"]*">\{\{ x\.text \}\}/)
    expect(src('woke/net-worth/NetWorthPanel.vue')).toMatch(/const chartSales = [\s\S]{0,200}?tip: saleTip\(s\)/)
  })

  it('every data-no-item-tip says why', () => {
    const bare: string[] = []
    for (const { file, text } of files) {
      for (const m of text.matchAll(/data-no-item-tip(?:="([^"]*)")?/g)) {
        if (!m[1]?.trim()) bare.push(`${file}:${text.slice(0, m.index).split('\n').length}`)
      }
    }
    expect(bare).toEqual([])
  })
})
