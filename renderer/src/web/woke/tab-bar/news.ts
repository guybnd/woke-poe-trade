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
  { id: 'instant-card-rates-graph', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: the price card by an item shows its chaos and divine rates, and a 24h / 3d / 7d graph (scroll on it)' },
  { id: 'price-check-conquest-keystones', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: a Timeless jewel lists each conqueror\'s keystone beside it. Click one to search it, any number' },
  { id: 'price-check-clear-numbers', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: hover a mod\'s number boxes for × to keep the line and search any value' },
  { id: 'essence-tip-slots', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Tooltips', note: 'New: an essence\'s tooltip lists the mod it forces on each slot' },
  { id: 'card-tip-set-maps', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Tooltips', note: 'New: a div card\'s tooltip sets the full set\'s cost against its reward, and names the maps it\'s likeliest in' },
  { id: 'gem-tip-ladder', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Tooltips', note: 'New: a gem\'s tooltip lists each version\'s price (20/20, 21/20 corrupted...) and where to get it' },
  { id: 'tip-you-have', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Tooltips', note: 'New: currency, fragment and card tooltips say how many your last stash read holds' },
  { id: 'base-tip-tiers-uniques', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Tooltips', note: 'New: a base\'s tooltip shows the item level its best tiers need and its uniques, marked if not chanceable' },
  { id: 'map-tip-cards', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Tooltips', note: 'New: hovering a map name anywhere shows its tier and the div cards that drop there' },
  { id: 'unique-tip-cards-foulborn', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Tooltips', note: 'New: a unique\'s tooltip shows the cards that give it and the set\'s cost, its Vestigial and its Foulborn swap' },
  { id: 'price-check-mod-tiers', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Tooltips', note: 'New: hover a mod for its tiers, the item level each needs, and the bench craft for it' },
  { id: 'search-recent-save', since: '1.330.21', wmType: 'woke-search', name: 'Search', note: 'New: hover a Recent line to save it on top (bookmark) or remove it (×, or Delete)' },
  { id: 'search-type-to-open', since: '1.330.21', wmType: 'woke-search', name: 'Search', note: 'New: with the overlay open, just start typing to search' },
  { id: 'item-menu-more', since: '1.330.21', wmType: 'woke-search', name: 'Search', note: 'New: right-click any item, then More, to search it: where it drops, recipes, your sales' },
  { id: 'search-keys-list', since: '1.330.21', wmType: 'woke-search', name: 'Search', note: 'New: type "keys" for every hotkey you have set and every mouse trick, in one list' },
  { id: 'price-check-card-stack', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a card, what a full stack gives and the gain' },
  { id: 'price-check-gem-kinds', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a gem, its transfigured kinds, priced' },
  { id: 'price-check-chance-uniques', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a normal base, the uniques an Orb of Chance can make' },
  { id: 'price-check-vault-rewards', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a Templar Vault reward, its vault and the other rewards in it' },
  { id: 'price-check-boss-uniques', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Related', note: "New: beside a Delve, Abyss or league boss's unique, the boss and its other uniques" },
  { id: 'price-check-related-exalts', since: '1.330.21', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a currency, every kind of it (all the exalts) and the cards that give a stack of it' },
  { id: 'map-price-check-farm-templates', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Maps', note: 'New: save a map\'s picks (numbers, kind, Not mods) as your own Farming button with Save' },
  { id: 'map-price-check-rate-chip', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Maps', note: 'New: rate a map\'s mods Bad, Care or Want from the price check (click the chip); saved to your Map mods profile' },
  { id: 'unid-rolled-unique-price', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: unid Watcher\'s Eye, Forbidden Flame and 66 more show their unid trade price, not poe.ninja\'s' },
  { id: 'search-recent-queries', since: '1.330.20', wmType: 'woke-search', name: 'Search', note: 'New: your last 3 searches wait under Recent, even ones you only looked at. Enter or a click puts one back' },
  { id: 'valdo-map-skips', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Maps', note: 'New: on a Valdo map, set a mod Not and listings with it are hidden; remembered per profile' },
  { id: 'valdo-map-lookup', since: '1.330.20', wmType: 'woke-search', name: 'Search', note: 'New: type "valdo headhunter" to price check Valdo maps with that reward' },
  { id: 'price-check-exchange-ladder', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: exchange offers as one row per price, what N would cost, and a Whisper with an amount on each seller' },
  { id: 'price-unit-flip', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: click the poe.ninja price to show it per divine ("44,469 per div") or in chaos' },
  { id: 'map-price-check-add-number', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Maps', note: 'New: a map\'s + tile adds a number it hasn\'t got (More Maps, Div cards...) to the search' },
  { id: 'div-card-rarity', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Tooltips', note: 'New: a div card\'s price check and tooltip say how rare it is, like "1 in 121k cards"' },
  { id: 'map-price-check-kind', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Maps', note: 'New: a map\'s price check searches its own kind (Originator, Elder...) or one you pick, every mod in one list' },
  { id: 'price-check-map-stat-columns', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Maps', note: 'New: a map\'s ticked Rarity, Pack and More Currency show as columns in the results, higher or lower than yours' },
  { id: 'price-check-related-upgrades', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: beside a unique, its upgrade, where it drops and the cards that give it, with prices' },
  { id: 'scrying-helper', since: '1.330.20', wmType: 'woke-scrying', name: 'Scrying', note: 'New: which map to scry, ranked by the cards a Scrying Orb adds per map, with the orb\'s price and a Buy link' },
  { id: 'price-check-unique-recipe', since: '1.330.20', wmType: 'price-check', name: 'Price check', topic: 'Related', note: 'New: a recipe part (Lost Unity rings) lists the other parts and what they make, with prices' },
  { id: 'listed-reprice', since: '1.330.20', wmType: 'woke-net-worth', name: 'Net worth', goto: 'listed', note: 'New: price check an item you have listed and set its new price at the foot' },
  { id: 'runs-crafting-session', since: '1.330.20', wmType: 'woke-net-worth', name: 'Net worth', goto: 'runs', note: 'New: a Crafting run: what you made, the orbs used and what sold, with its profit' },
  { id: 'per-hour-hideout-apart', since: '1.330.20', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: crafting and selling in hideout no longer count against per hour. Shown apart, with your sales' },
  { id: 'net-worth-chart-faustus-band', since: '1.330.20', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: the chart shows what you have at Faustus on top, sales as coins, and your maps (Maps)' },
  { id: 'listed-sales-leave-out', since: '1.330.20', wmType: 'woke-net-worth', name: 'Net worth', goto: 'listed', note: 'New: hover a listing for ⊘ to leave it out of the Listed total (Sales too)' },
  { id: 'deck-card-line-item', since: '1.330.20', wmType: 'woke-stacked-decks', name: 'Stacked decks', note: 'New: click a card\'s value to set your price; hover it to leave it out of Got and Result' },
  { id: 'analytics-line-item', since: '1.330.20', wmType: 'woke-session-analytics', name: 'Session analytics', note: 'New: right-click a map\'s loot for your price or to leave it out' },
  { id: 'profit-line-item', since: '1.330.20', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: click a price to set your own; hover a row to leave it out. Changed lists what you edited' },
  { id: 'glance-bar-default', since: '1.330.19', wmType: 'woke-session-analytics', name: 'Session analytics', settingsPage: 'Sessions', note: 'New: a thin bar at the top while mapping. Off in Settings' },
  { id: 'glance-bar-fields', since: '1.330.19', wmType: 'woke-session-analytics', name: 'Session analytics', settingsPage: 'Sessions', note: 'New: pick what the in-map glance bar shows, and keep it up while a run goes' },
  { id: 'forbidden-pair-finder', since: '1.330.19', wmType: 'woke-forbidden', name: 'Forbidden pair finder', note: 'New: the Forbidden Flame and Flesh notables your build can take, with what each pair costs' },
  { id: 'price-check-ninja-trust', since: '1.330.19', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: the instant card says when poe.ninja\'s price looks fake, with the item\'s usual price' },
  { id: 'price-check-seller-spread', since: '1.330.19', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: exchange prices show what sellers ask, like "1 to 15c, most ask 10c"' },
  { id: 'price-check-unid-vs-id', since: '1.330.19', wmType: 'price-check', name: 'Price check', topic: 'Prices & search', note: 'New: unid Watcher\'s Eye and other gamble jewels show unid price vs identified versions' },
  { id: 'map-farming-goal', since: '1.330.19', wmType: 'woke-map-mods', name: 'Map mods', goto: 'planner', note: 'New: pick Currency or Maps & Threads on a map\'s price check, and the numbers that matter start on' },
  { id: 'div-card-map-chance', since: '1.330.19', wmType: 'woke-search', name: 'Search', note: 'New: type a map to see how likely each of its cards is, and what one is worth on average' },
  { id: 'run-summary-on-stop', since: '1.330.19', wmType: 'woke-net-worth', name: 'Net worth', goto: 'runs', note: 'New: a run summary on Stop: vs your usual, best drops, map times and tips' },
  { id: 'runs-kits-compare', since: '1.330.19', wmType: 'woke-net-worth', name: 'Net worth', goto: 'runs', note: 'New: run costs priced live, and past runs side by side, by strategy too' },
  { id: 'listed-still-cheapest', since: '1.330.19', wmType: 'woke-net-worth', name: 'Net worth', goto: 'listed', note: 'New: Check on a Listed row says if anyone sells it cheaper (one trade search)' },
  { id: 'per-hour-time-setting', since: '1.330.19', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: Play, + Hideout or All beside every per hour, the same choice in every tool' },
  { id: 'net-worth-public', since: '1.330.18', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: open to everyone. Charts what your stash is worth and what each map earned' },
  { id: 'map-mods-t17-planner', since: '1.330.18', wmType: 'woke-map-mods', name: 'Map mods', goto: 'planner', note: 'New: a Planner tab for T17 maps, and what each mod adds to a map' },
  { id: 'net-worth-listed', since: '1.330.18', wmType: 'woke-net-worth', name: 'Net worth', goto: 'listed', note: 'New: a Listed tab: what you have up at Faustus, unsold, and for how long' },
  { id: 'net-worth-strategy-runs', since: '1.330.18', wmType: 'woke-net-worth', name: 'Net worth', goto: 'runs', note: 'New: strategy runs. Start one from the icon\'s card to see what a farm earns' },
  { id: 'net-worth-faustus-box', since: '1.330.18', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: tick the box on At Faustus to count your listings in the total, or leave them out' },
  { id: 'atlas-planner-links', since: '1.330.18', wmType: 'woke-atlas-strategies', name: 'Atlas strategies', note: 'New: imports poeatlasplanner.com links' }
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

// What counts as seen. Before setup's first Finish (or with it closed
// unfinished) it's all of it: a new player has nothing "new". The same with
// What's new switched off, for players who update every day or two.
export function seenNewsIds (woke: WokeModulesConfig | undefined): readonly string[] {
  return woke?.setupDone && !woke.newsOff ? (woke.seenNews ?? []) : NEWS.map(n => n.id)
}

// Lines not seen yet. Like the All tools count, a switched-off tool's line
// counts too: the launcher lists it, and turning it on is one click.
export function unseenNews (woke: WokeModulesConfig | undefined, version: string): NewsItem[] {
  const seen = seenNewsIds(woke)
  return liveNews(version).filter(n => !seen.includes(n.id))
}

// Every unseen line of one tool (a tool can have several).
export function unseenNewsOf (wmType: string, seen: readonly string[] | undefined, version: string): NewsItem[] {
  return liveNews(version).filter(n => n.wmType === wmType && !seen?.includes(n.id))
}
