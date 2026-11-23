// What's new, said in game: a tool with something new gets a "New" seal in
// All tools until the player points at it, and the rail's All tools button
// counts them. Add a line here with a feature that's worth a look; take old
// lines out after a release or two. Players who just installed see none.
import type { WokeModulesConfig } from '../modules'

export interface NewsItem {
  // Stays the same for the life of the line: it's what "seen" remembers.
  id: string
  wmType: string
  // Shown along the launcher's foot when the row is pointed at.
  note: string
}

export const NEWS: NewsItem[] = [
  { id: 'net-worth-public', wmType: 'woke-net-worth', note: 'New: open to everyone. Charts what your stash is worth and what each map earned' },
  { id: 'map-mods-t17-planner', wmType: 'woke-map-mods', note: 'New: a Planner tab for T17 maps, and what each mod adds to a map' },
  { id: 'atlas-planner-links', wmType: 'woke-atlas-strategies', note: 'New: imports poeatlasplanner.com links' }
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
