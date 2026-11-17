---
id: WOKEPOET-359
title: 'Loot filter: one tier move and one multi-select'
status: Ready
priority: None
effort: M
assignee: unassigned
tags:
  - cleanup
  - loot-filter
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-354
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:04.833Z'
    comment: Created ticket.
    id: a-2026-11-17t09-44-04-833z
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:04.833Z'
    comment: Created as subtask of WOKEPOET-354.
    id: a-2026-11-17t09-44-04-833z
  - type: comment
    user: Agent
    comment: >-
      PR #579 (woke/loot-filter-picks): shared/picks (togglePick, selectPick)
      for chips, Gear tab, Prices tab, Atlas; useTierMove for editor + Alt+F
      card. No behaviour change. Checks, e2e, perf pass.
    date: '2026-11-17T10:47:12.955Z'
    completionComment: true
    id: c-2026-11-17t10-47-12-955z
  - type: status_change
    from: Backlog
    to: Ready
    user: Agent
    date: '2026-11-17T10:47:12.955Z'
needsAction: null
---
> **TL;DR:** Moving items between tiers and Shift/Ctrl picking are copied between the filter editor, item card, Gear and Prices tabs and the Atlas window. One `useTierMove` and one `usePicks` for all.

Audit finding 5. Rebase on latest master right before the PR (other threads edit the loot filter).
