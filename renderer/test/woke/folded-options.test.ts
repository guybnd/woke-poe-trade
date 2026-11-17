// 3.30 folds a long option list in the advanced copy to "(...)".
import { beforeAll, describe, expect, it } from 'vitest'
import { parseClipboard } from '@/parser'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

describe('folded option lists', () => {
  it("reads The Dark Monarch's golem lines", () => {
    const item = parseClipboard(`Item Class: Helmets
Rarity: Unique
The Dark Monarch
Lich's Circlet
--------
Energy Shield: 178 (augmented)
--------
Requirements:
Level: 84
Int: 224 (unmet)
--------
Sockets: W 
--------
Item Level: 86
--------
{ Unique Modifier — Defences, Energy Shield }
+58(50-100) to maximum Energy Shield
{ Unique Modifier — Minion, Gem }
+1 to Level of all Minion Skill Gems
{ Unique Modifier — Chaos, Resistance }
+33(27-37)% to Chaos Resistance
{ Unique Modifier }
50% reduced Light Radius
{ Unique Modifier }
Maximum number of Summoned Golems(...) is Doubled
Cannot have Minions other than Summoned Golems(...) — Unscalable Value
--------
"Hate? You speak to me of hate? You have no idea what your persecution inflicts.
How it chokes the heart. Withers the soul. Judge me, and you judge yourself."
- Saresh, last words, to Sekhema Orbala
`)._unsafeUnwrap()
    expect(item.unknownModifiers).toEqual([])
    expect(item.statsByType.map(s => s.stat.ref)).toContain('Maximum number of Summoned Golems is Doubled\nCannot have Minions other than Summoned Golems')
  })
})
