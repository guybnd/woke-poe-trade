---
id: WOKEPOET-363
title: One saved list for libraries
status: Released
priority: None
effort: L
assignee: unassigned
tags:
  - cleanup
  - ui
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-354
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:12.691Z'
    comment: Created ticket.
    id: a-2026-11-17t09-44-12-691z
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:12.691Z'
    comment: Created as subtask of WOKEPOET-354.
    id: a-2026-11-17t09-44-12-691z
  - type: comment
    user: Agent
    comment: >-
      PR #585 (woke/shared-saved-list): shared/saved-list (rowKeys, removeEntry,
      useDraftName); Regex library + Trade searches moved. Atlas/PoB lists left
      for a follow-up. Checks, e2e, perf pass.
    date: '2026-11-17T12:07:28.368Z'
    completionComment: true
    id: c-2026-11-17t12-07-28-368z
  - type: status_change
    from: Backlog
    to: Ready
    user: Agent
    date: '2026-11-17T12:07:28.368Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as b57a9014: shared/saved-list (row keys, remove with Undo, rename
      in place); Regex library + Trade searches. Parity follow-up is
      WOKEPOET-364.
    completionComment: true
    date: '2026-11-17T12:21:33.734Z'
    id: c-2026-11-17t12-21-33-734z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-17T12:21:34.782Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:09:54.102Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/585'
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
version: '000012'
releasedAt: '2026-11-27T16:09:47.375Z'
releaseDocPath: release-notes/000012
---
> **TL;DR:** Atlas strategies, Trade searches, Regex library and PoB builds each built their own list, so a key that works in one does nothing in the next. A shared SavedList (folders, F2, drag, delete with undo, search, Ctrl+C), Regex library and Trade searches first.

Audit finding 7.
