---
id: WOKEPOET-720
title: 'NeverSink retirement M7: retire NeverSink UI, migrate Changes, default on'
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
    date: '2026-11-28T07:49:23.951Z'
    comment: Created ticket.
    id: a-2026-11-28t07-49-23-951z
  - type: activity
    user: Agent
    date: '2026-11-28T07:49:23.951Z'
    comment: Created as subtask of WOKEPOET-649.
    id: a-2026-11-28t07-49-23-951z
  - type: status_change
    from: Todo
    to: In Progress
    user: Agent
    date: '2026-11-28T09:17:11.255Z'
  - type: comment
    user: Agent
    comment: >-
      Part 1 merged: https://github.com/guybnd/woke-poe-trade/pull/1089
      (168d796). NeverSink tab removed, Loot and Equipment out of beta for
      everyone. Full cut still to come.
    date: '2026-11-28T09:54:03.842Z'
    selfAttested: true
    id: c-2026-11-28t09-54-03-842z
  - type: comment
    user: Agent
    comment: PR 1098 (M7 full cut) merged as 36fda942.
    date: '2026-11-28T12:24:34.021Z'
    completionComment: true
    id: c-2026-11-28t12-24-34-021z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-28T12:24:34.021Z'
  - type: comment
    user: Agent
    comment: >-
      M7 done: PR 1089 (tab retired, out of beta) and PR 1098 (own filter
      replaces NeverSink by default, 36fda942).
    completionComment: true
    date: '2026-11-28T12:24:38.181Z'
    id: c-2026-11-28t12-24-38-181z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T12:24:39.706Z'
needsAction: null
baselineCommit: 8289be3944ec8e037ccf214e1ae02b1146f21d66
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1098'
swimlane: null
diffSummary:
  - file: release-next-notes.md
    additions: 1
    deletions: 0
  - file: renderer/src/web/woke/loot-filter/CurrencyCard.vue
    additions: 3
    deletions: 2
  - file: renderer/src/web/woke/loot-filter/currency-weights.ts
    additions: 83
    deletions: 17
  - file: renderer/src/web/woke/loot-filter/unique-classes.ts
    additions: 8
    deletions: 2
  - file: renderer/test/woke/filter-loot-special-rolls.test.ts
    additions: 45
    deletions: 6
---

