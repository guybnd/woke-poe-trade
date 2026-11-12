// Betrayal members: what each gives in each division, priced like the
// League mechanics tool does. Search by name or by a reward ("veiled").
import { DIVISIONS, MEMBERS, REWARDS, priceReward } from '../../mechanics/betrayal'
import { MECHANICS_TYPE } from '../../mechanics/widget'
import { matchRank } from '../search'
import type { PriceItem } from '../../market/types'
import type { Lookup, LookupCard, LookupContext, LookupRow } from './types'

export function memberCard (member: string, ctx: LookupContext, overrides: Record<string, string> = {}): LookupCard {
  const rows: LookupRow[] = DIVISIONS.map((division, di) => {
    const reward = overrides[`${member}|${di}`]?.trim() || REWARDS[member][di]
    const priced = priceReward(reward, ctx.items as PriceItem[])
    return { label: `${division}: ${reward}`, ...(priced.chaos != null ? { chaos: priced.chaos } : {}) }
  })
  return {
    id: `betrayal:${member}`,
    group: 'Betrayal',
    name: member,
    sub: `Betrayal · Research: ${overrides[`${member}|2`]?.trim() || REWARDS[member][2]}`,
    icon: 'fas fa-user-secret',
    sections: [
      { label: 'Rewards as safehouse leader', rows },
      { text: ['Prices are the typical item of that kind on poe.ninja. Edit a slot in League mechanics if a patch changed it.'] }
    ],
    actions: ctx.tools.has(MECHANICS_TYPE) ? [{ label: 'Open League mechanics', tool: MECHANICS_TYPE }] : [{ label: 'poedb', url: 'https://poedb.tw/us/Immortal_Syndicate' }]
  }
}

export function betrayalLookup (overrides: () => Record<string, string> = () => ({})): Lookup {
  return (query, ctx) => {
    const q = query.trim()
    if (q.length < 3) return []
    const over = overrides()
    const byName = MEMBERS.filter(m => { const r = matchRank(m, q); return r >= 0 && r < 2 })
    // A reward: "veiled", "tainted", "fracture". Four letters, a word start.
    const byReward = q.length >= 4
      ? MEMBERS.filter(m => !byName.includes(m) && REWARDS[m].some((r, di) => {
          const k = matchRank(over[`${m}|${di}`]?.trim() || r, q)
          return k >= 0 && k < 2
        }))
      : []
    return [...byName, ...byReward].slice(0, 4).map(m => memberCard(m, ctx, over))
  }
}
