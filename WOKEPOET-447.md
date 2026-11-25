---
id: WOKEPOET-447
title: Nights use the AFK filter + Leave out hideout box
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T09:46:24.747Z'
    comment: Created ticket.
    id: a-2026-11-21t09-46-24-747z
  - type: comment
    user: Agent
    comment: >-
      Merged as 05a4273: Nights use the AFK filter, plus a Leave out hideout
      box.
    completionComment: true
    date: '2026-11-21T09:46:33.375Z'
    id: c-2026-11-21t09-46-33-375z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T09:46:33.848Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:59.260Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/723'
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
version: '0001'
releasedAt: '2026-11-25T11:50:45.359Z'
releaseDocPath: release-notes/0001
---
PR: https://github.com/guybnd/woke-poe-trade/pull/723 (merged 05a4273).
