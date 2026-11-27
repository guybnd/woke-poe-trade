---
id: WOKEPOET-656
title: Fix Vestigial mod source missing
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
    date: '2026-11-27T05:14:50.406Z'
    comment: Created ticket.
    id: a-2026-11-27t05-14-50-406z
  - type: comment
    user: Agent
    comment: >-
      Merged at a165a4c (data v36). Reaches the dev build on the switch back to
      master after PR 985.
    completionComment: true
    date: '2026-11-27T05:14:54.778Z'
    id: c-2026-11-27t05-14-54-778z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-27T05:14:55.472Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:09:52.937Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/982'
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
Vestigial mod source was missing; fixed, with a Vestigial data refresh (data version 36). PR: https://github.com/guybnd/woke-poe-trade/pull/982 (a165a4c).
