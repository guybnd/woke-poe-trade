---
id: WOKEPOET-365
title: 'Diagnostics freezes: safety-net walk and price history saves'
status: Ready
priority: High
effort: None
assignee: unassigned
tags:
  - perf
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-17T14:09:48.482Z'
    comment: Created ticket.
---
From Guy's Diagnostics (save to history 1.5 s, overlay busy up to 1.4 s, first paint 7.9 s). PR #596: byBase safety-net walk (1.8x), price saves send once + skip day-file rewrite on repeats. First paint is dev-build only. Open: 647 MB woke-market folder (old league snapshots), Guy's call.
