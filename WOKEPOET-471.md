---
id: WOKEPOET-471
title: 'Vestigial uniques: game look in tooltips and price check'
status: Done
priority: Medium
effort: S
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-22T06:14:08.814Z'
    comment: Created ticket.
    id: a-2026-11-22t06-14-08-814z
  - type: comment
    user: Agent
    comment: >-
      Merged as PR 753 (pick C: light purple Vestigial implicit in tooltips,
      price check, Search). CI green, startup JS at budget.
    date: '2026-11-22T06:53:36.520Z'
    completionComment: true
    id: c-2026-11-22t06-53-36-520z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T06:53:36.520Z'
  - type: comment
    user: Agent
    comment: >-
      Guy's pick C (colour only): Vestigial implicit in the game's light purple
      (#cba5f2) in item tooltips (trade listings, sold items, worn gear), price
      check (PoE mode + classic tag) and Search; price check base reads
      "Vestigial Great Crown". No crystal icon. Startup JS kept at budget (1640
      KB).
    completionComment: true
    date: '2026-11-22T06:53:47.744Z'
    id: c-2026-11-22t06-53-47-744z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T06:53:48.529Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/753'
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
Guy (2026-11-22): vestigial items should get proper colouring, effect and icon in price check, item tooltips etc.

Game (poewiki + live trade listing): purple crystal at both nameplate ends, "Vestigial" base prefix, implicit in rgb(203,165,242). Trade API: item.vestigial, implicitMods[].flags.vestigial.

Mockups (A/B/C): https://claude.ai/artifact/EdiXxkaAjsBbQALue7R7Sk. Building A (as in game).
