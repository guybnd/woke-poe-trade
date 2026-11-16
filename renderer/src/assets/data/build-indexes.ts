// Lookup tables for item and stat data the app downloaded. Bundled data gets the
// same tables as files at build time, from make-index-files.mjs; a test checks
// that the two agree.
import fnv1a from '@sindresorhus/fnv1a'
import type { BaseType, StatOrGroup } from './interfaces'

const hash = (text: string) => Number(fnv1a(text, { size: 32 }))

function toIndex (rows: Array<{ hash: number, start: number }>): Uint32Array {
  const sorted = [...rows].sort((a, b) => a.hash - b.hash)
  const index = new Uint32Array(sorted.length * 2)
  sorted.forEach((row, i) => {
    index[i * 2] = row.hash
    index[i * 2 + 1] = row.start
  })
  return index
}

function forEachLine<T> (ndjson: string, visit: (record: T, start: number) => void) {
  let start = 0
  while (start !== ndjson.length) {
    const end = ndjson.indexOf('\n', start)
    if (end === -1) throw new Error('The data does not end with a new line')
    visit(JSON.parse(ndjson.slice(start, end)) as T, start)
    start = end + 1
  }
}

export function buildItemIndexes (ndjson: string) {
  const byKey = new Map<string, { name: number, ref: number, start: number }>()
  forEachLine<BaseType>(ndjson, (item, start) => {
    const key = `${item.namespace}::${item.refName}`
    if (byKey.has(key)) return
    byKey.set(key, { name: hash(`${item.namespace}::${item.name}`), ref: hash(key), start })
  })
  const rows = [...byKey.values()]
  return {
    names: toIndex(rows.map(r => ({ hash: r.name, start: r.start }))),
    refNames: toIndex(rows.map(r => ({ hash: r.ref, start: r.start })))
  }
}

export function buildStatIndexes (ndjson: string) {
  const refs: Array<{ hash: number, start: number }> = []
  const matchers: Array<{ hash: number, start: number }> = []
  // Plain text of matchers that have an advanced form. The game's copy doesn't
  // always carry the "(A-Z)" option range the advanced form ends in (3.30
  // timeless jewels: "...in the akhara of Asenath" with no range), so these
  // are found by plain text too, unless another line already owns that text.
  const plain = new Map<number, number | null>()
  forEachLine<StatOrGroup>(ndjson, (statOrGroup, start) => {
    const stats = ('stats' in statOrGroup) ? statOrGroup.stats : [statOrGroup]
    for (const stat of stats) {
      refs.push({ hash: hash(stat.ref), start })
      for (const matcher of stat.matchers) {
        matchers.push({ hash: hash(matcher.advanced ? matcher.advanced : matcher.string), start })
        if (matcher.advanced && matcher.advanced !== matcher.string) {
          const h = hash(matcher.string)
          const seen = plain.get(h)
          plain.set(h, (seen === undefined || seen === start) ? start : null)
        }
      }
    }
  })
  const taken = new Set(matchers.map(m => m.hash))
  for (const [h, start] of plain) {
    if (start !== null && !taken.has(h)) matchers.push({ hash: h, start })
  }
  return { refs: toIndex(refs), matchers: toIndex(matchers) }
}
