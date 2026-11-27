---
id: WOKEPOET-253
title: 'Loot filter: Hide maps below tier 17 never hides T16'
status: Released
priority: Low
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-218
history:
  - type: activity
    user: Agent
    date: '2026-11-12T11:20:08.014Z'
    comment: Created ticket.
    id: a-2026-11-12t11-20-08-014z
  - type: activity
    user: Agent
    date: '2026-11-12T11:20:08.014Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-20-08-014z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T11:55:00.662Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:10:32.732Z'
needsAction: null
version: '00024'
releasedAt: '2026-11-27T16:10:17.975Z'
releaseDocPath: release-notes/00024
---
NeverSink's T16 rule is MapTier >= 16 (no cap), so mapTierCap skips it.
