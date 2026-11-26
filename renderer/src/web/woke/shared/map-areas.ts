// Which areas are maps, from Client.txt area ids ("MapWorldsStrand"). Used by
// Session story, Map history, Net worth, Drop counter, Death recap and the loot filter.
import { isBossArea } from './boss-areas'

// Session story's skip list (the 3.30 vaults), by area id, handed in when
// that module loads so its code stays out of startup JS; until then the vaults.
// Areas added to the list by name are left out in Session story only.
let skipArea = (areaId: string) => /^MapWorldsMemoryVault\d$/.test(areaId)
export function setAreaSkip (check: (areaId: string) => boolean): void { skipArea = check }

// A map you farm: not on the skip list.
export function isFarmedMap (areaId: string): boolean {
  return isMapArea(areaId) && !skipArea(areaId)
}

// Endgame maps are generated with an area id starting with "Map"
// (e.g. "MapWorldsStrand"); hideouts, towns and campaign areas are not, and
// neither are pinnacle boss arenas (MapWorldsShapersRealm...).
export function isMapArea (areaId: string): boolean {
  return /^Map/i.test(areaId) && !/hideout/i.test(areaId) && !isBossArea(areaId) && !isMapSideArea(areaId)
}

// Areas you reach from inside a map: Vaal side areas, abyssal depths, trials
// of ascendancy, Settlers' fallen stars (prefixes as Exile-UI's map tracker
// has them), and encounters a map opens. Time there is map time, but they
// aren't new maps: counting the side area also made the map count again on the way back.
export function isMapSideArea (areaId: string): boolean {
  return /^(MapSideArea|AbyssLeague|EndGame_Labyrinth_Trials|SettlersBossFallenStar|MapAtlasEncounter)/i.test(areaId)
}

// "MapWorldsStrand" -> "Strand", "MapAtlasCemetery" -> "Cemetery".
export function mapNameFromArea (areaId: string): string {
  const rest = areaId.replace(/^Map(Worlds|Atlas)?/i, '').replace(/_/g, ' ')
  return rest.replace(/([a-z])([A-Z])/g, '$1 $2').trim() || areaId
}

// Whether entering this map is a new map (not the same instance again).
// Records it as counted when it is.
export function countNewMap (s: { lastMapInstance?: string }, areaId: string, seed: string | undefined): boolean {
  // Without a seed (older clients) every entry counts, as before.
  if (!seed) return true
  const key = `${areaId}:${seed}`
  if (s.lastMapInstance === key) return false
  s.lastMapInstance = key
  return true
}
