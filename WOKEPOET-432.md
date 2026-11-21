---
id: WOKEPOET-432
title: 'Session story: Mirage chip on the after-map toast'
status: In Progress
priority: None
effort: S
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T03:39:55.376Z'
    comment: Created ticket.
---
> **TL;DR:** Maps where you stepped into a Mirage get a "Mirage" chip on the after-map toast, in map history and in Ctrl+Space search.

Signal: entering a Mirage reloads the same map instance (same area id and seed) and Client.txt logs `[LOADING SCREEN] (Mirage of Fortress)`. Verified in Guy's real Client.txt (11 hits, 2026-11-19..21). A Mirage you never step into leaves no log line, so it can't be shown.

Branch: woke/mirage-chip
