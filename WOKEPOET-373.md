---
id: WOKEPOET-373
title: 'Tools launcher overhaul: easier to read'
status: Grooming
priority: None
effort: M
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T11:12:13.177Z'
    comment: Created ticket.
---
> **TL;DR** Guy finds the tools launcher (rail grid button: search box + Economy / Mapping / Campaign & lab / Builds & trade / Overlay columns, icons, pins, "Off" labels) hard to read. Mock options in the PoE look, Guy picks, then build.

## Scope
- Launcher popup in `renderer/src/web/woke/tab-bar/TabBar.vue` (launcher block + styles) and grouping in `tab-bar/tools.ts` (`groupByModule`, `launcherEntries`).
- Must include the Megalomaniac searcher entry under Builds & trade (PR #619 adds module `megalo`).

## Steps
1. Mockups artifact with pick buttons and comment box (no code until Guy picks).
2. Build Guy's pick, adversarial review, local checks, hand to coordinator to merge.
