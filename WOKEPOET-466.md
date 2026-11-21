---
id: WOKEPOET-466
title: Port upstream APT 3.30 fixes
status: In Progress
priority: Medium
effort: M
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: claude-code@guy-pc
history:
  - type: activity
    user: Agent
    date: '2026-11-21T16:02:45.228Z'
    comment: Created ticket.
    id: a-2026-11-21t16-02-45-228z
  - type: activity
    user: Agent
    date: '2026-11-21T16:16:05.990Z'
    comment: >-
      All six ports committed; PR
      https://github.com/guybnd/woke-poe-trade/pull/749 open, CI and adversarial
      review running. Trade fetch JSON marks twice-corrupted listings with
      item.doubleCorrupted: true.
    id: a-2026-11-21t16-16-05-990z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T16:16:15.011Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t16-16-15-011z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T16:16:15.011Z'
needsAction: null
claim:
  holder: claude-code@guy-pc
  claimedAt: '2026-11-21T16:16:15.011Z'
  expiresAt: '2026-11-21T16:46:15.011Z'
---
Port upstream Awakened PoE Trade 3.30 changes as one PR:
1. Temple rules + reminder text (22006b33)
2. More Scarabs -> More Threads (fbebcedd)
3. Twice Corrupted chip in filter name + results (adapted 158843e1; no trade filter)
4. item-drop.json data (57b313cf, e5371540)
