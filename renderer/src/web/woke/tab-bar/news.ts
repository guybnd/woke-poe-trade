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
  { id: 'instant-card-rates-graph', wmType: 'price-check', name: 'Price check', note: 'New: the price card by an item shows its chaos and divine rates, and a 24h / 3d / 7d graph (scroll on it)' },
  { id: 'price-check-conquest-keystones', wmType: 'price-check', name: 'Price check', note: 'New: a Timeless jewel lists each conqueror\'s keystone beside it. Click one to search it, any number' },
  { id: 'price-check-clear-numbers', wmType: 'price-check', name: 'Price check', note: 'New: hover a mod\'s number boxes for × to keep the line and search any value' },
  { id: 'essence-tip-slots', wmType: 'price-check', name: 'Price check', note: 'New: an essence\'s tooltip lists the mod it forces on each slot' },
  { id: 'card-tip-set-maps', wmType: 'price-check', name: 'Price check', note: 'New: a div card\'s tooltip sets the full set\'s cost against its reward, and names the maps it\'s likeliest in' },
  { id: 'gem-tip-ladder', wmType: 'price-check', name: 'Price check', note: 'New: a gem\'s tooltip lists each version\'s price (20/20, 21/20 corrupted...) and where to get it' },
  { id: 'tip-you-have', wmType: 'price-check', name: 'Price check', note: 'New: currency, fragment and card tooltips say how many your last stash read holds' },
  { id: 'base-tip-tiers-uniques', wmType: 'price-check', name: 'Price check', note: 'New: a base\'s tooltip shows the item level its best tiers need and its uniques, marked if not chanceable' },
  { id: 'map-tip-cards', wmType: 'price-check', name: 'Price check', note: 'New: hovering a map name anywhere shows its tier and the div cards that drop there' },
  { id: 'unique-tip-cards-foulborn', wmType: 'price-check', name: 'Price check', note: 'New: a unique\'s tooltip shows the cards that give it and the set\'s cost, its Vestigial and its Foulborn swap' },
  { id: 'price-check-mod-tiers', wmType: 'price-check', name: 'Price check', note: 'New: hover a mod for its tiers, the item level each needs, and the bench craft for it' },
  { id: 'map-price-check-farm-templates', wmType: 'price-check', name: 'Price check', note: 'New: save a map\'s picks (numbers, kind, Not mods) as your own Farming button with Save' },
  { id: 'map-price-check-rate-chip', wmType: 'price-check', name: 'Price check', note: 'New: rate a map\'s mods Bad, Care or Want from the price check (click the chip); saved to your Map mods profile' },
  { id: 'unid-rolled-unique-price', wmType: 'price-check', name: 'Price check', note: 'New: unid Watcher\'s Eye, Forbidden Flame and 66 more show their unid trade price, not poe.ninja\'s' },
  { id: 'search-recent-save', wmType: 'woke-search', name: 'Search', note: 'New: hover a Recent line to save it on top (bookmark) or remove it (×, or Delete)' },
  { id: 'search-recent-queries', wmType: 'woke-search', name: 'Search', note: 'New: your last 3 searches wait under Recent, even ones you only looked at. Enter or a click puts one back' },
  { id: 'valdo-map-skips', wmType: 'price-check', name: 'Price check', note: 'New: on a Valdo map, set a mod Not and listings with it are hidden; remembered per profile' },
  { id: 'search-type-to-open', wmType: 'woke-search', name: 'Search', note: 'New: with the overlay open, just start typing to search' },
  { id: 'item-menu-more', wmType: 'woke-search', name: 'Search', note: 'New: right-click any item, then More, to search it: where it drops, recipes, your sales' },
  { id: 'search-keys-list', wmType: 'woke-search', name: 'Search', note: 'New: type "keys" for every hotkey you have set and every mouse trick, in one list' },
  { id: 'valdo-map-lookup', wmType: 'woke-search', name: 'Search', note: 'New: type "valdo headhunter" to price check Valdo maps with that reward' },
  { id: 'price-check-exchange-ladder', wmType: 'price-check', name: 'Price check', note: 'New: exchange offers as one row per price, what N would cost, and a Whisper with an amount on each seller' },
  { id: 'price-unit-flip', wmType: 'price-check', name: 'Price check', note: 'New: click the poe.ninja price to show it per divine ("44,469 per div") or in chaos' },
  { id: 'map-price-check-add-number', wmType: 'price-check', name: 'Price check', note: 'New: a map\'s + tile adds a number it hasn\'t got (More Maps, Div cards...) to the search' },
  { id: 'div-card-rarity', wmType: 'price-check', name: 'Price check', note: 'New: a div card\'s price check and tooltip say how rare it is, like "1 in 121k cards"' },
  { id: 'map-price-check-kind', wmType: 'price-check', name: 'Price check', note: 'New: a map\'s price check searches its own kind (Originator, Elder...) or one you pick, every mod in one list' },
  { id: 'price-check-map-stat-columns', wmType: 'price-check', name: 'Price check', note: 'New: a map\'s ticked Rarity, Pack and More Currency show as columns in the results, higher or lower than yours' },
  { id: 'price-check-card-stack', wmType: 'price-check', name: 'Price check', note: 'New: beside a card, what a full stack gives and the gain' },
  { id: 'price-check-gem-kinds', wmType: 'price-check', name: 'Price check', note: 'New: beside a gem, its transfigured kinds, priced' },
  { id: 'price-check-chance-uniques', wmType: 'price-check', name: 'Price check', note: 'New: beside a normal base, the uniques an Orb of Chance can make' },
  { id: 'price-check-vault-rewards', wmType: 'price-check', name: 'Price check', note: 'New: beside a Templar Vault reward, its vault and the other rewards in it' },
  { id: 'price-check-boss-uniques', wmType: 'price-check', name: 'Price check', note: "New: beside a Delve, Abyss or league boss's unique, the boss and its other uniques" },
  { id: 'price-check-related-exalts', wmType: 'price-check', name: 'Price check', note: 'New: beside a currency, every kind of it (all the exalts) and the cards that give a stack of it' },
  { id: 'price-check-related-upgrades', wmType: 'price-check', name: 'Price check', note: 'New: beside a unique, its upgrade, where it drops and the cards that give it, with prices' },
  { id: 'scrying-helper', wmType: 'woke-scrying', name: 'Scrying', note: 'New: which map to scry, ranked by the cards a Scrying Orb adds per map, with the orb\'s price and a Buy link' },
  { id: 'price-check-unique-recipe', wmType: 'price-check', name: 'Price check', note: 'New: a recipe part (Lost Unity rings) lists the other parts and what they make, with prices' },
  { id: 'listed-reprice', wmType: 'woke-net-worth', name: 'Net worth', goto: 'listed', note: 'New: price check an item you have listed and set its new price at the foot' },
  { id: 'runs-crafting-session', wmType: 'woke-net-worth', name: 'Net worth', goto: 'runs', note: 'New: a Crafting run: what you made, the orbs used and what sold, with its profit' },
  { id: 'per-hour-hideout-apart', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: crafting and selling in hideout no longer count against per hour. Shown apart, with your sales' },
  { id: 'net-worth-chart-faustus-band', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: the chart shows what you have at Faustus on top, sales as coins, and your maps (Maps)' },
  { id: 'glance-bar-default', wmType: 'woke-session-analytics', name: 'Session analytics', settingsPage: 'Sessions', note: 'New: a thin bar at the top while mapping. Off in Settings' },
  { id: 'glance-bar-fields', wmType: 'woke-session-analytics', name: 'Session analytics', settingsPage: 'Sessions', note: 'New: pick what the in-map glance bar shows, and keep it up while a run goes' },
  { id: 'forbidden-pair-finder', wmType: 'woke-forbidden', name: 'Forbidden pair finder', note: 'New: the Forbidden Flame and Flesh notables your build can take, with what each pair costs' },
  { id: 'price-check-ninja-trust', wmType: 'price-check', name: 'Price check', note: 'New: the instant card says when poe.ninja\'s price looks fake, with the item\'s usual price' },
  { id: 'price-check-seller-spread', wmType: 'price-check', name: 'Price check', note: 'New: exchange prices show what sellers ask, like "1 to 15c, most ask 10c"' },
  { id: 'price-check-unid-vs-id', wmType: 'price-check', name: 'Price check', note: 'New: unid Watcher\'s Eye and other gamble jewels show unid price vs identified versions' },
  { id: 'map-farming-goal', wmType: 'woke-map-mods', name: 'Map mods', goto: 'planner', note: 'New: pick Currency or Maps & Threads on a map\'s price check, and the numbers that matter start on' },
  { id: 'div-card-map-chance', wmType: 'woke-search', name: 'Search', note: 'New: type a map to see how likely each of its cards is, and what one is worth on average' },
  { id: 'listed-sales-leave-out', wmType: 'woke-net-worth', name: 'Net worth', goto: 'listed', note: 'New: hover a listing for ⊘ to leave it out of the Listed total (Sales too)' },
  { id: 'deck-card-line-item', wmType: 'woke-stacked-decks', name: 'Stacked decks', note: 'New: click a card\'s value to set your price; hover it to leave it out of Got and Result' },
  { id: 'analytics-line-item', wmType: 'woke-session-analytics', name: 'Session analytics', note: 'New: right-click a map\'s loot for your price or to leave it out' },
  { id: 'profit-line-item', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'New: click a price to set your own; hover a row to leave it out. Changed lists what you edited' },
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
