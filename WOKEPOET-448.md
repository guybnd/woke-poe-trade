---
id: WOKEPOET-448
title: Fix loot-filter e2e timeouts (harness waits for lazy widgets)
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T09:54:49.385Z'
    comment: Created ticket.
    id: a-2026-11-21t09-54-49-385z
  - type: comment
    user: Agent
    comment: >-
      Merged as 4af8974: e2e harness waits for lazy widgets, fixing the
      loot-filter timeouts. Test-only.
    completionComment: true
    date: '2026-11-21T09:54:56.162Z'
    id: c-2026-11-21t09-54-56-162z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T09:54:56.651Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:59.093Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/724'
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
PR: https://github.com/guybnd/woke-poe-trade/pull/724 (merged 4af8974). Test-only.
