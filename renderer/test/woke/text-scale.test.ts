// The Text size setting: values read back safely, and no font size in the app
// can skip it by being written as a plain number.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { beforeAll, describe, expect, it, vi } from 'vitest'

function sources (dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) return sources(p)
    return /\.(vue|css|ts)$/.test(name) ? [p] : []
  })
}

describe('text scale', () => {
  let parse: (v: string | null) => number

  beforeAll(async () => {
    await import('vue') // before the stubs: Vue checks for a real document on load
    vi.stubGlobal('document', { documentElement: { style: { setProperty () {} } } })
    vi.stubGlobal('window', { addEventListener () {} })
    vi.stubGlobal('localStorage', { getItem: () => null, setItem () {} })
    parse = (await import('@/web/woke/ui/text-scale')).parseTextScale
  })

  it('defaults to 100 and clamps what is stored', () => {
    expect(parse(null)).toBe(100)
    expect(parse('junk')).toBe(100)
    expect(parse('125')).toBe(125)
    expect(parse('80')).toBe(80)
    expect(parse('10')).toBe(70)
    expect(parse('900')).toBe(150)
  })

  it('leaves no literal font size or line height behind', () => {
    const scaled = /calc\([0-9.]+(px|rem) \* var\(--w-text-scale, 1\)\)/g
    const literal = /(font-size|line-height):\s*[0-9.]+(px|rem)|\bfont:[^;{}]*[0-9](px|rem)|\btext-\[[0-9]/
    const offenders = sources(path.resolve(__dirname, '../../src/web'))
      .filter(f => literal.test(readFileSync(f, 'utf8').replace(scaled, 'scaled')))
    expect(offenders).toEqual([])
  })
})
