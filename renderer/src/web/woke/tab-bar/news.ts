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
  // Where the card's "Show me" goes: the tab of the tool (goto.ts
  // GOTO_TARGETS; required for a tool that has tabs there), or a Settings
  // page by its name instead.
  goto?: string
  settingsPage?: string
}

export const NEWS: NewsItem[] = [
  { id: 'listed-reprice', wmType: 'woke-net-worth', name: 'Net worth', goto: 'listed', note: 'New: price check an item you have listed and set its new price at the foot' },
  { id: 'runs-crafting-session', wmType: 'woke-net-worth', name: 'Net worth', goto: 'runs', note: 'New: a Crafting run: what you made, the orbs used and what sold, with its profit' },
  { id: 'per-hour-hideout-apart', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: crafting and selling in hideout no longer count against per hour. Shown apart, with your sales' },
  { id: 'net-worth-chart-faustus-band', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: the chart shows what you have at Faustus on top, sales as coins, and your maps (Maps)' },
  { id: 'glance-bar-default', wmType: 'woke-session-analytics', name: 'Session analytics', settingsPage: 'Sessions', note: 'New: a thin bar at the top while mapping. Off in Settings' },
  { id: 'glance-bar-fields', wmType: 'woke-session-analytics', name: 'Session analytics', settingsPage: 'Sessions', note: 'New: pick what the in-map glance bar shows, and keep it up while a run goes' },
  { id: 'forbidden-pair-finder', wmType: 'woke-forbidden', name: 'Forbidden pair finder', note: 'New: the Forbidden Flame and Flesh notables your build can take, with what each pair costs' },
  { id: 'price-check-ninja-trust', wmType: 'price-check', name: 'Price check', settingsPage: 'Price check', note: 'New: the instant card says when poe.ninja\'s price looks fake, with the item\'s usual price' },
  { id: 'price-check-bulk-remembered', wmType: 'price-check', name: 'Price check', settingsPage: 'Price check', note: 'New: Bulk stays on for your next checks until you turn it off' },
  { id: 'price-check-seller-spread', wmType: 'price-check', name: 'Price check', settingsPage: 'Price check', note: 'New: exchange prices show what sellers ask, like "1 to 15c, most ask 10c"' },
  { id: 'price-check-unid-vs-id', wmType: 'price-check', name: 'Price check', settingsPage: 'Price check', note: 'New: unid Watcher\'s Eye and other gamble jewels show unid price vs identified versions' },
  { id: 'map-farming-goal', wmType: 'woke-map-mods', name: 'Map mods', goto: 'planner', note: 'New: pick Currency or Maps & Threads on a map\'s price check, and the numbers that matter start on' },
  { id: 'div-card-map-chance', wmType: 'woke-search', name: 'Search', note: 'New: type a map to see how likely each of its cards is, and what one is worth on average' },
  { id: 'run-summary-on-stop', wmType: 'woke-net-worth', name: 'Net worth', goto: 'runs', note: 'New: a run summary on Stop: vs your usual, best drops, map times and tips' },
  { id: 'runs-kits-compare', wmType: 'woke-net-worth', name: 'Net worth', goto: 'runs', note: 'New: run costs priced live, and past runs side by side, by strategy too' },
  { id: 'listed-still-cheapest', wmType: 'woke-net-worth', name: 'Net worth', goto: 'listed', note: 'New: Check on a Listed row says if anyone sells it cheaper (one trade search)' },
  { id: 'per-hour-time-setting', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: Play, + Hideout or All beside every per hour, the same choice in every tool' },
  { id: 'net-worth-public', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: open to everyone. Charts what your stash is worth and what each map earned' },
  { id: 'map-mods-t17-planner', wmType: 'woke-map-mods', name: 'Map mods', goto: 'planner', note: 'New: a Planner tab for T17 maps, and what each mod adds to a map' },
  { id: 'net-worth-listed', wmType: 'woke-net-worth', name: 'Net worth', goto: 'listed', note: 'New: a Listed tab: what you have up at Faustus, unsold, and for how long' },
  { id: 'net-worth-strategy-runs', wmType: 'woke-net-worth', name: 'Net worth', goto: 'runs', note: 'New: strategy runs. Start one from the icon\'s card to see what a farm earns' },
  { id: 'net-worth-faustus-box', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: tick the box on At Faustus to count your listings in the total, or leave them out' },
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
// unfinished) it's all of it: a new player has nothing "new". The same with
// What's new switched off, for players who update every day or two.
export function seenNewsIds (woke: WokeModulesConfig | undefined): readonly string[] {
  return woke?.setupDone && !woke.newsOff ? (woke.seenNews ?? []) : NEWS.map(n => n.id)
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
