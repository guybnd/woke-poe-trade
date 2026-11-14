// Parses the Client.txt lines that APT's GameLogWatcher already streams.
// English client lines only.

export type LogEvent =
  // seed: the instance's seed. Re-entering the same instance (through a
  // portal from the hideout, say) logs the same seed again.
  { kind: 'area', areaId: string, areaLevel: number, seed?: string } |
  { kind: 'zone', name: string } |
  { kind: 'level', charName: string, className: string, level: number }

const AREA_RE = /Generating level (\d+) area "([^"]+)"(?: with seed (\d+))?/
const ZONE_RE = /\] : You have entered (.+?)\.?$/
const LEVEL_RE = /\] : (\S+) \(([^)]+)\) is now level (\d+)\s*$/

export function parseLogLine (line: string): LogEvent | null {
  let m = AREA_RE.exec(line)
  if (m) return { kind: 'area', areaLevel: Number(m[1]), areaId: m[2], seed: m[3] }
  m = ZONE_RE.exec(line)
  if (m) return { kind: 'zone', name: m[1] }
  m = LEVEL_RE.exec(line)
  if (m) return { kind: 'level', charName: m[1], className: m[2], level: Number(m[3]) }
  return null
}

// The name before the ": " on a spoken line ("... [INFO Client 1] Merveil: ...").
// Channel prefixes (#, $, &, %, @) mark player chat.
const SPEAKER_RE = /\] ([^:#$&%@\]][^:\]]*): /

export function speakerOf (line: string): string | null {
  return SPEAKER_RE.exec(line)?.[1] ?? null
}

// Izaro says one line when a Trial of Ascendancy is finished: one line per
// trial, the same each time, and the same for the act 6-10 and endgame lab
// copies of that trial. In a campaign zone he says nothing else, and nothing
// when you only step into the trial (checked on a real Client.txt: 6 trials
// x 10 characters, one line each, none on a 2 s visit).
export const TRIAL_DONE_LINES: readonly string[] = [
  'Belief is the strongest metal of them all.',
  'There is a fine line between consideration and hesitation. The former is wisdom, the latter is fear.',
  'Shine boldly so that all might find you when the night falls.',
  'Allow your wisdom to be tempered by the flames of the past.',
  'An emperor must bear two blades. Hope in the left hand. Surety in the right.',
  'An emperor must know precisely where he stands.'
]
const TRIAL_DONE = new Set(TRIAL_DONE_LINES)
const IZARO_RE = /\] Izaro: (.+?)\s*$/

export function isTrialFinished (line: string): boolean {
  const m = IZARO_RE.exec(line)
  return m != null && TRIAL_DONE.has(m[1])
}

// Campaign area ids look like "1_3_7" or "2_6_town": the second number is
// the act (1-10, 11 = epilogue). Maps, hideouts etc. return null.
export function actFromAreaId (areaId: string): number | null {
  const m = /^(\d+)_(\d+)_/.exec(areaId)
  if (!m) return null
  const act = Number(m[2])
  return act >= 1 && act <= 11 ? act : null
}

export function isTown (areaId: string): boolean {
  return /_town$/i.test(areaId)
}

// Safe hubs that work like a town (stash, no monsters): hideouts, Rogue
// Harbour, the Menagerie, the Sanctum foyer and the abyss hub. Same list as
// Exile-UI's town check.
export function isTownLike (areaId: string): boolean {
  return isTown(areaId) || /hideout|heisthub|menagerie|sanctumfoyer|abyss_hub/i.test(areaId)
}

export function actLabel (act: number | null): string {
  if (act == null) return ''
  return act === 11 ? 'Epilogue' : `Act ${act}`
}
