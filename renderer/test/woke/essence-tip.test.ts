// An essence tooltip's mod per slot (tooltip audit pick I6), and the Path of
// Building reader behind tips/essences.json.
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { essenceSections, slotLabel } from '@/web/woke/ui/tooltip/essence-tip'
import { essencesIn, grouped, modLines } from '../../scripts/build-essence-data.mjs'

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/data/tips/essences.json'), 'utf8'))
const text = (name: string) => essenceSections(data[name]).flat().map(l => l.map(p => p.text).join(''))

describe('essence tooltip', () => {
  it('names slot groups in words', () => {
    expect(slotLabel(['Bow', 'Claw', 'Dagger', 'One Handed Axe', 'One Handed Mace', 'One Handed Sword', 'Sceptre', 'Staff', 'Thrusting One Handed Sword', 'Two Handed Axe', 'Two Handed Mace', 'Two Handed Sword', 'Wand'])).toBe('Weapons')
    expect(slotLabel(['Boots', 'Gloves', 'Helmet'])).toBe('Boots, Gloves, Helmet')
    expect(slotLabel(['Body Armour', 'Boots', 'Gloves', 'Helmet', 'Shield', 'Quiver'])).toBe('Armour, Quiver')
  })
  it('lists what an essence forces, by slot', () => {
    const lines = text('Deafening Essence of Greed')
    expect(lines[0]).toBe('Forces one of these, by slot:')
    expect(lines.some(l => l.startsWith('Body Armour: +(') && l.endsWith('to maximum Life'))).toBe(true)
    expect(lines.some(l => l.startsWith('Weapons: '))).toBe(true)
  })
  it('has an entry for every tier of every essence', () => {
    expect(Object.keys(data).length).toBeGreaterThanOrEqual(100)
    expect(text('Essence of Hysteria').length).toBeGreaterThan(3)
  })
})

describe('essence data reader', () => {
  it('reads an essence, its mods\' lines, and groups equal slots', () => {
    const ess = essencesIn('\t["X"] = { name = "Whispering Essence of Hatred", type = 0, tier = 1, mods = { ["Belt"] = "ColdResist1", ["Boots"] = "ColdResist1", ["Ring"] = "ColdPct1", }, },')
    expect(ess).toEqual([{ name: 'Whispering Essence of Hatred', mods: { Belt: 'ColdResist1', Boots: 'ColdResist1', Ring: 'ColdPct1' } }])
    const lines = modLines('\t["ColdResist1"] = { type = "Suffix", affix = "of the Seal", "+(6-11)% to Cold Resistance", statOrder = { 1 }, level = 1 }\n\t["ColdPct1"] = { affix = "", "(3-7)% increased Cold Damage", statOrder = { 2 } }', new Set(['ColdResist1', 'ColdPct1']))
    expect(lines).toEqual({ ColdResist1: ['+(6-11)% to Cold Resistance'], ColdPct1: ['(3-7)% increased Cold Damage'] })
    expect(grouped(ess[0].mods, lines)).toEqual([[['Belt', 'Boots'], ['+(6-11)% to Cold Resistance']], [['Ring'], ['(3-7)% increased Cold Damage']]])
  })
})
