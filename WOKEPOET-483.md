---
id: WOKEPOET-483
title: >-
  Net worth: one-day poe.ninja fake (The Web 28,886c) slipped past the thin-jump
  guard
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
    date: '2026-11-22T14:38:37.929Z'
    comment: Created ticket.
---
Follow-up to WOKEPOET-473. The Web dropped off poe.ninja for about 8h, so the baseline forgot its 2.25c price. It came back at 28,886c (gaps 6), and the guard had no reference. Fix: the baseline keeps `ref` (the last solid price), and a one-day price of 10c or more doesn't count while it's 5x or more over ref, or there's no ref, until poe.ninja has a second day.
