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
  // Price check has many lines: the dock's What's new card groups them by
  // this under the tool's name ("Price check · Tooltips"). Required there
  // (news.test.ts), left out elsewhere.
  topic?: NewsTopic
  // The release the line ships in (main/package.json's version, patch + 1).
  // It stops showing two releases later, so lines nobody took out still go.
  since: string
}

export type NewsTopic = 'Tooltips' | 'Maps' | 'Prices & search' | 'Related'

export const NEWS: NewsItem[] = [
  { id: 'loot-filter-identified-mods', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: Rare gear scores identified rares and magic items by their mods' },
  { id: 'loot-filter-special-gear', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: Equipment › Special gear: veiled, temple and league mods, fractured, influenced gear, idols' },
  { id: 'loot-filter-recipes-by-price', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: Loot › Recipes steps follow the price of what the vendor gives' },
  { id: 'price-check-base-step', since: '1.330.24', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: a Base step beside Low / Approx / High prices gear as its base in one click' },
  { id: 'loot-levelling', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: Loot › Levelling: Loot looks while levelling, gear for your build' },
  { id: 'loot-filter-readable-history', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: Changes › History says what each change moved, from what to what; repeats fold into one row' },
  { id: 'loot-filter-own-lists', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: Loot lists items from the game data; unpriced ones are guessed from last league' },
  { id: 'loot-filter-jewels-no-price', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: every jewel shows, corrupted implicits louder; no guessed price hides them' },
  { id: 'loot-filter-valuable-exotics', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: Base ranks splits Exotic into valuable (about 1 div+) and the rest, each with its own text colour' },
  { id: 'loot-filter-gold-page', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: Gold has its own page on the Loot tab, and each loot class shows its item art' },
  { id: 'loot-filter-section-ruler', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: give a Loot section its own step ruler (Own ruler in the section); Strictness still moves it' },
  { id: 'loot-filter-section-steps', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: turn Small, Normal, Decent or Big off for every Loot page, one page, or one section (Steps rows)' },
  { id: 'loot-filter-map-looks', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: maps look like maps again, black on white, each special kind with its own edge colour and square map icon' },
  { id: 'loot-filter-league-always', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: Chronicles, Viscera, Reliquary keys, Ultimatums, warrants and logbooks always show; Hide is one click' },
  { id: 'search-mod-filter-words', since: '1.330.24', wmType: 'woke-search', name: 'Search', note: 'New: add "vestigial", "foulborn" or a slot ("rarity boots") to a mod search; short names like "iir" work' },
  { id: 'price-check-card-set', since: '1.330.24', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: a div card\'s quick price card shows what its full set gives, and both prices' },
  { id: 'price-check-unique-filter-tier', since: '1.330.24', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a unique, how rare a drop it is (T0 to T5) and the tier your loot filter puts it in' },
  { id: 'watchers-eye-finder', since: '1.330.24', wmType: 'woke-watchers-eye', name: "Watcher's Eye finder", note: "New: tick your auras, pick Watcher's Eye mods from the full list, and price that jewel in one search" },
  { id: 'loot-filter-over-quality-look', since: '1.330.23', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: over-quality gear keeps its tier look with a pink mark on top; Change mark on Drop tiers' },
  { id: 'search-tree-by-stat', since: '1.330.23', wmType: 'woke-search', name: 'Search', note: 'New: type what a passive does ("onslaught") for the keystones and notables that do it' },
  { id: 'search-unique-mods', since: '1.330.23', wmType: 'woke-search', name: 'Search', note: 'New: type part of a mod ("item rarity 50") for every unique with it, priced; Foulborn and Vestigial too' },
  { id: 'loot-filter-drag-bases', since: '1.330.23', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: drag bases between rank columns on Base ranks; drag one or all the picked ones' },
  { id: 'loot-filter-profiles', since: '1.330.22', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: profiles, several whole filters (mapping, bossing...) each in its own file; switch at the top' },
  { id: 'price-check-unique-foulborn', since: '1.330.22', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a unique, its Foulborn kinds and versions priced, its Vestigial mod, and if it can be chanced' },
  { id: 'search-price-check-bases', since: '1.330.22', wmType: 'woke-search', name: 'Search', note: 'New: Enter price checks bases, flasks, jewels and corpses in the overlay; Alt+Enter opens the trade site' },
  { id: 'net-worth-worth-selling', since: '1.330.22', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: a Falling chip on Holdings lists what you hold 1 div or more of that has been falling all week' },
  { id: 'pob-import-all-sites', since: '1.330.22', wmType: 'woke-pob-builds', goto: 'builds', name: 'PoB builds', note: 'New: import poe.ninja, maxroll and pob.codes build links; your list follows PoB\'s own builds folder' },
  { id: 'atlas-results-from-runs', since: '1.330.22', wmType: 'woke-atlas-strategies', goto: 'strategies', name: 'Atlas strategies', note: 'New: each strategy shows what your strategy runs of the same name earn per hour and per map' },
  { id: 'price-check-corpse-card', since: '1.330.22', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: corpses get the quick price card and a tooltip with the spectre\'s monster type and abilities' },
  { id: 'map-price-check-exclude-bad-mods', since: '1.330.22', wmType: 'price-check', name: 'Price check', topic: 'Maps', note: 'New: Exclude my bad mods on a map\'s Farming template leaves out maps with any of its Not mods' },
  { id: 'flips-tattoo-tribes', since: '1.330.22', wmType: 'woke-scarab-flip', goto: 'tattoos', name: 'Flips', note: 'New: Tattoos tab, each tribe\'s average Tattoo and whether 3 of its cheapest are worth vendoring for 1' },
  { id: 'mechanics-settlers', since: '1.330.22', wmType: 'woke-mechanics', goto: 'settlers', name: 'League mechanics', note: 'New: Settlers tab, Tattoos by tribe and Runegrafts, priced' },
  { id: 'essence-tip-slots', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Tooltips', note: 'New: an essence\'s tooltip lists the mod it forces on each slot' },
  { id: 'price-check-mod-tiers', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Tooltips', note: 'New: hover a mod for its tiers, the item level each needs, and the bench craft for it' },
  { id: 'search-keys-list', since: '1.330.21', wmType: 'woke-search', name: 'Search', note: 'New: type "keys" for every hotkey you have set and every mouse trick, in one list' },
  { id: 'search-recent-queries', since: '1.330.20', wmType: 'woke-search', name: 'Search', note: 'New: your last 3 searches wait under Recent, even ones you only looked at. Enter or a click puts one back' },
  { id: 'valdo-map-skips', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Maps', note: 'New: on a Valdo map, set a mod Not and listings with it are hidden; remembered per profile' },
  { id: 'price-check-related-upgrades', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a unique, its upgrade, where it drops and the cards that give it, with prices' },
  { id: 'price-check-unique-recipe', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: a recipe part (Lost Unity rings) lists the other parts and what they make, with prices' },
  { id: 'price-check-ninja-trust', since: '1.330.19', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: the instant card says when poe.ninja\'s price looks fake, with the item\'s usual price' },
  { id: 'price-check-seller-spread', since: '1.330.19', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: exchange prices show what sellers ask, like "1 to 15c, most ask 10c"' },
  { id: 'listed-still-cheapest', since: '1.330.19', wmType: 'woke-net-worth', name: 'Net worth', goto: 'listed', note: 'New: Check on a Listed row says if anyone sells it cheaper (one trade search)' },
  { id: 'div-card-map-chance', since: '1.330.19', wmType: 'woke-search', name: 'Search', note: 'New: type a map to see how likely each of its cards is, and what one is worth on average' },
  { id: 'map-mods-t17-planner', since: '1.330.18', wmType: 'woke-map-mods', name: 'Map mods', goto: 'planner', note: 'New: a Planner tab for T17 maps, and what each mod adds to a map' },
  { id: 'atlas-planner-links', since: '1.330.18', wmType: 'woke-atlas-strategies', goto: 'strategies', name: 'Atlas strategies', note: 'New: imports poeatlasplanner.com links' },
  { id: 'net-worth-listed', since: '1.330.18', wmType: 'woke-net-worth', name: 'Net worth', goto: 'listed', note: 'New: a Listed tab: what you have up at Faustus, unsold, and for how long' }
]

// A line shows for the release it ships in and the next one, then expires.
// A new league (major.LEAGUE.patch) restarts the count, so the league's first
// release still shows the old league's last lines and its .1 drops them. A
// version that isn't a release (the fake app's 0.0.0-test) expires nothing.
export const NEWS_RELEASES = 2
export function newsExpired (since: string, version: string): boolean {
  const v = version.match(/^(\d+)\.(\d+)\.(\d+)$/)?.slice(1).map(Number)
  const s = since.match(/^(\d+)\.(\d+)\.(\d+)$/)?.slice(1).map(Number)
  if (!v || !s || v[0] === 0) return false
  if (v[0] !== s[0] || v[1] !== s[1]) return v[0] > s[0] || (v[0] === s[0] && v[1] > s[1]) ? v[2] >= NEWS_RELEASES - 1 : false
  return v[2] >= s[2] + NEWS_RELEASES
}

// The lines still showing on the running version (MainProcess.version;
// passed in, so this file loads outside the app too).
export function liveNews (version: string): NewsItem[] {
  return NEWS.filter(n => !newsExpired(n.since, version))
}

export function newsFor (wmType: string, seen: readonly string[] | undefined, version: string): NewsItem | null {
  return liveNews(version).find(n => n.wmType === wmType && !seen?.includes(n.id)) ?? null
}

// Seen ones are kept only while their line is here.
export function markNewsSeen (woke: WokeModulesConfig, ids: string[]): void {
  const keep = new Set([...(woke.seenNews ?? []), ...ids])
  woke.seenNews = NEWS.map(n => n.id).filter(id => keep.has(id))
}

export function markAllNewsSeen (woke: WokeModulesConfig): void {
  markNewsSeen(woke, NEWS.map(n => n.id))
}

// What's new is off: switched off in Settings, or its dock icon dismissed for
// good ("Always", or its Show switch in Settings › Icon row). A player who hid
// the icon meant "stop telling me": no NEW seals or rail count after the next
// update either (they used to come back with every update).
export function newsIsOff (woke: WokeModulesConfig | undefined): boolean {
  return !!(woke?.newsOff || woke?.dock?.hidden?.includes('whats-new'))
}

// What counts as seen. Before setup's first Finish (or with it closed
// unfinished) it's all of it: a new player has nothing "new". The same with
// What's new switched off, for players who update every day or two.
export function seenNewsIds (woke: WokeModulesConfig | undefined): readonly string[] {
  return woke?.setupDone && !newsIsOff(woke) ? (woke.seenNews ?? []) : NEWS.map(n => n.id)
}

// Lines not seen yet. Like the All tools count, a switched-off tool's line
// counts too: the launcher lists it, and turning it on is one click.
export function unseenNews (woke: WokeModulesConfig | undefined, version: string): NewsItem[] {
  const seen = seenNewsIds(woke)
  return liveNews(version).filter(n => !seen.includes(n.id))
}
