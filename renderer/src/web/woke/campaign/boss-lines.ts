// Lines the game logs once a campaign boss is dead, each tied to the zone it
// is said in and the route kill step it finishes. Taken from Guy's real
// Client.txt (about 20 runs of each act, 2024-2026) and kept only where the
// line came once per kill, after the fight, with no death after it in that
// zone. Fight-start lines, lines said again mid-fight (Piety's "Kill me!")
// and lines also said elsewhere are left out: a missing line only means the
// step waits for you, a wrong one would skip it.
//
// Acts 5-10: Sin names each god as its soul goes free ("Sin: Abberath!").

export interface BossLine {
  // Area id the line is logged in (a boss arena logs no area of its own).
  area: string
  speaker: string
  text: string
  // The route kill text it finishes (the short name, see shortBossName).
  kill: string
}

export const BOSS_DONE_LINES: readonly BossLine[] = [
  // Act 3
  { area: '1_3_18_2', speaker: 'Dominus', text: 'This world is an illusion, exile.', kill: 'Dominus' },
  // Act 4
  { area: '1_4_5_2', speaker: 'Daresso', text: 'A King of Swords is nothing if he cannot defend his crown.', kill: 'Daresso' },
  // Piety after the Bowels fight: one line per class, only those seen so far.
  { area: '1_4_6_2', speaker: 'Piety', text: 'Well done, assassin. Another satisfied customer.', kill: 'Piety' },
  { area: '1_4_6_2', speaker: 'Piety', text: 'I may have misjudged that God of yours...', kill: 'Piety' },
  { area: '1_4_6_2', speaker: 'Piety', text: "You've just earned yourself some bigger prey, huntress.", kill: 'Piety' },
  { area: '1_4_6_2', speaker: 'Piety', text: 'My beautiful champion. I knew I could rely on you.', kill: 'Piety' },
  { area: '1_4_6_3', speaker: 'Maligaro, the Inquisitor', text: 'You have murdered... an artist...', kill: 'Maligaro' },
  { area: '1_4_6_3', speaker: 'Maligaro, the Inquisitor', text: 'You are the greatest form... I never sculpted...', kill: 'Maligaro' },
  { area: '1_4_6_3', speaker: 'Maligaro, the Inquisitor', text: 'I could have made you... into a wonder...', kill: 'Maligaro' },
  { area: '1_4_6_3', speaker: 'Malachai', text: 'Why... are you so in love with Death?', kill: 'Malachai' },
  // Act 5
  { area: '1_5_5', speaker: 'Sin', text: 'Innocence!', kill: 'Avarius' },
  { area: '1_5_5', speaker: 'Bannon', text: 'What in damnation have you done?!', kill: 'Avarius' },
  { area: '1_5_8', speaker: 'Sin', text: 'The flame of hope may flicker but it cannot be extinguished!', kill: 'Kitava' },
  // Act 6
  { area: '2_6_5', speaker: 'Sin', text: 'Tukohama!', kill: 'Tukohama' },
  { area: '2_6_8', speaker: 'Sin', text: 'Abberath!', kill: 'Abberath' },
  { area: '2_6_11', speaker: 'Sin', text: 'Ryslatha!', kill: 'Ryslatha' },
  { area: '2_6_15', speaker: 'Sin', text: 'Tsoagoth!', kill: 'Tsoagoth' },
  // Act 7 (Ralakesh goes free when Greust dies)
  { area: '2_7_7', speaker: 'Sin', text: 'Ralakesh!', kill: 'Greust' },
  { area: '2_7_9', speaker: 'Sin', text: 'Gruthkul!', kill: 'Gruthkul' },
  { area: '2_7_12_2', speaker: 'Sin', text: 'Arakaali!', kill: 'Arakaali' },
  // Act 8
  { area: '2_8_4', speaker: 'Sin', text: 'Yugul!', kill: 'Yugul' },
  { area: '2_8_13', speaker: 'Sin', text: 'Solaris! Lunaris!', kill: 'Lunaris' },
  // Act 9
  { area: '2_9_4', speaker: 'Sin', text: 'Daughter!', kill: 'Shakari' },
  { area: '2_9_8', speaker: 'Sin', text: 'My love...', kill: 'Garukhan' },
  // Act 10
  { area: '2_10_6', speaker: 'Sin', text: 'May a new dawn arise!', kill: 'Kitava' }
]

const BY_KEY = new Map(BOSS_DONE_LINES.map(b => [`${b.area}\n${b.speaker}\n${b.text}`, b.kill]))

// "... [INFO Client 1] Sin: Abberath!" Channel prefixes (#, $, &, %, @) mark
// player chat.
const SPOKEN_RE = /\[INFO Client \d+\] ([^:#$&%@\]][^:\]]*): (.+?)\s*$/

// The route kill text a line finishes while in `areaId`, or null.
export function bossKilled (line: string, areaId: string): string | null {
  const m = SPOKEN_RE.exec(line)
  if (!m) return null
  return BY_KEY.get(`${areaId}\n${m[1]}\n${m[2]}`) ?? null
}
