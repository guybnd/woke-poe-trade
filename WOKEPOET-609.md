---
id: WOKEPOET-609
title: 'Related lists: no self rows, no recipe-only groups'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - bug
  - price-check
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-25T07:17:32.351Z'
    comment: Created ticket.
    id: a-2026-11-25t07-17-32-351z
  - type: comment
    user: Agent
    comment: Merged at ace48d7; dev build reloaded.
    completionComment: true
    date: '2026-11-25T07:17:34.944Z'
    id: c-2026-11-25t07-17-34-944z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T07:17:35.751Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:46.514Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/926'
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
Price check "Related to" leaves out the checked item and recipe-only groups. PR: https://github.com/guybnd/woke-poe-trade/pull/926 (ace48d7).
