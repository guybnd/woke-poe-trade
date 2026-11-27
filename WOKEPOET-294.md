---
id: WOKEPOET-294
title: 'PoB builds: Character tab compares your live character with the build'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - pob
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:20:19.228Z'
    comment: Created ticket.
    id: a-2026-11-15t05-20-19-228z
  - type: comment
    user: Agent
    comment: 'Merged #484 on 2026-11-15.'
    completionComment: true
    date: '2026-11-15T05:20:40.245Z'
    id: c-2026-11-15t05-20-40-245z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:20:40.629Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:10:23.609Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/484'
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
The live character is read apart from the PoB build and shown on a Character tab with a Read now button (Guy's pick B). The store also feeds the Claude link's MCP server. Shipped in PR #484.
