# Automated in-game testing

The toolkit's checks, so a change is tested before anyone opens the game.
Five layers, all run by CI on every pull request (`.github/workflows/test.yml`),
except that a pull request touching only the website skips them, and pushes to
master always run everything:

| Layer | Where | What it covers |
| --- | --- | --- |
| Unit tests | `renderer/test` (vitest) | Item parsing, map stash regex against every map mod, campaign route walked end to end, Client.txt parsing (farming, mechanics, lab, trade whispers), loot filter parse/match/edits, poe.ninja, trade insight, essences, boss runs, league-start investments |
| OCR tests | `testing/vision` (vitest) | APT's opencv + tesseract reading map tooltips and essence monoliths from screenshots |
| Fake-game tests | `testing/e2e` (Playwright) | The real app on a fake Path of Exile: hotkeys, clipboard, Client.txt, screenshots, the overlay, settings on disk |
| Performance checks | `testing/perf` (Playwright) | Every module on: startup, idle in a map, opening the overlay, price check, memory, against budgets (see perf/README.md) |
| Real Electron smoke test | `testing/electron` (`npm run test:electron`, under `xvfb-run`) | The actual Electron app laid out like the installer: overlay page loads and mounts, `<webview>` loads a page, Electron process count and memory against `electron/budgets.json`. Catches Electron upgrades and Chromium switches the browser-based tests can't see |

## The fake game

`fake-host/` bundles main's real code (server, hotkeys, Client.txt watcher,
screen scanner, toolkit handlers) with Electron, the overlay window and the
keyboard/mouse hook swapped for a fake game (`fake-host/game.ts`):

- a game window with focus and a screen (any PNG),
- a keyboard: keys the app presses are recorded; Ctrl+C copies the hovered
  item, chat lines and stash searches typed by the app are collected,
- a mouse the app's hook sees (dock icon hovers, map scan cursor),
- a Client.txt the tests append to,
- a clipboard,
- poe.ninja and the trade site answered from `fixtures/http`.

The built overlay (`renderer/dist`) runs in Chromium against it, as it would
inside Electron. Each test boots the overlay with the widgets it needs:

```ts
test('Alt+S scans the hovered map', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-map-scan' }] })
  await overlay.showScreen('screens/map-real-07.png')
  await overlay.moveMouse(605, 810)
  await overlay.pressHotkey('Alt + S')
  await expect(overlay.page.getByText('CARE')).toBeVisible()
})
```

A page error in the overlay fails the test.

## Running

```sh
cd renderer && npm ci && npm test        # unit tests
npx vite build                           # the overlay the fake-game tests load

cd ../main && npm ci --ignore-scripts    # main's code for the fake app
cd ../testing && npm ci
npm run get:ocr                          # once: APT's OCR files into .cache/
npm run test:main                        # OCR tests
npx playwright test                      # fake-game tests
npx playwright show-report report        # screenshots of every scenario
npm run test:perf                        # performance checks (perf/README.md)
```

`WOKE_SNAP_DIR=some/folder npx playwright test` also saves every
`overlay.snap()` screenshot as a file.

## Fixtures

- `client-logs/`: Client.txt excerpts. Real ones are best: copy the lines
  from `Path of Exile/logs/Client.txt`, replace character and account names,
  and keep a `#` comment on top saying what happens.
- `items/`: item text as Ctrl+Alt+C copies it in game (advanced format).
- `screens/`: real 2560x1440 game screenshots (blacked out away from the
  tooltip) plus a `.json` with the cursor position and what should be read.
  `main/ocr-bench` reads the same files and reports accuracy; its README
  says how to add one. `essence-real-two` puts two real monolith labels in
  one frame for the whole-screen read.
- `http/`: recorded responses, `fixtures/http/<host>/<path>[.post].json`,
  with `_any.json` for any path in that folder. poe.ninja prices come from
  `tools/make-ninja-fixture.mjs`. Requests without a fixture are listed in
  the test's report.
- `filters/`: a small filter in NeverSink's format.

## Known gaps the tests mark

- Two essence screenshots have a monster health bar over the label and read
  wrong; their `.json` has `knownMiss`, and the test expects the miss.
- Map scan reads from the first property line down, so the tier in the
  header ("Map (Tier 16)") isn't read or checked.
- 31 map mods can't be put in a stash search (every word of them is also in
  another mod). `renderer/test/woke/map-mods.test.ts` keeps the list from
  growing.
