// Timeless jewels read from the PoB install (WOKEPOET-205). Runs only where
// Path of Building is installed.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { findTimelessData, parseLuaTable, readConquest, timelessRewrites } from '../../../main/src/woke/pob-timeless'

const pob = path.join(process.env.APPDATA ?? '', 'Path of Building Community', 'Data', 'TimelessJewelData')

describe('Timeless jewels', () => {
  it('reads the conqueror and seed', () => {
    expect(readConquest(['Bathed in the blood of 2500 sacrificed in the name of Xibaqua', 'Passives in radius are conquered by the Vaal'])).toEqual({ seed: 2500, type: 'vaal', id: '1' })
    expect(readConquest(['Commissioned 41720 coins to commemorate Caspiro'])).toEqual({ seed: 41720, type: 'eternal', id: '3_v2' })
    expect(readConquest(['Subjugating 300 souls in the thrall of Tecrod'])).toBeNull()
  })

  it('reads a Lua table', () => {
    expect(parseLuaTable('return { ["a"] = { [1] = "x \\"y\\"", [2] = -1.5 }, b = true, -- note\n 7, }')).toEqual({ a: { 1: 'x "y"', 2: -1.5 }, b: true, 1: 7 })
  })

  it.runIf(fs.existsSync(pob))('reads the PoB install', async () => {
    const data = (await findTimelessData())!
    expect(data.additionCount).toBe(data.additions.length)
    expect(data.nodes[76].dn).toBe('Might of the Vaal')
    expect(data.nodes[77].dn).toBe('Legacy of the Vaal')
    const tree = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/data/tree/passive-tree.json'), 'utf8'))
    const nodes = (tree.nodes as unknown[][]).map(r => ({ id: r[0] as number, kind: r[3] as string, name: r[4] as string }))
    const notable = nodes.filter(n => n.kind === 'notable' && data.index.has(n.id)).slice(0, 5)
    const small = nodes.filter(n => n.kind === 'small' && data.index.has(n.id)).slice(0, 5)
    const key = nodes.filter(n => n.kind === 'key').slice(0, 1)
    const ask = [...notable, ...small, ...key] as Array<{ id: number, kind: 'small' | 'notable' | 'key', name: string }>
    const mods = [
      'Bathed in the blood of 2500 sacrificed in the name of Xibaqua',
      'Commanded leadership over 12000 warriors under Kaom',
      'Denoted service of 4000 dekhara in the akhara of Deshret',
      'Carved to glorify 5000 new faithful converted by High Templar Avarius',
      'Commissioned 40000 coins to commemorate Cadiro',
      'Remembrancing 4000 songworthy deeds by the line of Vorana'
    ]
    const res = await timelessRewrites({ jewels: mods.map(m => ({ mods: [m], nodes: ask })) })
    expect(res.found).toBe(true)
    res.jewels.forEach((j, i) => {
      for (const n of notable) expect(j?.[n.id], `${mods[i]} / ${n.name}`).toBeTruthy()
    })
  }, 60_000)
})
