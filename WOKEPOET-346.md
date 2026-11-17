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
    id: a-2026-11-17t04-10-18-218z
  - type: activity
    user: Agent
    date: '2026-11-17T05:40:32.751Z'
    comment: >-
      PR #563 (woke/perf-filter-edits) sent to merge. Edits 135-170 → 50-87 ms,
      overlay close 100-145 → 58-67 ms (prod build, Guy's config). Open:
      settings file holds ~1 MB of undo/save history (move out of config.json);
      hidden/minimised panels keep ~4k DOM nodes (memory only); stack-sizes e2e
      test fails on master.
    id: a-2026-11-17t05-40-32-751z
---
Guy finds the overlay slow, mostly the loot filter editor. Audit master broadly: renderer responsiveness, reactivity/watchers, unvirtualized lists, repeated filter parsing/matching, IPC, memory and listeners. Rank findings by impact, fix the clear wins via PRs. The Gear tab (woke/gear-page) is owned by the Gear redesign thread; don't touch it.

Worktree: E:\Git\woke\wt\perf-audit, branch woke/perf-audit.
