# Security

## Reporting a problem

Please report security problems privately through [GitHub's private vulnerability reporting](https://github.com/guybnd/woke-poe-trade/security/advisories/new), not in a public issue. Say what you found, how to reproduce it and which version you used. You should hear back within a few days.

Supported: the latest release. Older versions update themselves to it.

## What the app does on your PC

Woke PoE Trade is an overlay for Path of Exile 1, built on [Awakened PoE Trade](https://github.com/SnosMe/awakened-poe-trade). What it can reach, and why:

| What | Why | Where in the code |
| --- | --- | --- |
| Global keyboard hook (libuiohook) | Your hotkeys, and knowing when keys are idle | `main/src/shortcuts/` |
| Simulated key presses | Ctrl+C to copy an item for a price check; pasting a stash search or chat command after you press a key or click. Never the mouse, never more than one in-game action per press | `main/src/shortcuts/text-box.ts`, `Shortcuts.ts` |
| Clipboard | Reading the copied item; it puts your clipboard back afterwards | `main/src/shortcuts/HostClipboard.ts` |
| Screenshots of the game window | Map, essence and stash scans, processed locally (OpenCV/Tesseract) | `main/src/vision/`, `main/src/woke/*-scan*` |
| `Client.txt` (read only) | Zones, trade whispers, deaths for the run timer, trades and farming | `main/src/host-files/GameLogWatcher.ts` |
| Folders you choose | Reading PoB builds and loot filters; writing only a loot filter you edit or a build you import | `main/src/woke/pob-builds.ts`, `loot-filter.ts` |
| Local server on 127.0.0.1:8585 | The overlay page talks to the app. Requests from other web pages and other host names are refused | `main/src/server.ts`, `main/src/host-files/request-guard.ts` |
| Your stash tabs, only if you turn it on | The experimental stash reader (hidden in Settings › Modules, off by default) reads your own stash tabs from pathofexile.com for the Net worth window. You sign in inside the app; the login cookie stays in the app's own cookie store, is never shown, copied or put in a crash report, and is removed when you turn it off | `main/src/woke/personal/` |

Nothing is sent to the developer: no telemetry, analytics or accounts. Crash reports are written to `%APPDATA%\woke-poe-trade\crash-reports`; Report opens a pre-filled GitHub issue with your Windows user name removed, which you read and send yourself.

## Network

The app fetches from, or opens pages of, only the sites a tool you switched on needs: pathofexile.com, poe.ninja, poeprices.info, poelab.com, wealthyexile.com, poewiki.net, poedb.tw, craftofexile.com, poe.how, pathofkalandra.com, pobb.in and pastebin.com (when you import a build), and GitHub (app updates, item data from this repository's `master`, NeverSink filters, GGG's atlas tree export).

Pages from other sites (lab, Wealthy Exile, the trade site, the wiki) open in sandboxed `<webview>` tags: no Node.js, no preload, no permissions beyond copying text, no popups, and no navigation to anything but web pages (`main/src/woke/web-guard.ts`). Links leave the app only as http(s) addresses.

## Builds and updates

- Installers are built by [`.github/workflows/release.yml`](.github/workflows/release.yml) on GitHub's runners from the tagged commit, never on a developer's PC. Each release has a `SHA256SUMS.txt`, and a signed build provenance record you can check with `gh attestation verify <file> -R guybnd/woke-poe-trade`.
- Automatic updates come from this repository's GitHub releases (electron-updater checks the SHA-512 in `latest.yml`). They can be turned off in setup.
- The app is not code-signed yet, so Windows SmartScreen warns on first run. The release workflow signs as soon as a certificate is added to the repository secrets (`WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`).
- GitHub Actions are pinned to commit hashes and kept current by Dependabot.
