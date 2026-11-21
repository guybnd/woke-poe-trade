---
id: WOKEPOET-465
title: 'After-map toast: resizing gives room, not zoom'
status: In Progress
priority: Medium
effort: S
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: claude-code@guy-pc
history:
  - type: activity
    user: Agent
    date: '2026-11-21T14:53:39.700Z'
    comment: Created ticket.
    id: a-2026-11-21t14-53-39-700z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T14:53:43.680Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t14-53-43-680z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T14:53:43.680Z'
needsAction: null
claim:
  holder: claude-code@guy-pc
  claimedAt: '2026-11-21T14:53:43.680Z'
  expiresAt: '2026-11-21T15:23:43.680Z'
---
> **TL;DR** Guy: resizing the after-map summary scales everything instead of giving the content more space. The corner grip set a zoom (chipScale) since PR 693, not PR 736. Make the grip set width/height; only UI size / Panel size scale it.
