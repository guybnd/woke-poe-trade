---
id: WOKEPOET-323
title: 'Search: unique mods, Foulborn swaps, vestigial mod'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T12:35:32.109Z'
    comment: Created ticket.
    id: a-2026-11-15t12-35-32-109z
  - type: comment
    user: Agent
    comment: >-
      Built and merged in PR #530 (b2e23139): the Search result details show a
      unique's mods, its Foulborn swaps and the Vestigial mod under its prices.
      The dev overlay was reloaded on master.
    date: '2026-11-15T12:35:36.712Z'
    completionComment: true
    id: c-2026-11-15t12-35-36-712z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T12:35:36.712Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as b2e23139: Search shows a unique's mods, its Foulborn swaps and
      the Vestigial mod under its prices.
    completionComment: true
    date: '2026-11-15T12:35:42.436Z'
    id: c-2026-11-15t12-35-42-436z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T12:35:42.822Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/530'
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
> **TL;DR:** Ctrl+Space search result details now show a unique's mods, its Foulborn swaps and the Vestigial mod under its prices. Built and merged in PR #530 (b2e23139); this ticket records it.

Ticket added after the merge to keep the board in step.
