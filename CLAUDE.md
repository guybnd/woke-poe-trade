# Checks and tests: don't stutter the game

Guy plays Path of Exile on the same PC while threads work. Heavy local checks make the game stutter, so:

- **Run checks with `scripts\woke-check.cmd`, not npm/npx directly.** With PoE open it pushes the branch and waits for the Tests workflow on GitHub; with PoE closed it runs locally at below-normal priority, testing only what the branch reaches. See "Checks while playing" in DEVELOPING.md.
- While PoE is open (any `PathOfExile*` process), don't run full suites, type checks, `vite build`, Playwright or packaging locally. Leave them to CI.
- One targeted test while iterating is fine: `npx vitest run <file>` from `renderer/` or `testing/`. Local runs are capped at 4 workers (Playwright at 2); `WOKE_TEST_WORKERS` changes that, but don't raise it while PoE is open.
- Stop what you start. Before you end, kill the dev servers, watchers and `tail -F`/`grep` monitors you launched. They outlive the thread and keep using CPU.

# Every line item has a hover tooltip

Guy's standing rule: any row or chip that names an item, mod, sale or listing shows a proper tooltip on hover. Items use the standard game item tooltip: render the row with `WItemRow`, or put `v-item-tip="{ name, type?, variant? }"` on it (see "Item tooltip" in `renderer/src/web/woke/ui/README.md`). A sale or listing row is its item's row: same tooltip.

- It is gated. Every fake-game test fails if a visible text that is exactly an item's name (unique, base, gem, currency, card) isn't inside an element with the item tooltip (`testing/e2e/tip-audit.ts`). A new list therefore needs a fake-game spec that shows it with real rows, or the gate never sees it.
- Code that calls `showTip`/`showTipAt` with an item by hand puts `data-item-tip` on the hovered element (`v-item-tip` does it for you).
- A name that rightly has no item tooltip takes `data-no-item-tip="<why>"` on it or a parent. The reason is required, and the exemption must be a real one (the price check's own heading, the item already in a tooltip), not a missing feature.
- Mod rows aren't detected automatically yet: give them their tooltip by hand.

# Every new feature goes in What's new

Guy's standing rule: a PR that adds a feature a player would want to know about adds a line to `NEWS` in `renderer/src/web/woke/tab-bar/news.ts`. That one line drives everything players who update see: the dock's What's new icon (each line with a "Show me" button and a dismiss button), the NEW seal on the tool in All tools, and the count on the rail's All tools button. New installs see none of it.

- `id`: new and unique, and never changed later (it's what "seen" remembers).
- `wmType`: the tool that "Show me" opens. `goto`: the tab it opens on, from that tool's entry in `tab-bar/goto-targets.ts`; a tool with tabs there must name one. A feature on a tab not listed yet: add the tab there and a handler in the tool's `useGoto` (the type check asks for it). Set `settingsPage` instead when the feature lives in Settings. When the feature is one part of a tab (a column, a chip, a box, a folded section), also give it a spot: list the spot under the tool in `GOTO_SPOTS` and the line's id in `NEWS_SPOTS` (both in `goto-targets.ts`; kept off the line so startup JS doesn't grow), put `data-goto-spot="<spot>"` on the element, and give `useGoto`'s `spots` a handler that reveals it (unfold, pick the chip). Show me then scrolls to it and flashes it; without a spot, a player already on that tab sees nothing happen. A feature with no tab to open (the price check, Ctrl+Space) gets a sample in `NEWS_DEMOS` (`tab-bar/news-demos.ts`): a price check of an item that shows it, with the spot to flash, or a Ctrl+Space query. Settings only when the feature is a setting. Guy's rule: Show me shows the feature, or isn't offered. A price check line with no sample gets no Show me (`hasShowMe` in `news-demos.ts`; `news.test.ts` fails a price check line that points at Settings).
- `name`: the tool's name. `note`: one short line, starting "New: ". `since`: the release the line ships in, `main/package.json`'s version with patch + 1 (check again if a release went out before your PR merged). New lines go at the top: `NEWS` is newest first. The line stops showing two releases later on its own. A Price check line also needs a `topic` (Tooltips, Maps, Prices & search, Related): the dock card folds Price check by it.
- Bug fixes and polish don't get a line. Expired lines can be taken out of `NEWS` whenever convenient.
- `renderer/test/woke/news.test.ts` checks that every line is well formed, that its `goto` is a real tab, its spot is on that tab and its `settingsPage` is a real page. Each Show me click and the jump it makes are written to the app log as `[ui]` lines (Settings › Debug, and the log in Report an issue). Tests read `NEWS` instead of counting lines, so adding one breaks nothing.
- One feature, one line: a tool can have several (Net worth has several), and each shows on its own in the dock.
