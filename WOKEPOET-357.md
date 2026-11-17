---
id: WOKEPOET-357
title: One "uniques on this base" list for Search and Alt+F
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - cleanup
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-354
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:00.254Z'
    comment: Created ticket.
    id: a-2026-11-17t09-44-00-254z
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:00.254Z'
    comment: Created as subtask of WOKEPOET-354.
    id: a-2026-11-17t09-44-00-254z
  - type: comment
    user: Agent
    comment: >-
      In PR #576 with WOKEPOET-356: shared/uniques-on-base.ts +
      shared/UniquesOnBase.vue draw Search's base pane and Alt+F "Can drop as".
    date: '2026-11-17T10:12:01.707Z'
    completionComment: true
    id: c-2026-11-17t10-12-01-707z
  - type: status_change
    from: Backlog
    to: Ready
    user: Agent
    date: '2026-11-17T10:12:01.707Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 46b1bffd: shared UniquesOnBase + uniques-on-base index for
      Search and Alt+F.
    completionComment: true
    date: '2026-11-17T10:26:01.162Z'
    id: c-2026-11-17t10-26-01-162z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-17T10:26:01.467Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/576'
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
> **TL;DR:** Search and the Alt+F filter card each list a base's uniques their own way; only one can be clicked. One component and one `uniquesOnBase(base)` for both.

Audit finding 3. Ships in the same PR as the shared item row.
