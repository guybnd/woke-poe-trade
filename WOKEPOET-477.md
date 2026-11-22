---
id: WOKEPOET-477
title: 'Market Prices: more time ranges (3h to 7d) for sparkline and % change'
status: In Progress
priority: Medium
effort: M
assignee: unassigned
tags:
  - market
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-22T10:10:41.413Z'
    comment: Created ticket.
    id: a-2026-11-22t10-10-41-413z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-22T10:10:44.583Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-22t10-10-44-583z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-22T10:10:44.583Z'
  - type: activity
    user: Agent
    date: '2026-11-22T10:14:28.912Z'
    comment: >-
      Mockups for Guy to pick from:
      https://claude.ai/artifact/F8HcJFKDjGuhpaGCh5ECVm (building A meanwhile)
    id: a-2026-11-22t10-14-28-912z
needsAction: null
claim:
  holder: claude-code@guy-pc
  claimedAt: '2026-11-22T10:10:44.583Z'
  expiresAt: '2026-11-22T10:40:44.583Z'
---
Guy wants the Market window's Prices tab to offer more ranges than "Last 7 days", for both the sparkline and the % change. Remember the chosen range; surface the new info in Ctrl+Space search; every row keeps its hover tooltip.

Data findings:
- poe.ninja's dense feed only has 7 daily points per item (% vs today).
- The app saves its own full snapshots every ~30 min while running, kept 3 days (Covens: 210 snapshots, median gap 24 min). poe.ninja refreshes currency about hourly, other categories ~every 30 min.
- So: 3h/6h/12h/24h/2d from the app's snapshots, 3d/7d from poe.ninja. 1h not offered (one currency tick).
