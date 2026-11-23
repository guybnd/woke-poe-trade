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
- `wmType`: the tool that "Show me" opens. Set `settingsPage` instead when the feature lives in Settings.
- `name`: the tool's name. `note`: one short line, starting "New: ".
- Bug fixes and polish don't get a line. Take lines out after a release or two.
- `renderer/test/woke/news.test.ts` checks that every line is well formed. Tests read `NEWS` instead of counting lines, so adding one breaks nothing.
- One feature, one line: a tool can have several (Net worth has three), and each shows on its own in the dock.
