---
id: WOKEPOET-373
title: 'Tools launcher overhaul: easier to read'
status: Done
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
    id: a-2026-11-18t11-12-13-177z
  - type: comment
    user: Agent
    comment: >-
      Mockups ready for Guy's picks (layout A-D, switched-off tools,
      descriptions, pins, text size):
      https://claude.ai/artifact/LMVyehVRAXpqAUvhyn2iph. Picks save to its db at
      picks/current. No code until he picks.
    date: '2026-11-18T11:16:41.248Z'
    id: c-2026-11-18t11-16-41-248z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-18T11:16:41.248Z'
    comment: >-
      Mockups ready for Guy's picks (layout A-D, switched-off tools,
      descriptions, pins, text size):
      https://claude.ai/artifact/LMVyehVRAXpqAUvhyn2iph. Picks save to its db at
      picks/current. No code until he picks.
  - type: activity
    user: Agent
    date: '2026-11-18T12:27:43.414Z'
    comment: >-
      Guy picked A, 3, 1, 3, 1 plus his section moves and a bigger size. Built
      in https://github.com/guybnd/woke-poe-trade/pull/625. Review fixes are in,
      and the local checks and rail e2e pass. Handed to the coordinator to
      merge.
    id: a-2026-11-18t12-27-43-414z
  - type: comment
    user: Agent
    comment: 'Guy picked A, 3, 1, 3, 1.'
    date: '2026-11-18T12:27:44.327Z'
    id: c-2026-11-18t12-27-44-327z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-18T12:27:44.327Z'
    comment: 'Guy picked A, 3, 1, 3, 1.'
  - type: activity
    user: Agent
    date: '2026-11-18T12:27:44.945Z'
    comment: Updated implementation link.
    id: a-2026-11-18t12-27-44-945z
  - type: comment
    user: Agent
    comment: >-
      Built in PR #625: five columns with game heading bars, a hover description
      line, gold pinned names with a blue dot for open windows, bigger text and
      window, and the launcher never covers the rail. Lab gems moved to Campaign
      & lab, Farming to Mapping, Wickerman to Economy. Review fixes are in.
      Unit, lint, build, typecheck:test and the tab-rail e2e all pass. Waiting
      on the merge.
    date: '2026-11-18T12:27:49.683Z'
    completionComment: true
    id: c-2026-11-18t12-27-49-683z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T12:27:49.683Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as a446e0f7. The tools launcher now has five columns with game
      heading bars, a hover description line, gold pinned names with a blue dot
      for open windows, and larger text in a 1360px window that never covers the
      rail. Lab gems moved to Campaign & lab, Farming to Mapping, Wickerman to
      Economy.
    completionComment: true
    date: '2026-11-18T12:42:47.012Z'
    id: c-2026-11-18t12-42-47-012z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T12:42:47.542Z'
swimlane: null
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/625'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
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
> **TL;DR** Guy finds the tools launcher (rail grid button: search box + Economy / Mapping / Campaign & lab / Builds & trade / Overlay columns, icons, pins, "Off" labels) hard to read. Mock options in the PoE look, Guy picks, then build.

## Scope
- Launcher popup in `renderer/src/web/woke/tab-bar/TabBar.vue` (launcher block + styles) and grouping in `tab-bar/tools.ts` (`groupByModule`, `launcherEntries`).
- Must include the Megalomaniac searcher entry under Builds & trade (PR #619 adds module `megalo`).

## Steps
1. Mockups artifact with pick buttons and comment box (no code until Guy picks).
2. Build Guy's pick, adversarial review, local checks, hand to coordinator to merge.
