// woke: the catalyst-only part of a roll slider (Guy's pick B). An item with no
// catalyst quality reaches `plain`; the rest of the bounds only catalysed items reach.

export interface Range { min: number, max: number }

/** The slider's catalyst-only bands, as percents of the track, or [] when there are none. */
export function catalystBands (bounds: Range, plain: Range | undefined): Array<{ left: number, right: number }> {
  if (!plain || bounds.max <= bounds.min) return []
  const pct = (v: number) => Math.min(Math.max((v - bounds.min) / (bounds.max - bounds.min) * 100, 0), 100)
  const out: Array<{ left: number, right: number }> = []
  if (plain.min > bounds.min) out.push({ left: 0, right: 100 - pct(plain.min) })
  if (plain.max < bounds.max) out.push({ left: pct(plain.max), right: 0 })
  return out
}

/**
 * Whether the searched range leaves out every item without catalyst quality:
 * 'above' when the min is over what they reach, 'below' when the max is under it.
 */
export function onlyCatalysed (
  min: number | '' | undefined,
  max: number | '' | undefined,
  plain: Range | undefined,
  bounds: Range | undefined
): 'above' | 'below' | undefined {
  if (!plain || !bounds) return undefined
  // Only where a band is: past both ends, nothing matches at all.
  if (typeof min === 'number' && min > plain.max && plain.max < bounds.max && min <= bounds.max) return 'above'
  if (typeof max === 'number' && max < plain.min && plain.min > bounds.min && max >= bounds.min) return 'below'
  return undefined
}
