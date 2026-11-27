// How rare a unique drops, by its drop tier (tips/unique-drop-tiers.json):
// T0 the rarest to T5 the most common. The words follow the game's own
// labels on the Corrupted Precursor Beacon's rewards (Rare for T3, Very Rare
// for T2 and T1, Extremely Rare for T0).
const WORDS = ['extremely rare', 'very rare', 'very rare', 'rare', 'uncommon', 'common']

export function dropTierWord (tier: number): string {
  return WORDS[tier] ?? 'unknown'
}

// Where it stands among the uniques of its base that have a drop tier: the
// odds an Orb of Chance gives aren't known, only which ones are rarer.
export function rankOnBase (name: string, base: string, onBase: string[], tiers: Record<string, number>): string | null {
  const own = tiers[name]
  const ranked = onBase.filter(u => tiers[u] != null)
  if (own == null || ranked.length < 2 || !ranked.includes(name)) return null
  const others = ranked.filter(u => u !== name).map(u => tiers[u])
  const n = ranked.length
  if (others.every(t => t > own)) return `The rarest of the ${n} uniques on ${base}.`
  if (others.every(t => t < own)) return `The most common of the ${n} uniques on ${base}.`
  const min = Math.min(own, ...others)
  const max = Math.max(own, ...others)
  return min === max ? `All ${n} uniques on ${base} are T${own}.` : `The ${n} uniques on ${base} drop T${min} to T${max}.`
}
