// Areas opened from the map device that aren't maps you farm: the 3.30 vaults.
// They're left out of the map toast, the night's maps, its map and hideout
// time, its averages and its strip. Matched by the name the game logs on entry
// ("You have entered Zealot's Vault."), so a player can add any area by name.
//
// Reliquaries need no entry: their areas aren't Map* ones, so they never count.
// The vault area ids are MapWorldsMemoryVault1-4 (checked in a real Client.txt),
// named below so they're caught on the area line, in any client language.

export const DEFAULT_SKIP_AREAS: readonly string[] = [
  "Zealot's Vault",
  "Scholar's Vault",
  "Arkhon's Vault",
  "Machinist's Vault"
]

const norm = (name: string) => name.trim().toLowerCase().replace(/[’‘]/g, "'")

let skipped = new Set(DEFAULT_SKIP_AREAS.map(norm))
// Bumped when the list changes, for anything that caches a summary.
let version = 0

// The list in use, from the Session story settings (undefined: the defaults).
export function setSkipAreas (list: readonly string[] | undefined): void {
  skipped = new Set((list ?? DEFAULT_SKIP_AREAS).map(norm).filter(Boolean))
  version++
}

export function isSkippedArea (name: string | null | undefined): boolean {
  return !!name && skipped.has(norm(name))
}

// The vaults' names by area id, so they're known from the area line itself,
// before (or without) the English "You have entered" line.
const AREA_NAMES: Record<string, string> = {
  MapWorldsMemoryVault1: "Machinist's Vault",
  MapWorldsMemoryVault2: "Zealot's Vault",
  MapWorldsMemoryVault3: "Arkhon's Vault",
  MapWorldsMemoryVault4: "Scholar's Vault"
}
export function knownAreaName (areaId: string): string | null {
  return AREA_NAMES[areaId] ?? null
}

export function skipVersion (): number { return version }

// "Zealot's Vault, Scholar's Vault" or one per line, as typed in Settings.
export function parseSkipAreas (text: string): string[] {
  const out: string[] = []
  for (const part of text.split(/[,\n]/)) {
    const name = part.trim()
    if (name && !out.some(n => norm(n) === norm(name))) out.push(name)
  }
  return out
}
