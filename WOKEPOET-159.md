---
id: WOKEPOET-159
title: E. Item tier buttons in filter rules
status: Done
priority: High
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-08T15:12:18.733Z'
    comment: Created ticket.
    id: a-2026-11-08t15-12-18-733z
  - type: activity
    user: Agent
    date: '2026-11-08T15:12:18.733Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-08t15-12-18-733z
  - type: comment
    user: Agent
    comment: >-
      **Item tier condition with T1-T5 buttons is built.** PR
      https://github.com/guybnd/woke-poe-trade/pull/273, with tests. Local
      checks pass. Waiting on the cloud merge.
    date: '2026-11-08T15:12:28.094Z'
    completionComment: true
    id: c-2026-11-08t15-12-28-094z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-08T15:12:28.094Z'
  - type: comment
    user: Agent
    comment: Merged as 5917d3c. It's live in the dev build. No docs needed.
    completionComment: true
    date: '2026-11-08T15:21:04.272Z'
    id: c-2026-11-08t15-21-04-272z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-08T15:21:04.610Z'
needsAction: null
baselineCommit: e67d6ec4dad47efdb249e0afdf27705a03528309
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/273'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/loot-filter/RuleBuilder.vue
    additions: 11
    deletions: 1
  - file: renderer/src/web/woke/loot-filter/rules.ts
    additions: 20
    deletions: 3
  - file: renderer/test/woke/filter-rules.test.ts
    additions: 12
    deletions: 1
---
> TL;DR: Guy's pick E: T1-T5 buttons on a new Item tier rule condition, writing UnidentifiedItemTier >= n. PR #273.
