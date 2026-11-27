---
id: WOKEPOET-638
title: Price check Size scales all text and its tooltips
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - bug
  - price-check
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-26T06:46:31.810Z'
    comment: Created ticket.
    id: a-2026-11-26t06-46-31-810z
  - type: activity
    user: Agent
    date: '2026-11-26T06:46:35.625Z'
    comment: Updated implementation link.
    id: a-2026-11-26t06-46-35-625z
  - type: comment
    user: Agent
    comment: PR 963 merged (310ee0d).
    date: '2026-11-26T07:02:28.220Z'
    completionComment: true
    id: c-2026-11-26t07-02-28-220z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-26T07:02:28.220Z'
  - type: comment
    user: Agent
    comment: Merged at 310ee0d; dev build reloaded.
    completionComment: true
    date: '2026-11-26T07:02:33.840Z'
    id: c-2026-11-26t07-02-33-840z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T07:02:34.357Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:30:51.927Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/963'
subtasks:
  - WOKEPOET-639
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
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
version: '0003'
releasedAt: '2026-11-27T04:30:50.393Z'
releaseDocPath: release-notes/0003
---
The price check Size setting should scale all of its text and its tooltips (Guy, 2026-11-26). PR: https://github.com/guybnd/woke-poe-trade/pull/963 (in CI).
