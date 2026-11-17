// The editor parses each NeverSink text once and composes on copies of it.
import { describe, expect, it } from 'vitest'
import { cloneDoc, parseFilter, parseFilterCopy, serializeFilter } from '@/web/woke/loot-filter/parse'
import { neverSink } from '../helpers/neversink'

describe('parseFilterCopy', () => {
  const text = neverSink('4-VERY-STRICT')

  it('equals a fresh parse, and writes the same file', () => {
    const fresh = parseFilter(text)
    const copy = parseFilterCopy(text)
    expect(copy).toEqual(fresh)
    expect(serializeFilter(copy)).toBe(serializeFilter(fresh))
  })

  it('keeps chunks and blocks pointing at the same block objects', () => {
    const copy = parseFilterCopy(text)
    const inChunks = copy.chunks.filter(c => c.kind === 'block')
    expect(inChunks.length).toBe(copy.blocks.length)
    expect(inChunks.every((c, i) => c === copy.blocks[i])).toBe(true)
  })

  it('never lets a change to one copy reach the next', () => {
    const fresh = parseFilter(text)
    const a = parseFilterCopy(text)
    const b = a.blocks.find(x => x.conditions.length && x.actions.length)!
    b.conditions[0].values.push('Changed')
    b.actions[0].args.push('Changed')
    b.dirty = true
    a.blocks.splice(0, 1)
    expect(parseFilterCopy(text)).toEqual(fresh)
    expect(cloneDoc(fresh)).toEqual(fresh)
  })
})
