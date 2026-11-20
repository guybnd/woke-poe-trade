---
id: WOKEPOET-414
title: 'Net worth per hour: skip hideout time, show last 1/2/3 h'
status: Grooming
priority: None
effort: M
assignee: unassigned
tags:
  - net-worth
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T10:28:16.619Z'
    comment: Created ticket.
---
Guy (2026-11-20): net worth profit per hour should leave out time in hideout/town, and show rolling last 1, 2 and 3 hour windows.

Plan: rate = sum of per-refresh net gains (ledger points' netChaos) in the window ÷ play time, where play time = span minus town-like time read on demand from Client.txt via the existing `game-log-range` op (isTownLike). No always-on tracker. Same numbers in Ctrl+Space.

Mocks: https://claude.ai/artifact/4AMW4gkqA9KvuwhxgF78hH (A recommended, building A meanwhile). Branch woke/networth-active-hour, worktree E:\Git\woke\wt\networth-hour.
