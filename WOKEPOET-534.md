---
id: WOKEPOET-534
title: 'Instant card: show how much to trust the poe.ninja price'
status: Released
priority: High
effort: S
assignee: unassigned
tags:
  - feature
  - price-check
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-528
history:
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:08.469Z'
    comment: Created ticket.
    id: a-2026-11-24t02-41-08-469z
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:08.469Z'
    comment: Created as subtask of WOKEPOET-528.
    id: a-2026-11-24t02-41-08-469z
  - type: comment
    user: Agent
    comment: 'In PR 838. Picks: https://claude.ai/artifact/EfhJoEt58BXT9gftzgSgNE'
    date: '2026-11-24T03:05:05.350Z'
    selfAttested: true
    id: c-2026-11-24t03-05-05-350z
  - type: comment
    user: Agent
    comment: Shipped in PR 838 (86a29b63).
    date: '2026-11-24T03:40:57.280Z'
    completionComment: true
    id: c-2026-11-24t03-40-57-280z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-24T03:40:57.280Z'
  - type: comment
    user: Agent
    comment: Merged at 86a29b63 from a cloud thread; dev build reloaded.
    completionComment: true
    date: '2026-11-24T03:41:05.578Z'
    id: c-2026-11-24t03-41-05-578z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T03:41:06.227Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:58.181Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/838'
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
Veteran review pick (ninja-trust). Reuse Net worth's spike and thin-market holds: when Net worth would hold this price, the card says so ("poe.ninja says 98 div, usual 1c") and nudges to Live offers. Thin-market mark when priced on few days.
