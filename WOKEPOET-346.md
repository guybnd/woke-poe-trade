---
id: WOKEPOET-346
title: Performance audit of the overlay (master)
status: In Progress
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
    date: '2026-11-17T04:10:18.218Z'
    comment: Created ticket.
---
Guy finds the overlay slow, mostly the loot filter editor. Audit master broadly: renderer responsiveness, reactivity/watchers, unvirtualized lists, repeated filter parsing/matching, IPC, memory and listeners. Rank findings by impact, fix the clear wins via PRs. The Gear tab (woke/gear-page) is owned by the Gear redesign thread; don't touch it.

Worktree: E:\Git\woke\wt\perf-audit, branch woke/perf-audit.
