---
id: WOKEPOET-442
title: 'Session window: Ctrl+Space map results open Map history at that row'
status: In Progress
priority: None
effort: S
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: claude-code@guy-pc
parentId: WOKEPOET-434
history:
  - type: activity
    user: Agent
    date: '2026-11-21T07:20:40.846Z'
    comment: Created ticket.
    id: a-2026-11-21t07-20-40-846z
  - type: activity
    user: Agent
    date: '2026-11-21T07:20:40.846Z'
    comment: Created as subtask of WOKEPOET-434.
    id: a-2026-11-21t07-20-40-846z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T07:47:20.152Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t07-47-20-152z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T07:47:20.152Z'
needsAction: null
claim:
  holder: claude-code@guy-pc
  claimedAt: '2026-11-21T07:47:20.152Z'
  expiresAt: '2026-11-21T08:17:20.152Z'
---
> TL;DR: left over from step 3 (WOKEPOET-437). Picking a map or "tonight"/"last vault" result in Ctrl+Space should open Session analytics on Map history and scroll to that row (focusAt in WidgetSessionAnalytics.vue). Search lookups (search/lookups/session-story.ts) don't open windows at a row yet.
