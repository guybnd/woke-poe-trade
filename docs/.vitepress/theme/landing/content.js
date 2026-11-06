// The landing page's words. `shot` is a picture in public/shots/, taken by
// testing/e2e/landing-shots.spec.ts and landing-highlights.spec.ts (the real
// overlay over a real game frame). `module` is the app's module id
// (renderer/src/web/woke/modules.ts): modules with a slide stay off the plain
// list at the end, which comes from the app itself so it can't drift.
// `focus` is what a phone shows of the shot: [x, y, width] measured as if the
// shot were 2560x1440 (smaller shots are scaled), a 4:5 box on the window that matters (docs/scripts/phone-shots.mjs).
// Keep the width near 900 so its text stays readable on a phone.

export const REPO = 'https://github.com/guybnd/woke-poe-trade'
export const DOWNLOAD = `${REPO}/releases/latest`

export const HIGHLIGHTS = [
  {
    id: 'price-check',
    name: 'Price Check',
    tag: 'See what you are up against',
    slides: [
      { label: 'Competing listings', module: 'apt-price-check', shot: 'hl-price-columns', focus: [850, 300, 880], text: 'Every listing beside yours, stat by stat. Green where yours is better, red where theirs is.', alt: 'Price check of a body armour: eight listings with energy shield, resistances and life compared to yours' },
      { label: 'Listing tooltip', module: 'apt-price-check', shot: 'hl-price-tooltip', focus: [1060, 90, 920], text: 'Hover a listing to see the item as the game shows it, with mod tiers and a line under each mod showing how good its roll is.', alt: 'Tooltip of a listed body armour with the tier and roll quality of each mod' },
    ]
  },
  {
    id: 'quick-search',
    name: 'Quick Search',
    tag: 'Ctrl+Space, from anywhere',
    slides: [
      { label: 'Any price', shot: 'hl-search-price', focus: [180, 130, 900], text: 'Press Ctrl+Space and type. Any item\'s price now, a day ago and a week ago, without leaving the game.', alt: 'Search palette on Mageblood: each variant\'s price now, 24 hours ago and 7 days ago, with buttons for the wiki, poedb and the trade site' },
      { label: 'Compare', shot: 'hl-search-compare', focus: [190, 140, 900], text: 'Pin a few prices to keep them side by side while you look up the next one.', alt: 'Search palette with Divine Orb, Headhunter and Mirror of Kalandra pinned along the top' },
      { label: 'Item on hover', shot: 'hl-search-hover', focus: [560, 200, 900], text: 'Hover a result to see the item as the game shows it, with its price.', alt: 'Search palette with the Headhunter tooltip shown over its result' },
      { label: 'Tools and settings', shot: 'hl-search-tools', focus: [190, 150, 900], text: 'It finds tools, actions and settings too. Paste an item from chat and it opens in price check.', alt: 'Search palette for "filter": the loot filter tool, a reload action with its hotkey, and the settings page' }
    ]
  },
  {
    id: 'loot-filter',
    name: 'Loot Filter',
    tag: 'Fix it mid-map',
    slides: [
      { label: 'Alt+F on an item', module: 'loot-filter', shot: 'hl-filter-item', focus: [820, 100, 900], text: 'Hover any drop, press Alt+F, and you are on its rule. Hide it, re-tier it or restyle it.', alt: 'A pair of rare boots on the ground, beside the filter rule card for them with its tier and look' },
      { label: 'The editor', module: 'loot-filter', shot: 'tour-filter-rules', focus: [680, 280, 900], text: 'Every tier styled as it drops. Save, and it reloads in game.', alt: 'Loot filter editor: the currency tiers with their game-styled labels' },
      { label: 'Price updates', module: 'loot-filter', shot: 'hl-filter-moves', focus: [300, 280, 900], text: 'Today\'s poe.ninja prices show which items should change tier. Tick the moves you want, and it saves and reloads in game.', alt: 'Loot filter prices tab: 143 items that would move tier, each with its price and a tick box' },
      { label: 'Safety net', module: 'loot-filter', shot: 'tour-filter-prices', focus: [380, 200, 900], text: 'A safety net shows anything valuable your filter would hide, so a price jump does not cost you a drop.', alt: 'Loot filter prices tab: a hidden Headhunter caught by the safety net' }
    ]
  },
  {
    id: 'pob',
    name: 'Path of Building',
    tag: 'Your build, no alt-tab',
    slides: [
      { label: 'Gear and links', module: 'pob-builds', shot: 'hl-pob-gear', focus: [800, 130, 920], text: 'Your gear and links from PoB. Search any item to price check it.', alt: 'A build\'s gear tab with an item tooltip and a price check button on each item' },
      { label: 'Levelling', module: 'pob-builds', shot: 'hl-pob-levelling', focus: [780, 220, 900], text: 'Gems by level, and where to get each one.', alt: 'A build\'s leveling tab: gem links, and each gem by level with its vendor or quest' },
      { label: 'Next step', module: 'pob-builds', shot: 'hl-pob-next', focus: [770, 160, 900], text: 'What changes in your next tree, gems and gear, before you get there.', alt: 'The Next section of a build: new passive points, gems to add and drop, and the gear that changes' },
      { label: 'Passive tree', module: 'pob-builds', shot: 'hl-pob-tree', focus: [900, 190, 1000], text: 'The tree right in the overlay: your points in gold, new ones in green, respecs in red.', alt: 'Passive tree panel with allocated paths, new points and a list of what the next tree adds and removes' },
      { label: 'Stage costs', module: 'pob-builds', shot: 'hl-pob-costs', focus: [770, 150, 900], text: 'What the uniques in each stage of the build cost at poe.ninja prices, with the rares to search for.', alt: 'Gear tab with the cost of each stage, and one stage opened to its uniques and rares' },
      { label: 'Compare builds', module: 'pob-builds', shot: 'hl-pob-compare', focus: [690, 0, 1150], text: 'Right-click a build to compare it with the one you have open: stats, gear, gems and tree.', alt: 'Compare builds panel: the gear that differs, the gems only one has, and tree differences' },
      { label: 'Swap check', module: 'pob-builds', shot: 'hl-pob-swap', focus: [800, 128, 1100], text: 'Price check a piece of gear and compare its numbers to what your build wears.', alt: 'Price check of a body armour with a tooltip comparing its numbers to the build\'s body armour' },
      { label: 'Build icon', module: 'pob-builds', shot: 'hl-pob-hover', focus: [680, 315, 900], text: 'Your links, next tree, pantheon and stats, one hover away, even in a map.', alt: 'A small dock icon with a card showing the build\'s links and next tree' }
    ]
  },
  {
    id: 'market',
    name: 'Market',
    tag: 'Vaalstreet broker terminal in-game',
    slides: [
      { label: 'Flips', module: 'scarab-flip', shot: 'hl-flips', focus: [310, 100, 900], text: 'Vendor recipes and Harvest rerolls that pay today, sorted by profit.', alt: 'Flips window: scarabs worth vendoring, with price, profit and supply' },
      { label: 'Stash highlighter', module: 'scarab-flip', shot: 'hl-stash-outlines', focus: [0, 190, 1000], text: 'Outlines what is worth flipping in the open tab, with the profit on each.', more: 'Bind a key or click the icon. Scarab tabs work at any size; Delirium, Delve, Essence and Blight tabs from 1080p up.', alt: 'A scarab stash tab with the worthwhile stacks outlined and their profit' },
      { label: 'Disenchant', module: 'disenchant', shot: 'hl-disenchant', focus: [380, 140, 1040], text: 'Every unique ranked by Thaumaturgic Dust per chaos at today\'s prices, with the gold fee if you want it counted.', alt: 'Disenchant window: uniques ranked by dust per chaos, with price, dust and gold fee' },
      { label: 'Boss runs', module: 'boss-runs', shot: 'tour-boss-runs', focus: [600, 140, 1040], text: 'Every boss costed from entry and drops, per run and per hour, with a luck check.', alt: 'Boss runs window: Uber Atziri loot, profit per run and the luck check' },
      { label: 'Price tracker', module: 'market', shot: 'tour-market', focus: [80, 120, 900], text: 'poe.ninja prices kept as history on your PC, with movers and a watchlist.', alt: 'Market tracker watchlist with a gem\'s tooltip, beside the flips window' },
      { label: 'Lab gems', module: 'lab-gems', shot: 'hl-lab-gems', focus: [300, 100, 900], text: 'What each Divine Font roll is worth today, by gem colour and level.', alt: 'Lab gems window: value of red, green and blue gems at each level and quality' },
      { label: 'Investments', module: 'league-invest', shot: 'hl-invest', focus: [100, 30, 920], text: 'What rose most reliably from this day in past leagues, split across your budget.', alt: 'League investments window: a suggested split of a 5 divine budget, and items ranked by how often they rose' }
    ]
  },
  {
    id: 'on-screen',
    name: 'On Your Screen',
    tag: 'Only when it matters',
    slides: [
      { label: 'Trades', module: 'trade', shot: 'hl-trade', focus: [740, 320, 760], text: 'Whispers become cards with the stash spot. Invite, trade, thank and kick in a click.', alt: 'Trade card in the hideout: buyers with the item, price and stash position' },
      {
        label: 'League mechanics',
        module: 'mechanics',
        // A folder, like one in the stash: its own row of plates, one per mechanic.
        folder: [
          { label: 'Expedition', shot: 'hl-expedition', focus: [700, 380, 720], text: 'Each vendor\'s currency priced, with whoever is here on top.', alt: 'Expedition card: Tujen is here, with Exotic Coinage and the other currencies priced' },
          { label: 'Betrayal', shot: 'hl-betrayal', focus: [80, 160, 920], text: 'Star the Syndicate slots you want, and it tells you who to move when you meet them.', alt: 'League mechanics window on Betrayal: each member and slot with its reward and price, some starred' },
          { label: 'Harvest', shot: 'hl-mech-harvest', focus: [700, 400, 720], text: 'Which lifeforce colour to open, priced per 100.', alt: 'Harvest card: the three lifeforce colours priced per 100, Wild on top' },
          { label: 'Delve', shot: 'hl-mech-delve', focus: [700, 400, 720], text: 'Fossils ranked by price, so you only detour for the ones on top.', alt: 'Delve card: Fractured, Faceted and Glyphic Fossil priced' },
          { label: 'Blight', shot: 'hl-mech-blight', focus: [700, 420, 720], text: 'Every oil priced, top tier first.', alt: 'Blight card: Tainted, Golden and Prismatic Oil priced' },
          { label: 'Delirium', shot: 'hl-mech-delirium', focus: [700, 420, 720], text: 'Delirium orbs ranked while the fog is up.', alt: 'Delirium card: Kalguuran, Fine and Skittering Delirium Orb priced' },
          { label: 'Ritual', shot: 'hl-mech-ritual', focus: [60, 120, 900], text: 'Omens ranked by price, so you know which ones to defer for.', alt: 'League mechanics window on Ritual: omens ranked by price, Omen of Fortune on top' },
          { label: 'Bestiary', shot: 'hl-mech-bestiary', focus: [700, 400, 720], text: 'When Einhar shows up, which beasts are worth catching.', alt: 'Bestiary card: Wild Brambleback, Fenumal Plagued Arachnid and Vivid Vulture priced' }
        ]
      },
      { label: 'Campaign', module: 'campaign', shot: 'hl-campaign', focus: [720, 430, 800], text: 'Your zone, your level against it, the next steps and your run timer.', alt: 'Campaign card: the current zone, level and the next steps' },
      { label: 'Challenges', module: 'challenges', shot: 'hl-challenges', focus: [700, 420, 720], text: 'Your count and what is next, on one small icon.', alt: 'Challenges card under a small icon: 23 of 40 and the next three' },
      { label: 'Lab run', module: 'lab', shot: 'hl-lab', focus: [900, 65, 1100], text: 'Today\'s layout stays one hover away while you run.', alt: 'Today\'s Normal Labyrinth layout in a card under a small icon' },
      { label: 'Drop counter', module: 'drop-counter', shot: 'hl-drop-counter', focus: [700, 330, 760], text: 'A tally of the drops you care about. Press +1 while you play, and maps count themselves.', alt: 'Drop counter card: maps run, and Divine Orb, Exalted Orb and Annulment counts with how long since the last' },
      { label: 'Death recap', module: 'death-recap', shot: 'hl-death-recap', focus: [720, 220, 900], text: 'Where you died, how long in, and the mods of the map if you checked it first.', alt: 'Death recap card: Cemetery, first death, time since entering and the map\'s mods' }
    ]
  },
  {
    id: 'maps',
    name: 'Maps',
    tag: 'Know before you run it',
    slides: [
      { label: 'Map scan', module: 'map-scan', shot: 'hl-map-scan', focus: [500, 0, 1152], text: 'Press Alt+S on a map. It reads the tooltip and flags the mods you said to watch.', alt: 'Map scan reading a T16 map tooltip and marking it CARE for max res down' },
      { label: 'Essence scan', module: 'essence-scan', shot: 'hl-essence-scan', focus: [500, 0, 1152], text: 'Press Alt+E on a monolith to see whether corrupting it pays, at today\'s prices.', alt: 'Essence scan beside a monolith, saying CORRUPT with what each essence is worth' },
      { label: 'Atlas strategies', module: 'atlas', shot: 'hl-atlas', focus: [700, 150, 900], text: 'Each strategy\'s tree, priced scarabs, map device and regex, in one place.', alt: 'Atlas strategies window: an essence strategy with its scarabs, map device, notes and what to allocate' }
    ]
  },
  {
    id: 'regex',
    name: 'Regex',
    tag: 'Stop typing stash searches',
    slides: [
      { label: 'Maker', module: 'map-mods', shot: 'hl-regex-maker', focus: [780, 60, 1010], text: 'Pick the map mods you avoid and want, and get the stash search for them.', alt: 'Map mods window: avoid, careful and want choices and the search string it builds' },
      { label: 'Clipboard', module: 'regex-library', shot: 'hl-regex-clipboard', focus: [400, 120, 880], text: 'Your saved strings and the classics, one click from the stash search.', alt: 'Regex library with saved stash search strings' }
    ]
  },
  {
    id: 'setup',
    name: 'Your Setup',
    tag: 'Only the tools you play with',
    slides: [
      { label: 'Pick your tools', shot: 'hl-setup', focus: [0, 0, 1000], text: 'Start from a preset, then switch each tool on or off. A tool that is off does not load, take hotkeys or poll.', alt: 'First-run setup: presets for how you play, and a switch for each tool' }
    ]
  }
]
