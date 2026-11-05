# How this works

There are 2 main parts of the app:

1. renderer: this is the HTML/Javascript-based UI rendered within the Electron container. This runs Vue.js, a React-like Javascript framework for rendering front-end.
2. main: includes the main app (written in Electron). Handles keyboard shortcuts, brings up the UI and overlays.

Note that these 2 both depend on each other, and one cannot run without the other.

# How to develop

The most up-to-date instructions can always be derived from CI:

[.github/workflows/main.yml](https://github.com/SnosMe/awakened-poe-trade/blob/master/.github/workflows/main.yml)

Here's what that looks like as of 2026-08-01.

```shell
cd renderer
npm ci
npm run dev

# In a second shell
cd main
npm ci
npm run dev
```

# Dev preview (woke)

For quick iteration on Windows: a dedicated clone runs the app in dev mode, with
hot reload for the renderer and an automatic Electron restart for `main/`.

Setup, once: clone the repo to `<folder>\woke-poe-trade-dev` and copy
`scripts\woke-dev.cmd` and `scripts\woke-dev.ps1` to `<folder>`, outside the
clone, so switching branches never touches the running script.

```shell
woke-dev              # restart on the current branch
woke-dev <branch>     # switch to the branch (fetched from origin) and restart
woke-dev status       # show what is running
woke-dev stop         # stop the dev copy
woke-dev packaged     # stop the dev copy and start the packaged build
```

- It stops the packaged build first: all builds share one data folder and
  single-instance lock, so a second copy quits silently.
- It refuses to switch branches while the clone has uncommitted changes, and
  leaves the running app alone when it does.
- It reinstalls dependencies only when a lockfile or patch changed.
- Vite and Electron run detached, so they outlive the shell that started them.
  Logs go to `<folder>\.woke-dev`.
- The tray icon's tooltip reads `Woke PoE Trade DEV (<branch>)` in the dev copy.
- Settings save to the real config, shared with the packaged build, and each
  start keeps a copy in `<folder>\.woke-dev\config-backups`. Branches from before
  this change don't save. A plain `npm run dev` never saves. Theme, scale and
  other browser-stored preferences are separate for dev and packaged.
- A DevTools
  window opens alongside the overlay.
- The overlay can be inspected on the debug port `127.0.0.1:9333`.

# Testing (woke)

Every pull request runs `.github/workflows/test.yml`: unit tests
(`cd renderer && npm test`), type checks, and the fake-game tests, where the
real app runs against a fake Path of Exile (hotkeys, clipboard, Client.txt,
screenshots and OCR). See [testing/README.md](testing/README.md) for how to
run them and add scenarios.

# How to build

```shell
cd renderer
npm ci
npm run build

cd ../main
npm ci
npm run build
# We want to sign with a distribution certificate to ensure other users can
# install without errors
CSC_NAME="Certificate name in Keychain" npm run package
```

# Releasing Woke PoE Trade (woke)

The app ships as "Woke PoE Trade": its own app id, data folder
(`%APPDATA%\woke-poe-trade`) and update feed (this repo's GitHub releases), so
it never mixes with a normal Awakened PoE Trade install. On first run it copies
data from `%APPDATA%\awakened-poe-trade` when that folder belongs to an earlier
build of this app (or just the settings when it's plain APT).

1. Bump `version` in `main/package.json`.
2. Push a tag `v<version>` (for example `v0.1.0`).
3. `.github/workflows/release.yml` builds the Windows installer and uploads it
   to a **draft** release. Players and the auto-updater only see it once the
   draft is published on GitHub.

`npm run package` in `main/` downloads the OCR data into `main/build/cv-ocr`
first (`build/fetch-ocr.mjs`), so map scan, essence scan and heist gem OCR work
without a manual download.

Useful flags: `--setup` opens the first-run setup window again, `--no-updates`
turns off update downloads. Crash reports are saved in
`%APPDATA%\woke-poe-trade\crash-reports`.
