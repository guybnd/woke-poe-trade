---
id: WOKEPOET-371
title: >-
  Base types: save refused with empty Class line when a row is fully split into
  slots
status: Ready
priority: High
effort: None
assignee: unassigned
tags:
  - loot-filter
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T07:54:40.813Z'
    comment: Created ticket.
---
> **TL;DR:** Saving failed ("R1-t5: Class has no values") when all five slots of a row had their own line: the row's leftover rule got `Class ==` with no values. Fix in PR #614 (branch woke/gear-empty-class); blocks v1.330.10.

withClasses() now returns null for an empty class list. The test uses Guy's exact settings.
