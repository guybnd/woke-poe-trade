---
id: WOKEPOET-383
title: 'S3: replace hard sleeps in dock-menu and trade e2e with page.clock'
status: Grooming
priority: None
effort: None
assignee: unassigned
tags:
  - testing
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-380
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:49.077Z'
    comment: Created as subtask of WOKEPOET-380.
---
dock-menu.spec.ts:97 waitForTimeout(21_000) (test takes 25 s every run); trade.spec.ts:148 (5.5 s) and :187 (3 s). Use Playwright page.clock to fast-forward the bubble/dismiss timers. ~30 s per run.
