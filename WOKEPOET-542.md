---
id: WOKEPOET-542
title: 'Unid gamble uniques: unid market vs identified average'
status: Done
priority: Medium
effort: M
assignee: unassigned
tags:
  - feature
  - price-check
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-528
history:
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:22.047Z'
    comment: Created ticket.
    id: a-2026-11-24t02-41-22-047z
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:22.047Z'
    comment: Created as subtask of WOKEPOET-528.
    id: a-2026-11-24t02-41-22-047z
  - type: comment
    user: Agent
    comment: 'In PR 838. Picks: https://claude.ai/artifact/EfhJoEt58BXT9gftzgSgNE'
    date: '2026-11-24T03:05:09.348Z'
    selfAttested: true
    id: c-2026-11-24t03-05-09-348z
  - type: comment
    user: Agent
    comment: Shipped in PR 838 (86a29b63).
    date: '2026-11-24T03:41:01.152Z'
    completionComment: true
    id: c-2026-11-24t03-41-01-152z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-24T03:41:01.152Z'
  - type: comment
    user: Agent
    comment: Merged at 86a29b63 from a cloud thread; dev build reloaded.
    completionComment: true
    date: '2026-11-24T03:41:10.199Z'
    id: c-2026-11-24t03-41-10-199z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T03:41:10.968Z'
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
---
Veteran review pick (unid-gamble). For Watcher's Eye, Forbidden Flame/Flesh, Timeless jewels: unid listing price beside the average identified price, so the card says ID or sell unid.
