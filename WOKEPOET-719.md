---
id: WOKEPOET-719
title: 'NeverSink retirement M6: identified rares score'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-649
history:
  - type: activity
    user: Agent
    date: '2026-11-28T07:49:23.010Z'
    comment: Created ticket.
    id: a-2026-11-28t07-49-23-010z
  - type: activity
    user: Agent
    date: '2026-11-28T07:49:23.010Z'
    comment: Created as subtask of WOKEPOET-649.
    id: a-2026-11-28t07-49-23-010z
  - type: comment
    user: Agent
    comment: >-
      Options on https://claude.ai/artifact/MxLQNfTxJuA2y9xXAZux5n, waiting for
      Guy's pick (A recommended: wanted mods add points to the Rare weights
      score).
    date: '2026-11-28T07:54:19.917Z'
    selfAttested: true
    pin: true
    id: c-2026-11-28t07-54-19-917z
  - type: comment
    user: Agent
    comment: PR 1084 merged as ae44ef0.
    date: '2026-11-28T09:33:23.783Z'
    completionComment: true
    id: c-2026-11-28t09-33-23-783z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-28T09:33:23.783Z'
  - type: comment
    user: Agent
    comment: PR 1084 merged as ae44ef0.
    completionComment: true
    date: '2026-11-28T09:33:27.179Z'
    id: c-2026-11-28t09-33-27-179z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T09:33:27.951Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1084'
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
Needs Guy's pick before building.
