---
id: WOKEPOET-689
title: >-
  Rethink unique base tiers (average drop, chase look, boss-only split, 6-link
  rule)
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
    date: '2026-11-28T02:57:18.234Z'
    comment: Created ticket.
    id: a-2026-11-28t02-57-18-234z
  - type: activity
    user: Agent
    date: '2026-11-28T02:57:18.234Z'
    comment: Created as subtask of WOKEPOET-649.
    id: a-2026-11-28t02-57-18-234z
  - type: comment
    user: Agent
    comment: >-
      Design picks open: https://claude.ai/artifact/WXepUbebC2yyDbsWkEYhnx.
      Exotic base lime text in PR #1045.
    date: '2026-11-28T02:57:23.488Z'
    selfAttested: true
    pin: true
    id: c-2026-11-28t02-57-23-488z
  - type: comment
    user: Agent
    comment: PR 1045 merged (a8d6dbd).
    date: '2026-11-28T04:00:15.046Z'
    completionComment: true
    id: c-2026-11-28t04-00-15-046z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-28T04:00:15.046Z'
  - type: comment
    user: Agent
    comment: Merged at a8d6dbd; dev build on master.
    completionComment: true
    date: '2026-11-28T04:00:21.995Z'
    id: c-2026-11-28t04-00-21-995z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T04:00:23.583Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1045'
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
Rethink how unique bases are tiered in the loot filter: average drop value, a chase look, a boss-only split, and a 6-link rule.
