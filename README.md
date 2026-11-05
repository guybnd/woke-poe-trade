<img src="docs/public/shots/readme-banner.webp" alt="Woke PoE Trade: your toolkit, in the game. The overlay open in a map with the market tracker.">

[![Release](https://img.shields.io/github/v/release/guybnd/woke-poe-trade?include_prereleases&color=d4a64a&label=release)](https://github.com/guybnd/woke-poe-trade/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2B-3a6ea5)](https://github.com/guybnd/woke-poe-trade/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-2f8a3a)](LICENSE)
[![Path of Exile 1](https://img.shields.io/badge/Path%20of%20Exile-1-8a4b1c)](https://www.pathofexile.com)

Woke PoE Trade is an overlay for Path of Exile 1. It keeps [Awakened PoE Trade](https://github.com/SnosMe/awakened-poe-trade)'s price check and adds modules for mapping, money, the campaign and trading. Every module is off until you turn it on, so the overlay stays out of the way.

**[Download for Windows](https://github.com/guybnd/woke-poe-trade/releases/latest)** · [Try the demo](https://guybnd.github.io/woke-poe-trade/demo/) · [Website](https://guybnd.github.io/woke-poe-trade/) · [Help](https://guybnd.github.io/woke-poe-trade/quick-start) · [FAQ](https://guybnd.github.io/woke-poe-trade/faq)

<p>
  <img src="docs/public/shots/story-maps.webp" width="49%" alt="Map scan reads a T16 map tooltip and marks it CARE for max res down">
  <img src="docs/public/shots/story-essence.webp" width="49%" alt="Essence scan reads a monolith and says CORRUPT, with the essence prices">
  <img src="docs/public/shots/story-price.webp" width="49%" alt="Price check of a rare ring with low and current roll presets">
  <img src="docs/public/shots/story-loot.webp" width="49%" alt="The loot filter rule for the hovered Divine Orb, with quick fixes">
</p>

## Modules

Pick a preset on first run (Mapper, Leveling, Trader, Everything or Price check only), then switch modules one by one in Setup. A module that's off doesn't load, doesn't register hotkeys and doesn't poll anything.

<!-- modules:start (checked against renderer/src/web/woke/modules.ts by renderer/test/woke/readme.test.ts) -->
| Area | Module | What it does |
| --- | --- | --- |
| Economy | Market | Movers and watchlist from poe.ninja |
| Economy | Investments | League-start buys ranked from past leagues |
| Economy | Lab gems | Divine Font gem values by colour |
| Economy | Flips | Vendor recipes and Harvest rerolls worth doing: scarabs, catalysts, delirium orbs and more |
| Economy | Farming | Session profit per hour |
| Economy | Session analytics | Profit per map, strategy and hour over time |
| Economy | Boss runs | Profit per boss kill |
| Mapping | Map mods | Danger strip on price check and map regex |
| Mapping | Map scan | Reads map tooltips on screen |
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

The website lives in [docs/](docs) (VitePress) and deploys to GitHub Pages on push. Its screenshots, and the ones above, are the real overlay drawn over real game screens by `testing/e2e/landing-shots.spec.ts`. To take them again:

```sh
cd docs && npm install                   # the site's fonts, used by the README banner
cd ../testing && WOKE_LANDING_SHOTS=1 npx playwright test landing-shots
```

The [browser demo](https://guybnd.github.io/woke-poe-trade/demo/) is the real overlay build with a small stand-in for the app (`docs/public/demo/shim.js`) that replays what the app sent on the fake game. `docs/scripts/build-demo.mjs` builds it into the site. After the app's messages change, record it again:

```sh
cd testing && WOKE_DEMO_RECORD=1 npx playwright test demo-record
```

## Credits

Built on [Awakened PoE Trade](https://github.com/SnosMe/awakened-poe-trade) by SnosMe (MIT), which also uses [libuiohook](https://github.com/kwhat/libuiohook), [RePoE](https://github.com/brather1ng/RePoE), [poeprices.info](https://www.poeprices.info/) and [poe.ninja](https://poe.ninja/). Lab layouts come from [poelab](https://www.poelab.com/).

Not affiliated with or endorsed by Grinding Gear Games.
