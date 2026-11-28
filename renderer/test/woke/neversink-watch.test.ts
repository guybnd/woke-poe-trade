// The NeverSink upstream watch (scripts/neversink-watch.mjs): what changed
// between two versions of his filter, for us to read. It never applies them.
import { describe, expect, it } from 'vitest'

const SCRIPT = '../../../scripts/neversink-watch.mjs'
interface Diff { added: string[], removed: string[], moved: Array<{ n: string, joined: string[], left: string[] }>, newBlocks: string[], goneBlocks: string[], newConds: string[] }
interface Script {
  parse: (text: string) => unknown
  compare: (a: unknown, b: unknown) => Diff
  report: (a: string, b: string, d: Diff) => { md: string, changed: boolean }
}
const load = async () => await import(/* @vite-ignore */ SCRIPT) as Script

const OLD = `# VERSION:  1.0
Show # $type->currency $tier->t1
\tBaseType == "Divine Orb" "Mirror of Kalandra"
\tSetFontSize 45
Show # $type->currency $tier->t2
\tBaseType == "Chaos Orb" "Old Orb"
`
const NEW = `# VERSION:  1.1
Show # $type->currency $tier->t1
\tBaseType == "Divine Orb" "Mirror of Kalandra" "Chaos Orb"
\tSetFontSize 45
Show # $type->currency $tier->t2
\tBaseType == "New Orb"
\tStackSize >= 3
Show # $type->currency $tier->t3
\tBaseType == "Mirror of Kalandra"
`

describe('NeverSink watch', () => {
  it('names new and gone items, retiers, new blocks and new conditions', async () => {
    const { parse, compare } = await load()
    const d = compare(parse(OLD), parse(NEW))
    expect(d.added).toEqual(['New Orb'])
    expect(d.removed).toEqual(['Old Orb'])
    expect(d.moved).toEqual([
      { n: 'Chaos Orb', joined: ['currency/t1'], left: ['currency/t2'] },
      { n: 'Mirror of Kalandra', joined: ['currency/t3'], left: [] }
    ])
    expect(d.newBlocks).toEqual(['currency/t3'])
    expect(d.goneBlocks).toEqual([])
    expect(d.newConds).toEqual(['StackSize'])
  })

  it('says so when nothing changed', async () => {
    const { parse, compare, report } = await load()
    const r = report('1.0', '1.0', compare(parse(OLD), parse(OLD)))
    expect(r.changed).toBe(false)
    expect(r.md).toContain('No item, tier or rule changes')
    expect(r.md).toContain('nothing here is applied to our filter')
  })
})
