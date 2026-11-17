---
id: WOKEPOET-354
title: Generalize one-off features
status: In Progress
priority: Medium
effort: XL
assignee: unassigned
tags:
  - epic
  - cleanup
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:43:51.301Z'
    comment: Created ticket.
    id: a-2026-11-17t09-43-51-301z
subtasks:
  - WOKEPOET-355
  - WOKEPOET-356
  - WOKEPOET-357
  - WOKEPOET-358
  - WOKEPOET-359
  - WOKEPOET-360
  - WOKEPOET-361
  - WOKEPOET-362
  - WOKEPOET-363
---
> **TL;DR:** Nine places where the same behaviour was written by hand in several windows get one shared version each, so a fix in one list applies to all. Guy said "Let's do all" on the audit page.

Audit: https://claude.ai/artifact/UBqnS7gJEuirEwK38q8VGU

One PR per subtask (base uniques rides with item rows). Each PR starts with a test that pins today's behaviour, then the refactor. No product changes beyond what each subtask lists; design questions get reported, not decided.
