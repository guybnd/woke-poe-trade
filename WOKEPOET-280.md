---
id: WOKEPOET-280
title: 'Tree overlay: show ascendancy points and nodes'
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
    date: '2026-11-14T04:47:33.611Z'
    comment: Created ticket.
    id: a-2026-11-14t04-47-33-611z
  - type: activity
    user: Agent
    date: '2026-11-14T04:49:48.344Z'
    comment: >-
      Mockups A/B/C awaiting Guy's pick:
      https://claude.ai/artifact/3Z3qBZ27RhmaMRwgwhzVcm (pick lands in its db at
      picks/current). Recommended B.
    id: a-2026-11-14t04-49-48-344z
  - type: comment
    user: Agent
    comment: >-
      Shipped: #449 put ascendancy points on the PoB tree window and Alt+T; #451
      then moved the ascendancy into its in-tree bubble beside the class start,
      as 3.30 draws it. Both merged 2026-11-14.
    date: '2026-11-15T05:19:50.776Z'
    completionComment: true
    id: c-2026-11-15t05-19-50-776z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T05:19:50.776Z'
  - type: comment
    user: Agent
    comment: >-
      Merged #449 (ascendancy points on the PoB tree window and Alt+T) and #451
      (ascendancy in its in-tree bubble, as 3.30 draws it). Only the Duelist
      bubble was measured in game.
    completionComment: true
    date: '2026-11-15T05:20:02.002Z'
    id: c-2026-11-15t05-20-02-002z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:20:02.248Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/451'
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
Guy wants the passive tree view (Alt+T over the game's tree, auto mode following level) to show ascendancy points/nodes too, not just the main tree.

Today: TreeOverlay.vue draws only main-tree nodes; tree data (build-tree-data.mjs) stores asc nodes at 0,0 with no links or icons, notables named only.

Plan: mockups with 2–3 options first (thread "Show ascendancy points in tree passives"), then build the pick. Coordinate with the auto-mode thread (CampaignBuild/active.ts). Branch woke/tree-ascendancy, worktree E:\Git\woke-tree-asc.
