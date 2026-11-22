---
id: WOKEPOET-476
title: 'Price check: filter loaded listings live when a stat range tightens'
status: In Progress
priority: Medium
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-22T09:44:50.572Z'
    comment: Created ticket.
---
Guy: after results load, tightening a stat's min/max (or ticking a readable stat) should filter the already-fetched listings locally, with no trade search. Widening/unticking/other filters keep the stale "search again" state. Must clearly show filtered-locally vs needs-search. Mockups: https://claude.ai/artifact/2smVMauq1dqp9pZZu9g9xw (recommended A: hide + teal strip + show hidden; red strip when stale). Branch woke/price-check-local-filter.
