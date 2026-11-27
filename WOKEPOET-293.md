---
id: WOKEPOET-293
title: 'Map mods: 3.30''s new map suffixes, without Vaal side areas'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - '3.30'
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:20:17.838Z'
    comment: Created ticket.
    id: a-2026-11-15t05-20-17-838z
  - type: comment
    user: Agent
    comment: 'Merged #482 on 2026-11-14.'
    completionComment: true
    date: '2026-11-15T05:20:39.245Z'
    id: c-2026-11-15t05-20-39-245z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:20:39.627Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:10:23.697Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/482'
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
version: '00024'
releasedAt: '2026-11-27T16:10:17.975Z'
releaseDocPath: release-notes/00024
---
The map mod checker knows 3.30's new map suffixes and drops the Vaal side area mods. Shipped in PR #482.
