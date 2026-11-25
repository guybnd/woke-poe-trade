---
id: WOKEPOET-388
title: 'G2: atlas strategy list unit tests for add, remove, import, undo'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - testing
  - atlas
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-380
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:26:00.212Z'
    comment: Created ticket.
    id: a-2026-11-18t15-26-00-212z
  - type: activity
    user: Agent
    date: '2026-11-18T15:26:00.212Z'
    comment: Created as subtask of WOKEPOET-380.
    id: a-2026-11-18t15-26-00-212z
  - type: comment
    user: Agent
    comment: >-
      No change needed: bug hunt round 2 (#400) added regression tests for 227,
      228, 229 in renderer/test/woke/atlas-strategies.test.ts ("drafts and
      removed strategies", "each strategy keeps its own regex folder"). The
      audit's import count missed them.
    date: '2026-11-18T15:57:51.692Z'
    completionComment: true
    id: c-2026-11-18t15-57-51-692z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T15:57:51.692Z'
  - type: comment
    user: Agent
    comment: >-
      No change: already covered by bug hunt round 2's atlas strategy tests
      (#400).
    completionComment: true
    date: '2026-11-18T15:57:59.217Z'
    id: c-2026-11-18t15-57-59-217z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T15:57:59.760Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:55.172Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/400'
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
Bugs WOKEPOET-222, 227, 228, 229 were strategy list state bugs (new strategy inherits removed one's draft, same-name import shares regexes, undo after add does nothing, Settings link hidden by draft). Cover the store with unit tests.
