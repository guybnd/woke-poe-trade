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
  { id: 'loot-filter-levelling-gear', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: Loot › Levelling picks gear for your build type, plus links, boots, flasks and jewellery' },
  { id: 'loot-filter-levelling', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: Loot looks while levelling and in the hideout; Levelling keeps supplies, uniques and gems visible' },
  { id: 'loot-filter-valuable-exotics', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: Base ranks splits Exotic into valuable (about 1 div+) and the rest, each with its own text colour' },
  { id: 'loot-filter-gold-page', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: Gold has its own page on the Loot tab, and each loot class shows its item art' },
  { id: 'loot-filter-section-ruler', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: give a Loot section its own step ruler (Own ruler in the section); Strictness still moves it' },
  { id: 'loot-filter-section-steps', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: turn Small, Normal, Decent or Big off for every Loot page, one page, or one section (Steps rows)' },
  { id: 'loot-filter-map-looks', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: maps look like maps again, black on white, each special kind with its own edge colour and square map icon' },
  { id: 'loot-filter-league-always', since: '1.330.24', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: Chronicles, Viscera, Reliquary keys, Ultimatums, warrants and logbooks always show; Hide is one click' },
  { id: 'search-mod-filter-words', since: '1.330.24', wmType: 'woke-search', name: 'Search', note: 'New: add "vestigial", "foulborn" or a slot ("rarity boots") to a mod search; short names like "iir" work' },
  { id: 'price-check-unique-filter-tier', since: '1.330.24', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a unique, how rare a drop it is (T0 to T5) and the tier your loot filter puts it in' },
  { id: 'watchers-eye-finder', since: '1.330.24', wmType: 'woke-watchers-eye', name: "Watcher's Eye finder", note: "New: tick your auras, pick Watcher's Eye mods from the full list, and price that jewel in one search" },
  { id: 'loot-filter-over-quality-look', since: '1.330.23', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: over-quality gear keeps its tier look with a pink mark on top; Change mark on Drop tiers' },
  { id: 'search-tree-by-stat', since: '1.330.23', wmType: 'woke-search', name: 'Search', note: 'New: type what a passive does ("onslaught") for the keystones and notables that do it' },
  { id: 'search-unique-mods', since: '1.330.23', wmType: 'woke-search', name: 'Search', note: 'New: type part of a mod ("item rarity 50") for every unique with it, priced; Foulborn and Vestigial too' },
  { id: 'loot-filter-drag-bases', since: '1.330.23', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: drag bases between rank columns on Base ranks; drag one or all the picked ones' },
  { id: 'loot-filter-profiles', since: '1.330.22', wmType: 'woke-loot-filter', goto: 'editor', name: 'Loot filter', note: 'New: profiles, several whole filters (mapping, bossing...) each in its own file; switch at the top' },
  { id: 'price-check-unique-foulborn', since: '1.330.22', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a unique, its Foulborn kinds and versions priced, its Vestigial mod, and if it can be chanced' },
  { id: 'atlas-tree-planner-links', since: '1.330.22', wmType: 'woke-atlas-strategies', goto: 'strategies', name: 'Atlas strategies', note: 'New: imports Atlas Tree Planner links (atlas-blush-beta.vercel.app)' },
  { id: 'search-price-check-bases', since: '1.330.22', wmType: 'woke-search', name: 'Search', note: 'New: Enter price checks bases, flasks, jewels and corpses in the overlay; Alt+Enter opens the trade site' },
  { id: 'net-worth-rename-runs', since: '1.330.22', wmType: 'woke-net-worth', name: 'Net worth', goto: 'runs', note: 'New: rename a run: click its name, or the pen in Past runs' },
  { id: 'net-worth-worth-selling', since: '1.330.22', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: a Falling chip on Holdings lists what you hold 1 div or more of that has been falling all week' },
  { id: 'pob-import-all-sites', since: '1.330.22', wmType: 'woke-pob-builds', goto: 'builds', name: 'PoB builds', note: 'New: import poe.ninja, maxroll and pob.codes build links; your list follows PoB\'s own builds folder' },
  { id: 'atlas-results-from-runs', since: '1.330.22', wmType: 'woke-atlas-strategies', goto: 'strategies', name: 'Atlas strategies', note: 'New: each strategy shows what your strategy runs of the same name earn per hour and per map' },
  { id: 'price-check-corpse-card', since: '1.330.22', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: corpses get the quick price card and a tooltip with the spectre\'s monster type and abilities' },
  { id: 'map-price-check-exclude-bad-mods', since: '1.330.22', wmType: 'price-check', name: 'Price check', topic: 'Maps', note: 'New: Exclude my bad mods on a map\'s Farming template leaves out maps with any of its Not mods' },
  { id: 'flips-tattoo-tribes', since: '1.330.22', wmType: 'woke-scarab-flip', goto: 'tattoos', name: 'Flips', note: 'New: Tattoos tab, each tribe\'s average Tattoo and whether 3 of its cheapest are worth vendoring for 1' },
  { id: 'mechanics-settlers', since: '1.330.22', wmType: 'woke-mechanics', goto: 'settlers', name: 'League mechanics', note: 'New: Settlers tab, Tattoos by tribe and Runegrafts, priced' },
  { id: 'price-check-base-percentile', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: rare and magic armour show their base roll ("92% base") by its defence; click it to add it to the search' },
  { id: 'related-folded-groups', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: the list beside a price check folds into groups that fit your screen; click a group to open it' },
  { id: 'price-check-conquest-keystones', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: a Timeless jewel lists each conqueror\'s keystone beside it. Click one to search it, any number' },
  { id: 'essence-tip-slots', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Tooltips', note: 'New: an essence\'s tooltip lists the mod it forces on each slot' },
  { id: 'price-check-mod-tiers', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Tooltips', note: 'New: hover a mod for its tiers, the item level each needs, and the bench craft for it' },
  { id: 'search-keys-list', since: '1.330.21', wmType: 'woke-search', name: 'Search', note: 'New: type "keys" for every hotkey you have set and every mouse trick, in one list' },
  { id: 'price-check-gem-kinds', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a gem, its transfigured kinds, priced' },
  { id: 'price-check-chance-uniques', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a normal base, the uniques an Orb of Chance can make' },
  { id: 'price-check-vault-rewards', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a Templar Vault reward, its vault and the other rewards in it' },
  { id: 'price-check-boss-uniques', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Related', note: "New: beside a Delve, Abyss or league boss's unique, the boss and its other uniques" },
  { id: 'price-check-related-exalts', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a currency, every kind of it (all the exalts) and the cards that give a stack of it' },
  { id: 'unid-rolled-unique-price', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: unid Watcher\'s Eye, Forbidden Flame and 66 more show their unid trade price, not poe.ninja\'s' },
  { id: 'search-recent-queries', since: '1.330.20', wmType: 'woke-search', name: 'Search', note: 'New: your last 3 searches wait under Recent, even ones you only looked at. Enter or a click puts one back' },
  { id: 'valdo-map-skips', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Maps', note: 'New: on a Valdo map, set a mod Not and listings with it are hidden; remembered per profile' },
  { id: 'valdo-map-lookup', since: '1.330.20', wmType: 'woke-search', name: 'Search', note: 'New: type "valdo headhunter" to price check Valdo maps with that reward' },
  { id: 'price-check-exchange-ladder', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: exchange offers as one row per price, what N would cost, and a Whisper with an amount on each seller' },
  { id: 'price-check-related-upgrades', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a unique, its upgrade, where it drops and the cards that give it, with prices' },
  { id: 'scrying-helper', since: '1.330.20', wmType: 'woke-scrying', name: 'Scrying', note: 'New: which map to scry, ranked by the cards a Scrying Orb adds per map, with the orb\'s price and a Buy link' },
  { id: 'price-check-unique-recipe', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: a recipe part (Lost Unity rings) lists the other parts and what they make, with prices' },
  { id: 'deck-card-line-item', since: '1.330.20', wmType: 'woke-stacked-decks', name: 'Stacked decks', note: 'New: click a card\'s value to set your price; hover it to leave it out of Got and Result' },
  { id: 'analytics-line-item', since: '1.330.20', wmType: 'woke-session-analytics', name: 'Session analytics', note: 'New: right-click a map\'s loot for your price or to leave it out' },
  { id: 'price-check-seller-spread', since: '1.330.19', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: exchange prices show what sellers ask, like "1 to 15c, most ask 10c"' },
  { id: 'div-card-map-chance', since: '1.330.19', wmType: 'woke-search', name: 'Search', note: 'New: type a map to see how likely each of its cards is, and what one is worth on average' }
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
