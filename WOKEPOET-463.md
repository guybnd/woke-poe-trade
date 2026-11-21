---
id: WOKEPOET-463
title: >-
  Glance bar drag handle: show only while Settings is open, not over trade
  search
status: In Progress
priority: Medium
effort: S
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T14:42:41.432Z'
    comment: Created ticket.
    id: a-2026-11-21t14-42-41-432z
  - type: activity
    user: Agent
    date: '2026-11-21T14:45:35.805Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/744 open: gate is
      wm.active && Settings shown. CI + adversarial review running.
    id: a-2026-11-21t14-45-35-805z
---
Guy: "glance bar handle shouldnt appear while trade search is up... just when in settings". The glance bar's drag handle (grip + "Glance bar | Tonight N maps") shows over the price check / trade window whenever the overlay is open. Gate it on Settings being open instead. Check after-map toast / big-hit popup handles for the same gate.
