---
id: WOKEPOET-317
title: Show sub-chaos bulk prices as 1 div / N
status: In Progress
priority: Medium
effort: S
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T06:29:33.940Z'
    comment: Created ticket.
---
Guy's ask (2026-11-15): Ctrl+Space shows lifeforce at "0.009c". Items worth under 1c should read "1 div / 12,000" using the current divine rate, chaos value on hover.

Done on branch `woke/bulk-div-prices` (worktree E:\Git\woke-bulk-div):
- `bulkPerDivine` / `formatUnitPrice` in ui/format.ts (whole under 100, 2 significant figures above)
- `WPrice bulk` prop, opt-in for one-item prices only (totals/profits/EV unchanged)
- Applied: Ctrl+Space search + lookup detail + base uniques, item tooltip price strip, item menu, price tab bar, loot filter Prices tab, Mechanics price rows (not per-100 lifeforce rows, not Betrayal rewards), Expedition, scarabs
- Market browser (PR #498, still open) should pass `bulk` on its price cells once merged
