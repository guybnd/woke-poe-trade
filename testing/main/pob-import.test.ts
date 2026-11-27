// Importing a shared build (main/src/woke/pob-builds.ts).
import { describe, it, expect } from 'vitest'
import zlib from 'zlib'
import { LINK_RULES, buildPathFromSettings, decodePobCode } from '../../main/src/woke/pob-builds'

const encode = (text: string) => zlib.deflateSync(Buffer.from(text)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')

describe('PoB codes', () => {
  it('reads a real code', () => {
    expect(decodePobCode(encode('<PathOfBuilding></PathOfBuilding>'))).toContain('<PathOfBuilding')
  })

  it('says plainly when pasted text is not a code', () => {
    expect(() => decodePobCode('hello there')).toThrow('not a Path of Building build')
    expect(() => decodePobCode(encode('<NotABuild/>'))).toThrow('not a Path of Building build')
  })
})

describe('build links PoB imports from', () => {
  const raw = (link: string) => {
    for (const r of LINK_RULES) {
      const m = r.re.exec(link)
      if (m) return r.raw(m[1])
    }
    return null
  }
  it('downloads from the address PoB uses (BuildSiteTools.lua)', () => {
    expect(raw('https://pobb.in/abc-1_2')).toBe('https://pobb.in/pob/abc-1_2')
    expect(raw('https://pobb.in/u/someone/abc')).toBe('https://pobb.in/pob/abc')
    expect(raw('https://poe.ninja/poe1/pob/7f3a')).toBe('https://poe.ninja/poe1/pob/raw/7f3a')
    expect(raw('https://poe.ninja/pob/7f3a')).toBe('https://poe.ninja/poe1/pob/raw/7f3a')
    expect(raw('https://maxroll.gg/poe/pob/xy12')).toBe('https://maxroll.gg/poe/api/pob/xy12')
    expect(raw('https://pob.codes/b/k9?x=1')).toBe('https://api.pob.codes/k9/raw')
    expect(raw('https://pastebin.com/Ab12')).toBe('https://pastebin.com/raw/Ab12')
    expect(raw('https://rentry.co/abc')).toBe('https://rentry.co/paste/abc/raw')
    expect(raw('https://poedb.tw/pob/q1')).toBe('https://poedb.tw/pob/q1/raw')
    expect(raw('https://example.com/pob/q1')).toBeNull()
  })
})

describe("PoB's Build save path", () => {
  it('reads Misc buildPath from Settings.xml, else none', () => {
    expect(buildPathFromSettings('<PathOfBuilding><Misc buildSortMode="NAME" buildPath="D:/My &amp; Builds/"/></PathOfBuilding>')).toBe('D:/My & Builds/')
    expect(buildPathFromSettings('<PathOfBuilding><Misc buildSortMode="NAME"/></PathOfBuilding>')).toBeNull()
    expect(buildPathFromSettings('<PathOfBuilding><Misc buildPath=""/></PathOfBuilding>')).toBeNull()
    expect(buildPathFromSettings(null)).toBeNull()
  })
})
