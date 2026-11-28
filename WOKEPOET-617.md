---
id: WOKEPOET-617
title: 'Help tooltips: rewrite other tools'' tips'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - polish
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-613
history:
  - type: activity
    user: Agent
    date: '2026-11-25T10:56:28.232Z'
    comment: Created ticket.
    id: a-2026-11-25t10-56-28-232z
  - type: activity
    user: Agent
    date: '2026-11-25T10:56:28.232Z'
    comment: Created as subtask of WOKEPOET-613.
    id: a-2026-11-25t10-56-28-232z
  - type: activity
    user: Agent
    date: '2026-11-25T12:29:38.028Z'
    comment: Partly done in PR 935 (942b6c5); remaining work open.
    id: a-2026-11-25t12-29-38-028z
  - type: comment
    user: Agent
    comment: PR 1039 merged (d694dfd).
    date: '2026-11-28T02:11:57.609Z'
    completionComment: true
    id: c-2026-11-28t02-11-57-609z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-28T02:11:57.609Z'
  - type: comment
    user: Agent
    comment: Merged at d694dfd; dev build reloaded.
    completionComment: true
    date: '2026-11-28T02:12:06.568Z'
    id: c-2026-11-28t02-12-06-568z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T02:12:07.238Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1039'
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
Rewrite the other tools' help tips in the new format: boss runs, analytics, decks, Megalomaniac, Forbidden, farming and the rest.
