// What's new, said in game: a tool with something new gets a "New" seal in
// All tools until the player points at it, the rail's All tools button counts
// them, and a What's new icon in the dock lists each line until it's shown or
// dismissed. Add a line here with a feature that's worth a look; take old
// lines out after a release or two. Players who just installed see none.
import type { WokeModulesConfig } from '../modules'

export interface NewsItem {
  // Stays the same for the life of the line: it's what "seen" remembers.
  id: string
  wmType: string
  // The tool's name, as the dock's What's new card heads the line.
  name: string
  // Shown along the launcher's foot when the row is pointed at, and in the
  // dock's What's new card.
  note: string
  // Where the card's "Show me" goes: the tool's window (left out), or a
  // Settings page by its name.
  settingsPage?: string
}

export const NEWS: NewsItem[] = [
  { id: 'net-worth-public', wmType: 'woke-net-worth', name: 'Net worth', note: 'New: open to everyone. Charts what your stash is worth and what each map earned' },
  { id: 'map-mods-t17-planner', wmType: 'woke-map-mods', name: 'Map mods', note: 'New: a Planner tab for T17 maps, and what each mod adds to a map' },
  { id: 'net-worth-listed', wmType: 'woke-net-worth', name: 'Net worth', note: 'New: a Listed tab: what you have up at Faustus, unsold, and for how long' },
  { id: 'net-worth-strategy-runs', wmType: 'woke-net-worth', name: 'Net worth', note: 'New: strategy runs. Start one from the icon\'s card to see what a farm earns' },
  { id: 'net-worth-faustus-box', wmType: 'woke-net-worth', name: 'Net worth', note: 'New: tick the box on At Faustus to count your listings in the total, or leave them out' },
  { id: 'atlas-planner-links', wmType: 'woke-atlas-strategies', name: 'Atlas strategies', note: 'New: imports poeatlasplanner.com links' }
]

export function newsFor (wmType: string, seen: readonly string[] | undefined): NewsItem | null {
  return NEWS.find(n => n.wmType === wmType && !seen?.includes(n.id)) ?? null
}

// Seen ones are kept only while their line is here.
export function markNewsSeen (woke: WokeModulesConfig, ids: string[]): void {
  const keep = new Set([...(woke.seenNews ?? []), ...ids])
  woke.seenNews = NEWS.map(n => n.id).filter(id => keep.has(id))
}

export function markAllNewsSeen (woke: WokeModulesConfig): void {
  markNewsSeen(woke, NEWS.map(n => n.id))
}

// What counts as seen. Before setup's first Finish (or with it closed
// unfinished) it's all of it: a new player has nothing "new".
export function seenNewsIds (woke: WokeModulesConfig | undefined): readonly string[] {
  return woke?.setupDone ? (woke.seenNews ?? []) : NEWS.map(n => n.id)
}

// Lines not seen yet. Like the All tools count, a switched-off tool's line
// counts too: the launcher lists it, and turning it on is one click.
export function unseenNews (woke: WokeModulesConfig | undefined): NewsItem[] {
  const seen = seenNewsIds(woke)
  return NEWS.filter(n => !seen.includes(n.id))
}

// Every unseen line of one tool (a tool can have several).
export function unseenNewsOf (wmType: string, seen: readonly string[] | undefined): NewsItem[] {
  return NEWS.filter(n => n.wmType === wmType && !seen?.includes(n.id))
}
