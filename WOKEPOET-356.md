---
id: WOKEPOET-356
title: One shared item row for every item list
status: Done
priority: None
effort: L
assignee: unassigned
tags:
  - cleanup
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-354
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:43:58.145Z'
    comment: Created ticket.
    id: a-2026-11-17t09-43-58-145z
  - type: activity
    user: Agent
    date: '2026-11-17T09:43:58.145Z'
    comment: Created as subtask of WOKEPOET-354.
    id: a-2026-11-17t09-43-58-145z
  - type: comment
    user: Agent
    comment: >-
      PR #576 (woke/shared-item-rows), with WOKEPOET-357. WItemRow,
      openPriceCheck, itemArt, shared UniquesOnBase. Checks + e2e + perf pass.
      Open question in the PR: should Alt+F uniques / PoB unique rows price
      check on click?
    date: '2026-11-17T10:12:00.560Z'
    completionComment: true
    id: c-2026-11-17t10-12-00-560z
  - type: status_change
    from: Backlog
    to: Ready
    user: Agent
    date: '2026-11-17T10:12:00.560Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 46b1bffd: WItemRow, openPriceCheck, itemArt; side window, gem
      versions, PoB costs rows moved. Guy's left-click price check for Alt+F/PoB
      uniques follows in a small PR.
    completionComment: true
    date: '2026-11-17T10:26:00.117Z'
    id: c-2026-11-17t10-26-00-117z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-17T10:26:00.434Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/576'
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
> **TL;DR:** Every list of items decides alone what hover, right-click and click do, so the same item opens in one list and does nothing in the next. One shared row gives art, tooltip, item menu and a click everywhere.

Audit finding 1. One `openPriceCheck(ref)` replacing four copies, one item-art lookup, and the lists (related items, gem versions, Viscera strip, Alt+F uniques, Harvest swap, PoB costs, mechanics glance, base uniques) moved onto it. Each list keeps today's left-click action.
