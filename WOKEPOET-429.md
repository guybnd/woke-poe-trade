---
id: WOKEPOET-429
title: 'Ctrl+Space search: pick a new answer as you type'
status: In Progress
priority: Medium
effort: XS
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: claude-code@GUY-PC
history:
  - type: activity
    user: Agent
    date: '2026-11-21T03:13:43.004Z'
    comment: Created ticket.
    id: a-2026-11-21t03-13-43-004z
  - type: activity
    user: claude-code@GUY-PC
    date: '2026-11-21T03:13:46.227Z'
    comment: Claimed by claude-code@GUY-PC
    id: a-2026-11-21t03-13-46-227z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@GUY-PC
    date: '2026-11-21T03:13:46.227Z'
needsAction: null
claim:
  holder: claude-code@GUY-PC
  claimedAt: '2026-11-21T03:13:46.227Z'
  expiresAt: '2026-11-21T03:43:46.227Z'
---
Guy: typing "50d/" selects the web search row; "50d/c" adds the calculator answer on top but the web row stays selected, so Enter opens poewiki. Fix: while the query changes, never keep the web row and let a new top answer take over.
