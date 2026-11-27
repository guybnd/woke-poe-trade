// Hand-set patch and league facts go stale each league and nothing else
// flags them (Guy's pick, 2026-11-26). These fail on purpose once a date has
// passed, so the next league's bump isn't forgotten.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GAME_PATCH } from '@/web/woke/shared/library'
import { NEXT_LEAGUE } from '@/web/woke/search/lookups/answers'

const DAY = 86_400_000
// Leagues run about 13 to 17 weeks; past this the next one has started.
const LEAGUE_DAYS = 125

const minor = (patch: string) => Number(patch.split('.')[1])

describe('hand-set league facts', () => {
  it('GAME_PATCH has caught up with a league that started', () => {
    if (NEXT_LEAGUE.startsAt <= Date.now()) expect(GAME_PATCH, 'raise GAME_PATCH (shared/library.ts) to the new league').toBe(NEXT_LEAGUE.patch)
  })

  it('the league in NEXT_LEAGUE is not over', () => {
    const age = (Date.now() - NEXT_LEAGUE.startsAt) / DAY
    expect(age, `${NEXT_LEAGUE.name} started ${Math.round(age)} days ago: set NEXT_LEAGUE (search/lookups/answers.ts) and GAME_PATCH to the next league`).toBeLessThan(LEAGUE_DAYS)
  })

  it('Stacked Deck weights are at most one patch behind', () => {
    const weights = JSON.parse(readFileSync(join(__dirname, '../../src/web/woke/stacked-decks/pl-weights.json'), 'utf8')) as { patch: string }
    expect(minor(GAME_PATCH) - minor(weights.patch), `pl-weights.json is for ${weights.patch}: refresh it from the Prohibited Library sheet`).toBeLessThanOrEqual(1)
  })
})
