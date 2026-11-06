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
      { label: 'Listing tooltip', module: 'apt-price-check', shot: 'hl-price-tooltip', text: 'Hover a listing to see the item as the game shows it, with mod tiers and how good each roll is.', alt: 'Tooltip of a listed body armour with the tier and roll quality of each mod' }
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
      { label: 'Gear and links', module: 'pob-builds', shot: 'hl-pob-gear', text: 'Your gear and gem links from your PoB folder, with item tooltips and the passive tree a click away.', alt: 'A build\'s gear tab with an item tooltip and buttons for Path of Building and the passive tree' },
      { label: 'Levelling', module: 'pob-builds', shot: 'hl-pob-levelling', text: 'Gems by level, and where to get each one.', alt: 'A build\'s leveling tab: gem links, and each gem by level with its vendor or quest' }
    ]
  },
  {
    id: 'market',
    name: 'Market',
    tag: 'Know what pays',
    slides: [
      { label: 'Flips', module: 'scarab-flip', shot: 'hl-flips', text: 'Vendor recipes and Harvest rerolls that pay today, sorted by profit.', alt: 'Flips window: scarabs worth vendoring, with price, profit and supply' },
      { label: 'Stash highlighter', module: 'scarab-flip', shot: 'hl-stash-outlines', text: 'Bind a key or click the icon, and what is worth flipping gets outlined right in your stash tab, with the profit on each.', alt: 'A scarab stash tab with the worthwhile stacks outlined and their profit' },
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
      { label: 'Lab run', module: 'lab', shot: 'hl-lab', text: 'Today\'s layout stays one hover away while you run.', alt: 'Today\'s Normal Labyrinth layout in a card under a small icon' }
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
