---
id: WOKEPOET-485
title: 'Price check: show a captured beast''s Blood Altar recipes'
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
    date: '2026-11-22T15:49:29.319Z'
    comment: Created ticket.
    id: a-2026-11-22t15-49-29-319z
  - type: activity
    user: Agent
    date: '2026-11-22T15:55:04.581Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/771 opened (option A).
      Pick card for Guy: https://claude.ai/artifact/NFLczRhQWZFcBkPGkLrws9
    id: a-2026-11-22t15-55-04-581z
  - type: comment
    user: Agent
    comment: >-
      PR 771 merged (option A). Review and all GitHub checks passed, incl. new
      beast-altar e2e.
    date: '2026-11-22T16:07:22.690Z'
    completionComment: true
    id: c-2026-11-22t16-07-22-690z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T16:07:22.690Z'
  - type: comment
    user: Agent
    comment: >-
      Merged option A: Blood Altar panel (BeastAltar.vue) under the instant card
      and beside the full price check for captured beasts; 3.30 data fix (no
      "any rare" slots), Mórrigan Talisman recipe, shared bestiary-data loader,
      e2e beast-altar.spec.ts. Guy's A/B/C pick still open on
      https://claude.ai/artifact/NFLczRhQWZFcBkPGkLrws9.
    completionComment: true
    date: '2026-11-22T16:07:28.602Z'
    id: c-2026-11-22t16-07-28-602z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T16:07:29.327Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/771'
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
Guy's ask: price checking a captured beast (instant card or full check) shows which Bestiary recipes it's used in. Example Craicic Vassal (map implicit). Also fix 3.30: yellow beasts no longer needed, so drop "+N any rare" from recipe data (Ctrl+Space too). Mockups/picks: https://claude.ai/artifact/NFLczRhQWZFcBkPGkLrws9 (building A). Branch woke/beast-recipes-price-check, worktree wt/beast-recipes.
