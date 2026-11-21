// Areas opened from the map device that aren't maps you farm: the 3.30 vaults.
// They're left out of the map toast, the night's maps, its map and hideout
// time, its averages and its strip. Matched by the name the game logs on entry
// ("You have entered Zealot's Vault."), so a player can add any area by name.
//
// Reliquaries need no entry: their areas aren't Map* ones, so they never count.
// The vault area ids are MapWorldsMemoryVault1-4 (checked in a real Client.txt).

export const DEFAULT_SKIP_AREAS: readonly string[] = [
  "Zealot's Vault",
  "Scholar's Vault",
  "Arkhon's Vault",
  "Machinist's Vault"
]

const norm = (name: string) => name.trim().toLowerCase().replace(/[’‘]/g, "'")

let skipped = new Set(DEFAULT_SKIP_AREAS.map(norm))

// The list in use, from the Session story settings (undefined: the defaults).
export function setSkipAreas (list: readonly string[] | undefined): void {
  skipped = new Set((list ?? DEFAULT_SKIP_AREAS).map(norm).filter(Boolean))
}

export function isSkippedArea (name: string | null | undefined): boolean {
  return !!name && skipped.has(norm(name))
}

// "Zealot's Vault, Scholar's Vault" or one per line, as typed in Settings.
export function parseSkipAreas (text: string): string[] {
  const out: string[] = []
  for (const part of text.split(/[,\n]/)) {
    const name = part.trim()
    if (name && !out.some(n => norm(n) === norm(name))) out.push(name)
  }
  return out
}
