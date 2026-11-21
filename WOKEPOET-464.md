---
id: WOKEPOET-464
title: Price check finds no listings for Cortex from Ctrl+Space
status: In Progress
priority: Medium
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T14:47:00.984Z'
    comment: Created ticket.
---
Guy: after PR 740, Trade site works for Cortex but price check doesn't. Cause: a unique priced without game text is treated as uncorrupted, and Cortex/Replica Cortex only exist corrupted (trade: corrupted=false → 0 of ~1669 listings). Fix: mark them corrupted in virtualUnique so the search uses "any". Branch woke/cortex-price-check.
