<img src="docs/public/shots/readme-banner.webp" alt="Woke PoE Trade: your toolkit, in the game. The overlay open in a map with the market tracker.">

[![Release](https://img.shields.io/github/v/release/guybnd/woke-poe-trade?include_prereleases&color=d4a64a&label=release)](https://github.com/guybnd/woke-poe-trade/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2B-3a6ea5)](https://github.com/guybnd/woke-poe-trade/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-2f8a3a)](LICENSE)
[![Path of Exile 1](https://img.shields.io/badge/Path%20of%20Exile-1-8a4b1c)](https://www.pathofexile.com)

Woke PoE Trade is an overlay for Path of Exile 1, built on [Awakened PoE Trade](https://github.com/SnosMe/awakened-poe-trade). Switch off any tool and it doesn't load, take hotkeys or poll.

**[Download for Windows](https://github.com/guybnd/woke-poe-trade/releases/latest)** · [Website](https://guybnd.github.io/woke-poe-trade/) · [Help](https://guybnd.github.io/woke-poe-trade/quick-start) · [FAQ](https://guybnd.github.io/woke-poe-trade/faq)

### Price check
Every listing beside yours, stat by stat, and each listing's tiers and rolls on hover.

<p>
  <img src="docs/public/shots/hl-price-columns.webp" width="49%" alt="Price check of a body armour: listings with each stat compared to yours">
  <img src="docs/public/shots/hl-price-tooltip.webp" width="49%" alt="Tooltip of a listed body armour with the tier and roll quality of each mod">
</p>

### Loot filter
Alt+F on an item goes to its rule. Edit any tier in the game and it reloads.

<p>
  <img src="docs/public/shots/hl-filter-item.webp" width="49%" alt="Rare boots on the ground beside their filter rule card">
  <img src="docs/public/shots/tour-filter-rules.webp" width="49%" alt="Loot filter editor with game-styled tiers">
</p>

### Path of Building
Your gear, gem links and gems by level, from your PoB folder. See what your next tree, gems and gear change and what each stage's uniques cost, open the passive tree in the overlay, price check a build's item, compare a checked item to what you wear, and compare two builds.

<p>
  <img src="docs/public/shots/hl-pob-gear.webp" width="49%" alt="A build's gear tab with an item tooltip">
  <img src="docs/public/shots/hl-pob-next.webp" width="49%" alt="A build's Next section with new points, gems and gear">
  <img src="docs/public/shots/hl-pob-tree.webp" width="49%" alt="Passive tree panel with new points and respecs">
  <img src="docs/public/shots/hl-pob-swap.webp" width="49%" alt="Price check comparing a body armour to the build's">
</p>

### Market
Flips that pay today, outlined in your stash tab (Scarab, plus Delirium, Delve, Essence and Blight at 1440p), plus boss runs and lab gems.

<p>
  <img src="docs/public/shots/hl-flips.webp" width="49%" alt="Flips window: scarabs worth vendoring">
  <img src="docs/public/shots/hl-stash-outlines.webp" width="49%" alt="A scarab stash tab with the worthwhile stacks outlined">
  <img src="docs/public/shots/tour-boss-runs.webp" width="49%" alt="Boss runs window: Uber Atziri profit and luck check">
  <img src="docs/public/shots/hl-lab-gems.webp" width="49%" alt="Lab gems window: gem values by colour and level">
</p>

### On your screen
Small icons that open when they matter: trades, league mechanics, campaign, challenges, the lab, your drop tally, your last death.

<p>
  <img src="docs/public/shots/hl-trade.webp" width="49%" alt="Trade card with buyers and the stash position">
  <img src="docs/public/shots/hl-expedition.webp" width="49%" alt="Expedition card with vendor currencies priced">
  <img src="docs/public/shots/hl-campaign.webp" width="49%" alt="Campaign card with the zone and next steps">
  <img src="docs/public/shots/hl-lab.webp" width="49%" alt="Today's labyrinth layout in a card">
  <img src="docs/public/shots/hl-drop-counter.webp" width="49%" alt="Drop counter card with drop counts and maps run">
  <img src="docs/public/shots/hl-death-recap.webp" width="49%" alt="Death recap card with the map's mods">
</p>

### Regex
Make a map stash search from the mods you pick, and keep your saved strings a click away.

<p>
  <img src="docs/public/shots/hl-regex-maker.webp" width="49%" alt="Map mods window and the search string it builds">
  <img src="docs/public/shots/hl-regex-clipboard.webp" width="49%" alt="Regex library with saved stash searches">
</p>

## And many more

Pick a preset on first run (Mapper, Leveling, Trader, Everything or Price check only), then switch modules one by one in Setup. A module that's off doesn't load, doesn't register hotkeys and doesn't poll anything.

<!-- modules:start (checked against renderer/src/web/woke/modules.ts by renderer/test/woke/readme.test.ts) -->
| Area | Module | What it does |
| --- | --- | --- |
| Economy | Market | Movers and watchlist from poe.ninja |
| Economy | Investments | League-start buys ranked from past leagues |
| Economy | Lab gems | Divine Font gem values by colour |
| Economy | Flips | Vendor recipes and Harvest rerolls worth doing: scarabs, catalysts, delirium orbs and more |
| Economy | Farming | Session profit per hour |
| Economy | Drop counter | A tally of the drops you choose, and maps run |
| Economy | Session analytics | Profit per map, strategy and hour over time |
| Economy | Boss runs | Profit per boss kill |
| Mapping | Map mods | Danger strip on price check and map regex |
| Mapping | Map scan | Reads map tooltips on screen |
| Mapping | Death recap | Where you died, and the mods of maps you checked |
| Mapping | Essence scan | Reads essence monoliths and flags MEDS |
| Mapping | Loot filter editor | Edit the NeverSink rule for a sampled item |
| Mapping | Atlas strategies | Tree, scarabs and regex per strategy |
| Mapping | League mechanics | Prices and picks for each league mechanic |
| Campaign & lab | Campaign | Next steps for the act you are in |
| Campaign & lab | Run timer | Act splits and personal bests |
| Campaign & lab | Lab layouts | Today's poelab layout and reset countdown |
| Campaign & lab | Challenge guide | League challenge guide with your progress |
| Builds & trade | PoB builds | Your Path of Building folder |
| Builds & trade | Trade searches | Saved trade site searches |
| Builds & trade | Trades | Trade whispers, quick replies and a sales log |
| Builds & trade | Regex library | Saved stash search strings |
| Price check (Awakened PoE Trade) | Price check hotkeys | Check an item under the cursor |
| Price check (Awakened PoE Trade) | Item info hotkeys | Item info, wiki, poedb, Craft of Exile, similar items |
| Price check (Awakened PoE Trade) | Heist gem OCR | Reads heist gem names; loads the OCR worker on first use |
<!-- modules:end -->

## Quick start

1. Download `Woke-PoE-Trade-Setup-<version>.exe` from the [latest release](https://github.com/guybnd/woke-poe-trade/releases/latest) and run it. It updates itself after that.
2. The setup wizard finds your game folder and asks how you play.
3. In game, `Ctrl + D` prices the item under the cursor and `Shift + Space` opens the overlay. The rail on the left edge holds every tool.

Run Path of Exile in Windowed or Windowed Fullscreen. The [help pages](https://guybnd.github.io/woke-poe-trade/issues) cover the common problems.

## Development

See [DEVELOPING.md](DEVELOPING.md) for running the app from source, and [testing/README.md](testing/README.md) for the tests, including the fake game every pull request runs against.

The website lives in [docs/](docs) (VitePress) and deploys to GitHub Pages on push. Its screenshots, and the ones above, are the real overlay drawn over real game screens by `testing/e2e/landing-shots.spec.ts` and `landing-highlights.spec.ts`. To take them again (the lab gems shot uses live poe.ninja prices):

```sh
cd testing && WOKE_LANDING_SHOTS=1 npx playwright test e2e/landing-shots.spec.ts e2e/landing-highlights.spec.ts
```

The [browser demo](https://guybnd.github.io/woke-poe-trade/demo/) is the real overlay build with a small stand-in for the app (`docs/public/demo/shim.js`) that replays what the app sent on the fake game. `docs/scripts/build-demo.mjs` builds it into the site. After the app's messages change, record it again:

```sh
cd testing && WOKE_DEMO_RECORD=1 npx playwright test demo-record
```

## Credits

Built on [Awakened PoE Trade](https://github.com/SnosMe/awakened-poe-trade) by SnosMe (MIT), which also uses [libuiohook](https://github.com/kwhat/libuiohook), [RePoE](https://github.com/brather1ng/RePoE), [poeprices.info](https://www.poeprices.info/) and [poe.ninja](https://poe.ninja/). Lab layouts come from [poelab](https://www.poelab.com/).

Not affiliated with or endorsed by Grinding Gear Games.
