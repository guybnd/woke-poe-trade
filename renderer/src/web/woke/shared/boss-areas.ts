// Pinnacle boss arenas: one table by area id (the "Generating level N area"
// line, the ids Exile-UI's map tracker uses) and by the "You have entered"
// name, with the Boss runs entries each can hold. Most area ids are Map*
// ids, so without this a boss fight counted as a map in a farming session.
// No IPC imports, so farming.ts can use it. Add a row (or a name) when a
// fight isn't recognised. bosses [] = a boss fight with no Boss runs entry.
// Names aren't unique: The Shaper's Realm is also the Uber Elder's arena
// (MapWorldsElderArenaUber in real logs), so an area id always beats a name.
interface Arena {
  areaIds: string[]
  names: string[]
  bosses: string[]
}

const ARENAS: Arena[] = [
  { areaIds: ['MapAtziri1'], names: ['The Apex of Sacrifice'], bosses: ['atziri'] },
  { areaIds: ['MapAtziri2'], names: ['The Alluring Abyss'], bosses: ['uber-atziri'] },
  { areaIds: ['MapWorldsShapersRealm'], names: ["The Shaper's Realm"], bosses: ['shaper', 'uber-shaper'] },
  { areaIds: ['MapWorldsElderArena'], names: [], bosses: [] },
  { areaIds: ['MapWorldsElderArenaUber'], names: ['Absence of Value and Meaning'], bosses: ['uber-elder', 'uber-uber-elder'] },
  { areaIds: ['MapWorldsPrimordialBoss1'], names: [], bosses: [] },
  { areaIds: ['MapWorldsPrimordialBoss2'], names: [], bosses: [] },
  { areaIds: ['MapWorldsPrimordialBoss3'], names: ['Absence of Patience and Wisdom'], bosses: ['exarch', 'uber-exarch'] },
  { areaIds: ['MapWorldsPrimordialBoss4'], names: ['Absence of Symmetry and Harmony'], bosses: ['eater', 'uber-eater'] },
  // The Maven's own fight.
  { areaIds: ['MavenBoss'], names: ['Absence of Mercy and Empathy'], bosses: ['maven', 'uber-maven'] },
  // Maven's Invitations, not the Maven fight.
  { areaIds: ['MavenHub'], names: ["The Maven's Crucible"], bosses: ['feared'] },
  { areaIds: ['AtlasExilesBoss5'], names: ['Eye of the Storm'], bosses: ['uber-sirus'] },
  { areaIds: ['Synthesis_MapBoss'], names: ['Cortex'], bosses: ['uber-cortex'] },
  { areaIds: [], names: ['The Feared'], bosses: ['feared'] },
  // The Infinite Hunger and The Black Star.
  { areaIds: [], names: ['Seething Chyme', 'Polaric Void'], bosses: [] }
]

// By lower-cased area id.
export const BOSS_AREAS: Record<string, string[]> = Object.fromEntries(
  ARENAS.flatMap(a => a.areaIds.map(id => [id.toLowerCase(), a.bosses])))

// By "You have entered" name.
export const BOSS_ARENAS: Record<string, string[]> = Object.fromEntries(
  ARENAS.flatMap(a => a.names.map(n => [n, a.bosses])))

export function bossAreaIds (areaId: string): string[] | undefined {
  return BOSS_AREAS[areaId.toLowerCase()]
}

export function isBossArea (areaId: string): boolean {
  return bossAreaIds(areaId) != null
}
