---
id: WOKEPOET-409
title: Alt+T dead with PoB builds off (atlas drawing lost too)
status: In Progress
priority: High
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T04:27:03.627Z'
    comment: Created ticket.
---
Guy's Alt+T stopped working on 2026-11-20. Cause: the tree key was registered only by the PoB builds widget, and PoB builds is switched off in his live config. Fix in PR https://github.com/guybnd/woke-poe-trade/pull/669: register once while PoB builds or Atlas strategies is on.
