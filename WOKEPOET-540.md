---
id: WOKEPOET-540
title: 'Exchange verdict: add a spread line'
status: Done
priority: Medium
effort: S
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
    date: '2026-11-24T02:41:18.487Z'
    comment: Created ticket.
    id: a-2026-11-24t02-41-18-487z
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:18.487Z'
    comment: Created as subtask of WOKEPOET-528.
    id: a-2026-11-24t02-41-18-487z
  - type: comment
    user: Agent
    comment: 'In PR 838. Picks: https://claude.ai/artifact/EfhJoEt58BXT9gftzgSgNE'
    date: '2026-11-24T03:05:07.404Z'
    selfAttested: true
    id: c-2026-11-24t03-05-07-404z
  - type: comment
    user: Agent
    comment: Shipped in PR 838 (86a29b63).
    date: '2026-11-24T03:40:59.288Z'
    completionComment: true
    id: c-2026-11-24t03-40-59-288z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-24T03:40:59.288Z'
  - type: comment
    user: Agent
    comment: Merged at 86a29b63 from a cloud thread; dev build reloaded.
    completionComment: true
    date: '2026-11-24T03:41:07.986Z'
    id: c-2026-11-24t03-41-07-986z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T03:41:08.763Z'
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
Veteran review pick (bulk-spread). "1 to 15c, most ask 10c" so you see what you'll really pay or get. Left open from the Originator's fix (WOKEPOET-487).
