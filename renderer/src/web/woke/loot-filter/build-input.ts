// The active build, boiled down to what the loot filter's build rules need.
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { ITEM_BY_REF } from '@/assets/data'
import { useActiveBuild } from '../pob-builds/active'
import { buildFacts, linkColours, loadoutOf, mainGroupOf } from '../pob-builds/build-model'
import { CATEGORY_CLASSES } from './build-rules'
import type { BuildRuleInput } from './build-rules'

export function weaponClassesOf (bases: string[]): string[] {
  const out: string[] = []
  for (const base of bases) {
    const category = ITEM_BY_REF('ITEM', base)?.[0]?.craftable?.category
    for (const c of (category && CATEGORY_CLASSES[category]) || []) if (!out.includes(c)) out.push(c)
  }
  return out
}

export function useBuildRuleInput (): ComputedRef<BuildRuleInput | null> {
  const build = useActiveBuild()
  return computed(() => {
    const d = build.details.value
    if (!d) return null
    const level = build.level.value
    const act = build.act.value
    const pick = build.loadout.value
    const facts = buildFacts(d, level, act, pick)
    const set = loadoutOf(d, level, act, pick).skillSet?.item
    const main = set ? mainGroupOf(set.groups) : null
    const name = (build.relPath.value ?? '').split('/').pop()!.replace(/\.xml$/i, '')
    return {
      buildName: name || d.mainSkill || 'build',
      gems: facts.gems,
      linkColours: main ? linkColours(main) : [],
      uniqueBases: [...new Set(facts.uniques.map(u => u.base).filter(Boolean))],
      rareBases: facts.bases.map(b => b.base),
      weaponClasses: weaponClassesOf(facts.weaponBases)
    }
  })
}
