---
id: WOKEPOET-359
title: 'Loot filter: one tier move and one multi-select'
status: Done
priority: None
effort: M
assignee: unassigned
tags:
  - cleanup
  - loot-filter
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-354
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:04.833Z'
    comment: Created ticket.
    id: a-2026-11-17t09-44-04-833z
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:04.833Z'
    comment: Created as subtask of WOKEPOET-354.
    id: a-2026-11-17t09-44-04-833z
  - type: comment
    user: Agent
    comment: >-
      PR #579 (woke/loot-filter-picks): shared/picks (togglePick, selectPick)
      for chips, Gear tab, Prices tab, Atlas; useTierMove for editor + Alt+F
      card. No behaviour change. Checks, e2e, perf pass.
    date: '2026-11-17T10:47:12.955Z'
    completionComment: true
    id: c-2026-11-17t10-47-12-955z
  - type: status_change
    from: Backlog
    to: Ready
    user: Agent
    date: '2026-11-17T10:47:12.955Z'
  - type: comment
    user: Agent
    comment: 'Merged as 39a9abde: shared/picks (togglePick, selectPick) and useTierMove.'
    completionComment: true
    date: '2026-11-17T11:11:12.921Z'
    id: c-2026-11-17t11-11-12-921z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-17T11:11:13.476Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/579'
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
> **TL;DR:** Moving items between tiers and Shift/Ctrl picking are copied between the filter editor, item card, Gear and Prices tabs and the Atlas window. One `useTierMove` and one `usePicks` for all.

Audit finding 5. Rebase on latest master right before the PR (other threads edit the loot filter).
