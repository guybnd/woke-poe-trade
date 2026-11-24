---
id: WOKEPOET-537
title: Forbidden Flame and Flesh pair finder from the PoB build
status: Done
priority: High
effort: M
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-528
history:
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:13.532Z'
    comment: Created ticket.
    id: a-2026-11-24t02-41-13-532z
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:13.532Z'
    comment: Created as subtask of WOKEPOET-528.
    id: a-2026-11-24t02-41-13-532z
  - type: status_change
    from: Todo
    to: In Progress
    user: Agent
    date: '2026-11-24T03:15:47.310Z'
  - type: comment
    user: Agent
    comment: >-
      PR #841 open, mockups https://claude.ai/artifact/1stBBeuanLrCVPMpBYKD8q
      (A1+B1+C1 picked; Flame/Flesh open the price check per Guy's comment)
    date: '2026-11-24T03:15:48.641Z'
    selfAttested: true
    id: c-2026-11-24t03-15-48-641z
  - type: comment
    user: Agent
    comment: Shipped in PR 841 (3c2e8db8).
    date: '2026-11-24T03:53:58.049Z'
    completionComment: true
    id: c-2026-11-24t03-53-58-049z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T03:53:58.049Z'
  - type: comment
    user: Agent
    comment: Merged at 3c2e8db8 from a cloud thread; dev build reloaded.
    completionComment: true
    date: '2026-11-24T03:54:03.825Z'
    id: c-2026-11-24t03-54-03-825z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T03:54:04.426Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/841'
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
Veteran review pick (forbidden-pair). From the build's ascendancy, list notables you don't have with the cheapest Flame plus Flesh pair for each, and open both trade searches.
