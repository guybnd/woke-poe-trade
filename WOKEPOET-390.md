---
id: WOKEPOET-390
title: 'G4: AppUpdater unit tests'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - testing
  - tooling
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-380
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:26:03.700Z'
    comment: Created ticket.
    id: a-2026-11-18t15-26-03-700z
  - type: activity
    user: Agent
    date: '2026-11-18T15:26:03.700Z'
    comment: Created as subtask of WOKEPOET-380.
    id: a-2026-11-18t15-26-03-700z
  - type: comment
    user: Agent
    comment: >-
      PR #640 merged (c96e91f5): testing/main/app-updater.test.ts, 9 tests of
      AppUpdater's wiring to electron-updater.
    date: '2026-11-18T15:57:50.349Z'
    completionComment: true
    id: c-2026-11-18t15-57-50-349z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T15:57:50.349Z'
  - type: comment
    user: Agent
    comment: 'Merged as c96e91f5: AppUpdater wiring tests.'
    completionComment: true
    date: '2026-11-18T15:57:58.265Z'
    id: c-2026-11-18t15-57-58-265z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T15:57:58.577Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:55.285Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/640'
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
main/src/AppUpdater.ts is 512 lines with no tests and is faked in the fake-game host. Releases broke before (WOKEPOET-121, 170). Test its states with electron-updater mocked.
