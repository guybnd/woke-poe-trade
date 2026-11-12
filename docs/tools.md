---
title: Tools
---

Woke PoE Trade is a set of tools on one overlay. Each one is a module you can switch on or off.

### Finding a tool

- Press `Shift + Space` in game to open the overlay. The rail on the left edge holds your pinned tools and search; the launcher on it lists every tool. You can drag the rail to another edge.
- Many tools also sit as an icon in the icon row while you play. Rest the mouse on an icon to see its card, and click it to open the full window.
- Settings is on the rail too. Each tool's settings are on a page with its name (some pages cover a few related tools), and **All modules** switches tools on and off.
- A tool that's off doesn't load, doesn't register hotkeys and doesn't poll anything.

### Every tool

<!-- modules:start (checked against renderer/src/web/woke/modules.ts by renderer/test/woke/readme.test.ts) -->
| Area | Module | What it does |
| --- | --- | --- |
| Economy | Market | Movers and watchlist from poe.ninja |
| Economy | Investments | League-start buys ranked from past leagues |
| Economy | Lab gems | Divine Font gem values by colour |
| Economy | Flips | Vendor recipes and Harvest rerolls worth doing: scarabs, catalysts, delirium orbs and more |
| Economy | Disenchant | Uniques with the most Thaumaturgic Dust per chaos, to buy and disenchant |
| Economy | Wealthy Exile | The Wealthy Exile net worth site in an overlay window |
| Economy | Farming | Session profit per hour |
| Economy | Drop counter | A tally of the drops you choose, and maps run |
| Economy | Stacked decks | Cards from the Stacked Decks you open: profit, big hits and luck |
| Economy | Session analytics | Profit per map, strategy and hour over time |
| Economy | Boss runs | Profit per boss kill |
| Mapping | Map mods | Danger strip on price check and map regex |
| Mapping | Map scan | Reads map tooltips on screen |
| Mapping | Death recap | Where you died, and the mods of maps you checked |
| Mapping | Essence scan | Reads essence monoliths and flags MEDS |
| Mapping | Loot filter editor | Edit the NeverSink rule for a sampled item |
| Mapping | Atlas strategies | Atlas tree, Threads and regex per strategy |
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
<!-- modules:end -->

### What tools need

- **Client.txt:** tools that follow your zones or chat read the game's log file: campaign, run timer, farming, drop counter, stacked decks, boss runs, death recap, essence scan, loot filter editor, league mechanics and trades. The setup window finds it; change it under Settings, **Game & league**.
- **Screen reading:** map scan, essence scan and death recap read the game screen. The installer ships everything they need.
- **Hotkeys:** each tool's keys are on its Settings page. A few tools start with an Alt key (map mods, map scan, essence scan, loot filter) and search uses `Ctrl + Space`; most others have none until you set one.
- **Prices** come from poe.ninja and the official trade site for the league picked under **Game & league**.
