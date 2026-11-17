// The Covetous Dark (3.30): a wrapped two-line mod, a 100% chance written with
// no number, and a stat the trade site added after the league started.
import { beforeAll, describe, expect, it } from 'vitest'
import { parseClipboard } from '@/parser'
import { pastedItemText } from '@/web/woke/search/pasted-item'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

const REFS = [
  '#% chance to Blind Enemies on hit',
  'Gain a random Shrine Buff for # seconds when you Blind a\nnon-Blinded Rare or Unique Enemy',
  'Attacks with this Weapon have #% chance to deal Triple Damage'
]

describe('The Covetous Dark', () => {
  it("reads every mod of the game's own copy", () => {
    const item = parseClipboard(`Item Class: Claws
Rarity: Unique
The Covetous Dark
Eye Gouger
--------
Claw
Quality: +20% (augmented)
Physical Damage: 104-219 (augmented)
--------
Item Level: 84
--------
{ Unique Modifier — Damage, Physical, Attack }
120(100-140)% increased Physical Damage
{ Unique Modifier — Damage, Physical, Attack }
Adds 41(35-45) to 58(50-60) Physical Damage
{ Unique Modifier }
Blind Enemies on Hit
{ Unique Modifier }
Gain a random Shrine Buff for 15 seconds when you Blind a
non-Blinded Rare or Unique Enemy
{ Unique Modifier — Damage }
Attacks with this Weapon have 30(25-35)% chance to deal Triple Damage`)._unsafeUnwrap()
    expect(item.unknownModifiers).toEqual([])
    const refs = item.statsByType.map(s => s.stat.ref)
    for (const ref of REFS) expect(refs).toContain(ref)
    expect(item.statsByType.find(s => s.stat.ref === REFS[0])!.sources[0].contributes!.value).toBe(100)
  })

  it('reads every mod of a plain copy pasted from poe.ninja', () => {
    const item = parseClipboard(pastedItemText(`Rarity: Unique
The Covetous Dark
Eye Gouger
--------
Quality: +20%
--------
Item Level: 84
--------
120% increased Physical Damage
Adds 41 to 58 Physical Damage
Blind Enemies on Hit
Gain a random Shrine Buff for 15 seconds when you Blind a
non-Blinded Rare or Unique Enemy
Attacks with this Weapon have 30% chance to deal Triple Damage`)!)._unsafeUnwrap()
    expect(item.unknownModifiers).toEqual([])
    const refs = item.statsByType.map(s => s.stat.ref)
    for (const ref of REFS) expect(refs).toContain(ref)
  })
})
