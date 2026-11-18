import { uniquesOnBase } from '../shared/uniques-on-base'
import { dropOf } from '../ui/tooltip/tip-content'
import type { TipPack } from '../ui/tooltip/tip-content'

// The uniques on a base that can drop at random: a boss-only, league or
// recipe unique (the wiki's drop data) never turns up as a random drop, so
// its price mustn't keep the base shown or set its tier. Until the data has
// loaded, or if it can't, every unique counts as before.
export function randomDropsOnBase (drops: TipPack['drops'] | null | undefined): (base: string) => string[] {
  if (!drops) return uniquesOnBase
  return base => uniquesOnBase(base).filter(name => {
    const d = dropOf(drops, name)
    return !d?.d && !d?.r
  })
}
