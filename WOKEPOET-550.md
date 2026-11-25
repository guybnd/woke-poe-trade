---
id: WOKEPOET-550
title: Configurable glance bar (A1+W1+T2)
status: Released
priority: None
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-528
history:
  - type: activity
    user: Agent
    date: '2026-11-24T04:24:10.857Z'
    comment: Created ticket.
    id: a-2026-11-24t04-24-10-857z
  - type: activity
    user: Agent
    date: '2026-11-24T04:24:10.857Z'
    comment: Created as subtask of WOKEPOET-528.
    id: a-2026-11-24t04-24-10-857z
  - type: comment
    user: Agent
    comment: >-
      Merged at f6a9730b from a cloud thread; dev build reloaded. Picks:
      https://claude.ai/artifact/Ck43qXqSRhAaJDyVZmRbFT
    completionComment: true
    date: '2026-11-24T04:24:16.489Z'
    id: c-2026-11-24t04-24-16-489z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T04:24:17.463Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:56.827Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/846'
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
Glance bar: pick its fields, keep it up while a run goes, last map between maps. https://github.com/guybnd/woke-poe-trade/pull/846 (merged at f6a9730b).

Picks: https://claude.ai/artifact/Ck43qXqSRhAaJDyVZmRbFT
