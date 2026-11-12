---
title: Project Overview
order: 1
---

# Project Overview

woke-poe-trade is a Path of Exile 1 toolkit forked from Awakened PoE Trade (APT). It is built with Electron, Vue and TypeScript.

## Project rules

- **Modules:** each tool is a module in `woke/` (`main/src/woke/`, `renderer/src/web/woke/`), listed in the registry at `renderer/src/web/woke/modules.ts`.
- **The price check is a hard fork of APT's.** About 80 upstream files carry woke changes, most of them marked `woke:`, so upstream code is no longer merged wholesale. Upstream item data still arrives through the hourly "Upstream item data" workflow; parser fixes from upstream are ported by hand. Mark every new change to an upstream file with a `woke:` comment.
- **Woke settings have their own version:** `woke.version` (`WOKE_CONFIG_VERSION` in `woke/modules.ts`), apart from APT's `configVersion`, which keeps upstream's numbering.
- **Mockups first:** every new feature gets design mockups with options, shown to Guy before building.
- **Nothing permanently on screen during gameplay:** situational info sits behind hover icons. Only one-off popups, such as price check, may show by themselves.
- **Tests:** CI runs on every PR, and each feature adds a test or scenario in `testing/`.
- **Performance:** new pollers tick only while needed. CI enforces perf budgets.

## Local setup

- League: the current challenge league (3.30 Covens of Umbra from 13 Nov 2026)
- PoE is installed on F:
