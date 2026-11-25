---
id: WOKEPOET-406
title: 'Map price check redesign: Any/Has/Not per mod, no search until Search'
status: Released
priority: Medium
effort: M
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-20T03:31:44.507Z'
    comment: Created ticket.
    id: a-2026-11-20t03-31-44-507z
  - type: activity
    user: Agent
    date: '2026-11-20T03:31:47.843Z'
    comment: Updated implementation link.
    id: a-2026-11-20t03-31-47-843z
  - type: comment
    user: Agent
    comment: >-
      Merged as dedd5fe2: Any/Has/Not per map mod on the strip, no trade search
      on maps until Search, Nightmare grid folds and is realigned.
    completionComment: true
    date: '2026-11-20T03:37:18.022Z'
    id: c-2026-11-20t03-37-18-022z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T03:37:18.535Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:49.224Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/666'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
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
version: '00002'
releasedAt: '2026-11-25T11:52:41.308Z'
releaseDocPath: release-notes/00002
---
Guy's pick A (mocks https://claude.ai/artifact/UkMTYkHLYu25wSiLaFJhXz): every map mod on the strip gets an Any / Has / Not switch for the trade search; map price checks don't search trade until Search; Nightmare Map grid folds and is realigned. PR https://github.com/guybnd/woke-poe-trade/pull/666. Follow-up of WOKEPOET-403.
