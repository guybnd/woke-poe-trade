// The plain-language guide on the League mechanics settings page: what the
// overlay does for each mechanic and when. Every "when" here was checked against
// a real Client.txt (2026-11), so change it together with `zone` in data.ts and
// NPC_MECHANIC in zone.ts. The hand-written log fixtures invent lines.

export type GuideKind = 'zone' | 'boss' | 'npc' | 'none'

export interface MechanicGuide {
  kind: GuideKind
  gets: string
  when: string[]
  // What the reader might expect but doesn't happen.
  gap?: string
  tool?: { text: string, go: string, page: string }
}

const NOT_DETECTED = 'The game log shows nothing for this one, so the icon can\'t come up by itself. Open League mechanics from the launcher and pick it on the rail.'

export const GUIDE: Record<string, MechanicGuide> = {
  delve: {
    kind: 'zone',
    gets: 'Fossils and resonators ranked by price, so you only detour for nodes worth it. Sulphite scarabs and a few rules of thumb in the full panel.',
    when: ['You enter the Azurite Mine', 'Niko speaks in a map'],
    tool: { text: 'Delve grid: marks the mine map', go: 'Toggle key in Hotkeys', page: 'hotkeys' }
  },
  expedition: {
    kind: 'zone',
    gets: 'What each vendor\'s refresh currency is worth, with the vendor in this encounter on top. Expedition scarabs and tips in the full panel.',
    when: ['You enter a logbook area', 'Dannig, Tujen, Rog or Gwennen speaks in a map']
  },
  harvest: {
    kind: 'zone',
    gets: 'Lifeforce colours priced per 100, to pick between paired plots, plus Sacred lifeforce. Harvest scarabs in the full panel.',
    when: ['You enter the Sacred Grove', 'Oshabi speaks']
  },
  blight: {
    kind: 'npc',
    gets: 'Oils by price, to compare against Cassia\'s 3-to-1 upgrade, plus blighted maps. Blight scarabs in the full panel.',
    when: ['Sister Cassia speaks in a map']
  },
  essence: {
    kind: 'none',
    gets: 'Essences by price. Essence scarabs in the full panel. For the monoliths themselves, use Essence scan.',
    when: ['Only when you open it'],
    gap: NOT_DETECTED,
    tool: { text: 'Essence scan: reads monoliths and flags the ones you choose, MEDS by default', go: 'Essence scan', page: 'essence-scan' }
  },
  breach: {
    kind: 'boss',
    gets: 'A tip on Breach Rings, and Breach scarabs in the full panel. Nothing else to price: breaches drop corrupted rings, which poe.ninja doesn\'t list.',
    when: ['You enter a Breachlord\'s domain'],
    gap: 'Breaches inside a map don\'t show in the game log, so the icon won\'t come up for them.'
  },
  legion: {
    kind: 'boss',
    gets: 'Timeless splinters and emblems by price. Legion scarabs in the full panel.',
    when: ['You enter the Domain of Timeless Conflict'],
    gap: 'Legion encounters inside a map don\'t show in the game log, so the icon won\'t come up for them.'
  },
  delirium: {
    kind: 'zone',
    gets: 'Delirium orbs by price, and Simulacrum with its splinter. Delirium scarabs in the full panel.',
    when: ['You enter a Simulacrum', 'The Strange Voice speaks in a delirious map']
  },
  ritual: {
    kind: 'none',
    gets: 'Omens and corpses by price, to decide what is worth deferring. Ritual scarabs in the full panel.',
    when: ['Only when you open it'],
    gap: NOT_DETECTED
  },
  allflame: {
    kind: 'none',
    gets: 'Allflame Embers by price.',
    when: ['Only when you open it'],
    gap: NOT_DETECTED
  },
  ultimatum: {
    kind: 'npc',
    gets: 'Catalysts by price, since they are what you are usually playing for. Ultimatum scarabs in the full panel.',
    when: ['The Trialmaster speaks in a map']
  },
  sanctum: {
    kind: 'zone',
    gets: 'Unique relics by price and a couple of tips on resolve.',
    when: ['You enter the Forbidden Sanctum']
  },
  heist: {
    kind: 'zone',
    gets: 'Replica uniques by price, to check before you choose a reward room.',
    when: ['You enter the Rogue Harbour, a contract or a blueprint'],
    tool: { text: 'Heist gem reader: reads gem names on screen', go: 'Screen reading', page: 'screen' }
  },
  bestiary: {
    kind: 'npc',
    gets: 'Captured beasts by price, so you know which to itemise and sell. Bestiary scarabs in the full panel.',
    when: ['Einhar speaks in a map or the Menagerie']
  },
  incursion: {
    kind: 'zone',
    gets: 'Vials by price, to tell whether a Corruption room upgrade pays. Incursion scarabs in the full panel.',
    when: ['You enter the Temple of Atzoatl', 'Alva speaks in a map']
  },
  betrayal: {
    kind: 'zone',
    gets: 'Every Syndicate slot with a live price, by division. Star the ones you want and the card turns into a goal list; the full panel says what to do when you meet a member, and opens the full board.',
    when: ['You enter a safehouse or the Mastermind\'s Lair', 'Jun speaks in a map']
  }
}

export const KIND_LABEL: Record<GuideKind, string> = {
  zone: 'Comes up on its own',
  boss: 'Boss areas only',
  npc: 'When an NPC speaks',
  none: 'Not detected'
}

// The list's groups, in order, and which kinds each holds.
export const GUIDE_GROUPS: Array<{ label: string, kinds: GuideKind[] }> = [
  { label: 'Comes up on its own', kinds: ['zone', 'boss'] },
  { label: 'When an NPC speaks', kinds: ['npc'] },
  { label: 'Open it yourself', kinds: ['none'] }
]
