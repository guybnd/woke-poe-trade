---
id: WOKEPOET-360
title: On-click trade searches share one queue and cache
status: Done
priority: None
effort: M
assignee: unassigned
tags:
  - cleanup
  - prices
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-354
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:06.939Z'
    comment: Created ticket.
    id: a-2026-11-17t09-44-06-939z
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:06.939Z'
    comment: Created as subtask of WOKEPOET-354.
    id: a-2026-11-17t09-44-06-939z
  - type: comment
    user: Agent
    comment: >-
      PR #581 (woke/trade-search-lane): shared/on-demand lane + 15-min answers;
      gem versions, Harvest swap, trade quotes on it; trade-quotes league fix.
      Checks, e2e, perf pass.
    date: '2026-11-17T11:20:22.744Z'
    completionComment: true
    id: c-2026-11-17t11-20-22-744z
  - type: status_change
    from: Backlog
    to: Ready
    user: Agent
    date: '2026-11-17T11:20:22.744Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as adf87bfa: shared/on-demand lane + kept answers; gem versions,
      Harvest swap, trade quotes; trade-quotes league fix. Pruning follow-up
      next.
    completionComment: true
    date: '2026-11-17T11:33:09.441Z'
    id: c-2026-11-17t11-33-09-441z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-17T11:33:09.874Z'
  - type: activity
    user: Agent
    date: '2026-11-17T11:55:48.493Z'
    comment: >-
      Follow-up #582 merged (cc9bf7fe): kept trade answers pruned (expired on
      read and set, at most 200).
    id: a-2026-11-17t11-55-48-493z
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/581'
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
> **TL;DR:** Gem versions, Harvest swap, price drivers and new-item search call trade on their own, with no cache, so reopening spends searches again. Route them through shared/trade-quotes.ts with one `useOnDemandQuote()` row state.

Audit finding 6.
