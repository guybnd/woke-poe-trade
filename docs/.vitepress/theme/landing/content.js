// The landing page's words. `shot` is a picture in public/shots/, taken by
// testing/e2e/landing-shots.spec.ts and landing-highlights.spec.ts (the real
// overlay over a real game frame). `module` is the app's module id
// (renderer/src/web/woke/modules.ts): modules with a slide stay off the plain
// list at the end, which comes from the app itself so it can't drift.

export const REPO = 'https://github.com/guybnd/woke-poe-trade'
export const DOWNLOAD = `${REPO}/releases/latest`

export const HIGHLIGHTS = [
  {
    id: 'price-check',
    name: 'Price Check',
    tag: 'See what you are up against',
    slides: [
      { label: 'Competing listings', module: 'apt-price-check', shot: 'hl-price-columns', text: 'Every listing beside yours, stat by stat. Green where yours is better, red where theirs is.', alt: 'Price check of a body armour: eight listings with energy shield, resistances and life compared to yours' },
      { label: 'Listing tooltip', module: 'apt-price-check', shot: 'hl-price-tooltip', text: 'Hover a listing to see the item as the game shows it, with mod tiers and how good each roll is.', alt: 'Tooltip of a listed body armour with the tier and roll quality of each mod' },
      { label: 'Roll bars', module: 'apt-price-check', shot: 'hl-price-bars', text: 'Shift + scroll over a listing swaps the ranges for a bar on every roll, so you see how close each one came.', alt: 'The same listing tooltip with a coloured bar and percentage for each rolled number' }
    ]
  },
  {
    id: 'loot-filter',
    name: 'Loot Filter',
    tag: 'Fix it mid-map',
    slides: [
      { label: 'Alt+F on an item', module: 'loot-filter', shot: 'hl-filter-item', text: 'Hover any drop, press Alt+F, and you are on its rule. Hide it, re-tier it or restyle it.', alt: 'A pair of rare boots on the ground, beside the filter rule card for them with its tier and look' },
      { label: 'The editor', module: 'loot-filter', shot: 'tour-filter-rules', text: 'Every tier styled as it drops. Save, and it reloads in game.', alt: 'Loot filter editor: the currency tiers with their game-styled labels' },
      { label: 'Safety net', module: 'loot-filter', shot: 'tour-filter-prices', text: 'Today\'s prices re-tier your filter, and a safety net shows anything valuable it would hide.', alt: 'Loot filter prices tab: a hidden Headhunter caught by the safety net' }
    ]
  },
  {
    id: 'pob',
    name: 'Path of Building',
    tag: 'Your build, no alt-tab',
    slides: [
      { label: 'Gear and links', module: 'pob-builds', shot: 'hl-pob-gear', text: 'Your gear and gem links from your PoB folder, with item tooltips. The search on any item opens it in the price check.', alt: 'A build\'s gear tab with an item tooltip and a price check button on each item' },
      { label: 'Levelling', module: 'pob-builds', shot: 'hl-pob-levelling', text: 'Gems by level, and where to get each one.', alt: 'A build\'s leveling tab: gem links, and each gem by level with its vendor or quest' },
      { label: 'Next step', module: 'pob-builds', shot: 'hl-pob-next', text: 'What changes in your next tree, gems and gear, before you get there.', alt: 'The Next section of a build: new passive points, gems to add and drop, and the gear that changes' },
      { label: 'Passive tree', module: 'pob-builds', shot: 'hl-pob-tree', text: 'The tree right in the overlay: your points in gold, new ones in green, respecs in red.', alt: 'Passive tree panel with allocated paths, new points and a list of what the next tree adds and removes' },
      { label: 'Stage costs', module: 'pob-builds', shot: 'hl-pob-costs', text: 'What the uniques in each stage of the build cost at poe.ninja prices, with the rares to search for.', alt: 'Gear tab with the cost of each stage, and one stage opened to its uniques and rares' },
      { label: 'Compare builds', module: 'pob-builds', shot: 'hl-pob-compare', text: 'Right-click a build to compare it with the one you have open: stats, gear, gems and tree.', alt: 'Compare builds panel: the gear that differs, the gems only one has, and tree differences' },
      { label: 'Swap check', module: 'pob-builds', shot: 'hl-pob-swap', text: 'Price check a piece of gear and compare its numbers to what your build wears.', alt: 'Price check of a body armour with a tooltip comparing its numbers to the build\'s body armour' },
      { label: 'Build icon', module: 'pob-builds', shot: 'hl-pob-hover', text: 'Your links, next tree, pantheon and stats, one hover away, even in a map.', alt: 'A small dock icon with a card showing the build\'s links and next tree' }
    ]
  },
  {
    id: 'market',
    name: 'Market',
    tag: 'Know what pays',
    slides: [
      { label: 'Flips', module: 'scarab-flip', shot: 'hl-flips', text: 'Vendor recipes and Harvest rerolls that pay today, sorted by profit.', alt: 'Flips window: scarabs worth vendoring, with price, profit and supply' },
      { label: 'Stash highlighter', module: 'scarab-flip', shot: 'hl-stash-outlines', text: 'Bind a key or click the icon. It sees which tab is open and outlines what is worth flipping, with the profit on each. Scarab tabs work at any size; Delirium, Delve, Essence and Blight tabs at 1440p.', alt: 'A scarab stash tab with the worthwhile stacks outlined and their profit' },
      { label: 'Boss runs', module: 'boss-runs', shot: 'tour-boss-runs', text: 'Every boss costed from entry and drops, per run and per hour, with a luck check.', alt: 'Boss runs window: Uber Atziri loot, profit per run and the luck check' },
      { label: 'Price tracker', module: 'market', shot: 'tour-market', text: 'poe.ninja prices kept as history on your PC, with movers and a watchlist.', alt: 'Market tracker watchlist with a gem\'s tooltip, beside the flips window' },
      { label: 'Lab gems', module: 'lab-gems', shot: 'hl-lab-gems', text: 'What each Divine Font roll is worth today, by gem colour and level.', alt: 'Lab gems window: value of red, green and blue gems at each level and quality' }
    ]
  },
  {
    id: 'on-screen',
    name: 'On Your Screen',
    tag: 'Only when it matters',
    slides: [
      { label: 'Trades', module: 'trade', shot: 'hl-trade', text: 'Whispers become cards with the stash spot. Invite, trade, thank and kick in a click.', alt: 'Trade card in the hideout: buyers with the item, price and stash position' },
      { label: 'League mechanics', module: 'mechanics', shot: 'hl-expedition', text: 'In Expedition, each vendor\'s currency priced, with whoever is here on top.', alt: 'Expedition card: Tujen is here, with Exotic Coinage and the other currencies priced' },
      { label: 'Campaign', module: 'campaign', shot: 'hl-campaign', text: 'Your zone, your level against it, the next steps and your run timer.', alt: 'Campaign card: the current zone, level and the next steps' },
      { label: 'Challenges', module: 'challenges', shot: 'hl-challenges', text: 'Your count and what is next, on one small icon.', alt: 'Challenges card under a small icon: 23 of 40 and the next three' },
      { label: 'Lab run', module: 'lab', shot: 'hl-lab', text: 'Today\'s layout stays one hover away while you run.', alt: 'Today\'s Normal Labyrinth layout in a card under a small icon' },
      { label: 'Drop counter', module: 'drop-counter', shot: 'hl-drop-counter', text: 'A tally of the drops you care about. Press +1 while you play, and maps count themselves.', alt: 'Drop counter card: maps run, and Divine Orb, Exalted Orb and Annulment counts with how long since the last' },
      { label: 'Death recap', module: 'death-recap', shot: 'hl-death-recap', text: 'Where you died, how long in, and the mods of the map if you checked it first.', alt: 'Death recap card: Cemetery, first death, time since entering and the map\'s mods' }
    ]
  },
  {
    id: 'regex',
    name: 'Regex',
    tag: 'Stop typing stash searches',
    slides: [
      { label: 'Maker', module: 'map-mods', shot: 'hl-regex-maker', text: 'Pick the map mods you avoid and want, and get the stash search for them.', alt: 'Map mods window: avoid, careful and want choices and the search string it builds' },
      { label: 'Clipboard', module: 'regex-library', shot: 'hl-regex-clipboard', text: 'Your saved strings and the classics, one click from the stash search.', alt: 'Regex library with saved stash search strings' }
    ]
  }
]
