// 3.30 folds a long option list in the advanced copy to "(...)".
import { beforeAll, describe, expect, it } from 'vitest'
import { parseClipboard } from '@/parser'
import { ModifierType } from '@/parser/modifiers'
import { tryParseTranslation } from '@/parser/stat-translations'
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

describe('folded option lists on random gems', () => {
  it('keeps a random support apart from the fixed support with the same words', () => {
    const fixed = tryParseTranslation({ string: 'Socketed Gems are Supported by Level 20 Added Chaos Damage', unscalable: false }, ModifierType.Explicit, undefined)
    const folded = tryParseTranslation({ string: 'Socketed Gems are Supported by Level 20 Added Chaos Damage(...)', unscalable: false }, ModifierType.Explicit, undefined)
    const full = tryParseTranslation({ string: 'Socketed Gems are Supported by Level 20 Added Chaos Damage(Greater Multiple Projectiles-Hallow)', unscalable: false }, ModifierType.Explicit, undefined)
    expect(full).toBeDefined()
    expect(folded!.stat.trade.ids.explicit).toEqual(full!.stat.trade.ids.explicit)
    expect(fixed!.stat.trade.ids.explicit).not.toEqual(full!.stat.trade.ids.explicit)
  })

  it('reads a folded random skill gem level', () => {
    const folded = tryParseTranslation({ string: '+2 to Level of all Raise Spectre(...) Gems', unscalable: false }, ModifierType.Explicit, undefined)
    expect(folded!.stat.trade.ids.explicit).toEqual(['explicit.indexable_skill_29'])
  })
})

describe('folded lines of another kind', () => {
  it('falls back to the normal lookup when the advanced stat has no id for the kind', () => {
    // The golem stat is explicit only: as an implicit it isn't the folded stat.
    const r = tryParseTranslation({ string: 'Maximum number of Summoned Golems(...) is Doubled\nCannot have Minions other than Summoned Golems(...)', unscalable: false }, ModifierType.Implicit, undefined)
    expect(r).toBeUndefined()
    const e = tryParseTranslation({ string: 'Maximum number of Summoned Golems(...) is Doubled\nCannot have Minions other than Summoned Golems(...)', unscalable: false }, ModifierType.Explicit, undefined)
    expect(e!.stat.trade.ids.explicit).toEqual(['explicit.stat_56473917|2'])
  })
})
