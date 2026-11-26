// The poe.ninja categories whose rows are named after what prices them, not
// their item (ninja-row-tip.ts maps them). Its own file so the item tooltip
// loads that module only for these rows.
export const NINJA_ROW_TYPES = ['ForbiddenJewel', 'ClusterJewel', 'Map', 'BlightedMap', 'BlightRavagedMap', 'ValdoMap', 'IncursionTemple', 'Coffin', 'ImbuedGem', 'ShrineBelt'] as const
export type NinjaRowType = typeof NINJA_ROW_TYPES[number]

export function isNinjaRowType (type: string | undefined): type is NinjaRowType {
  return (NINJA_ROW_TYPES as readonly string[]).includes(type ?? '')
}
