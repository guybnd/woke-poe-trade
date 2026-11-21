---
id: WOKEPOET-458
title: 'Map scan: merge into Map mods as one map checker'
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T13:14:23.582Z'
    comment: Created ticket.
    id: a-2026-11-21t13-14-23-582z
  - type: activity
    user: Agent
    date: '2026-11-21T13:23:11.793Z'
    comment: >-
      Layout options for Guy (pick stored on card, db picks/layout):
      https://claude.ai/artifact/BrGdR2fpDgeYRg4LvypVjF. Building A (scan box in
      Map mods' right column) meanwhile, branch woke/map-scan-merge.
    id: a-2026-11-21t13-23-11-793z
  - type: activity
    user: Agent
    date: '2026-11-21T14:10:39.382Z'
    comment: >-
      Guy picked layout B (own Scan tab in Map mods). PR
      https://github.com/guybnd/woke-poe-trade/pull/738 reworked to B; review
      fixes in; CI re-running.
    id: a-2026-11-21t14-10-39-382z
  - type: comment
    user: Agent
    comment: >-
      Merged in PR 738 (layout B, Guy's pick): Map scan is a Scan tab in Map
      mods; old entry retired; keys carried over by a one-time config fix-up.
      Review fixes in, CI green.
    date: '2026-11-21T14:32:12.575Z'
    completionComment: true
    id: c-2026-11-21t14-32-12-575z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-21T14:32:12.575Z'
  - type: comment
    user: Agent
    comment: >-
      Map scan folded into Map mods (layout B, Guy's pick): its own Scan tab
      with Scan/Stop, Roll, tally and every map read with its flagged mods; dock
      icon and on-screen badge unchanged. Map scan retired from the grid, dock
      list, presets and settings. One-time config fix-up moves Map scan's keys,
      reroll alert and rail pin to Map mods (none from a switched-off Map scan).
      Ctrl+Space "map scan" finds Map mods plus on/off and rolling commands.
      Adversarial review findings fixed; CI green.
    completionComment: true
    date: '2026-11-21T14:32:17.432Z'
    id: c-2026-11-21t14-32-17-432z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T14:32:17.909Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/738'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/pob-builds/BuildDetail.vue
    additions: 4
    deletions: 4
  - file: renderer/src/web/woke/pob-builds/build-model.ts
    additions: 14
    deletions: 0
  - file: renderer/test/woke/pob-builds.test.ts
    additions: 39
    deletions: 1
---
Guy's tool audit (2026-11-21) marked Map scan "improve". It reads map tooltips with OCR (Alt+S) and flags the danger mods, which Map mods already does from a copied item. Two tools do one job.

Plan to groom: one map checker in Map mods, where OCR scanning is an input mode (with rolling mode kept) next to the copy hotkey. Same danger list and settings, one launcher entry and one Settings page. Keep Map scan's settings and hotkeys on upgrade.

Card: https://claude.ai/artifact/GcCaMCbbGftoqCeMA5CbGD
