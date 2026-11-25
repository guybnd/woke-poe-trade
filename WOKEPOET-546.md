---
id: WOKEPOET-546
title: 'What''s new: "Mark all seen" and a quiet mode'
status: Released
priority: Low
effort: XS
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-528
history:
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:28.760Z'
    comment: Created ticket.
    id: a-2026-11-24t02-41-28-760z
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:28.760Z'
    comment: Created as subtask of WOKEPOET-528.
    id: a-2026-11-24t02-41-28-760z
  - type: activity
    user: Agent
    date: '2026-11-24T02:55:40.699Z'
    comment: 'In PR 836 (cloud thread), pending CI.'
    id: a-2026-11-24t02-55-40-699z
  - type: comment
    user: Agent
    comment: Shipped in PR 836 (6343ecd0).
    date: '2026-11-24T04:41:09.210Z'
    completionComment: true
    id: c-2026-11-24t04-41-09-210z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-24T04:41:09.210Z'
  - type: comment
    user: Agent
    comment: Merged at 6343ecd0 from a cloud thread; dev build reloaded.
    completionComment: true
    date: '2026-11-24T04:41:17.066Z'
    id: c-2026-11-24t04-41-17-066z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T04:41:17.975Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:56.502Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/836'
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
version: 1.30.20
releasedAt: '2026-11-25T04:05:49.382Z'
releaseDocPath: release-notes/1.30.20
---
Veteran review pick (whatsnew-quiet). One click clears every NEW seal; a setting shows What's new only for releases with a feature, not fixes.
