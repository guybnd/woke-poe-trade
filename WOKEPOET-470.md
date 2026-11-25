---
id: WOKEPOET-470
title: 'Net worth: drag bars and folds for every section'
status: Released
priority: Medium
effort: None
assignee: unassigned
tags:
  - net-worth
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-22T05:08:06.969Z'
    comment: Created ticket.
    id: a-2026-11-22t05-08-06-969z
  - type: comment
    user: Agent
    comment: >-
      PR 752 merged after adversarial review and green CI. Guy picked option A
      in the mockup.
    date: '2026-11-22T05:35:13.910Z'
    completionComment: true
    id: c-2026-11-22t05-35-13-910z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T05:35:13.910Z'
  - type: comment
    user: Agent
    comment: >-
      Option A (Guy's pick): drag bars between chart and Per hour, under the
      chart, between the middle columns and under the middle row (lists scroll
      inside); every Details section folds to its title line. Sizes and folds
      saved; double-click a bar to reset.
    completionComment: true
    date: '2026-11-22T05:35:23.810Z'
    id: c-2026-11-22t05-35-23-810z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T05:35:24.402Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:55.117Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/752'
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
Guy: the right column (Sold, Where it is, Price moves) pushes the items table down. Add vertical and horizontal drag bars between sections, fold each section, persist sizes and folds. Mockup: https://claude.ai/artifact/1fWAcquDRbi6HK75HoRjsQ (building option A).
