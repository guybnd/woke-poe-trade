---
id: WOKEPOET-356
title: One shared item row for every item list
status: Ready
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
needsAction: null
---
> **TL;DR:** Every list of items decides alone what hover, right-click and click do, so the same item opens in one list and does nothing in the next. One shared row gives art, tooltip, item menu and a click everywhere.

Audit finding 1. One `openPriceCheck(ref)` replacing four copies, one item-art lookup, and the lists (related items, gem versions, Viscera strip, Alt+F uniques, Harvest swap, PoB costs, mechanics glance, base uniques) moved onto it. Each list keeps today's left-click action.
