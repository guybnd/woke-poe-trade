---
id: WOKEPOET-423
title: Show title hovers in the app's own tooltip card
status: In Progress
priority: None
effort: M
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T16:55:29.544Z'
    comment: Created ticket.
---
Audit found ~800 native `title` tooltips in 176 files. One shared handler (ui/title-tip.ts, installed by HelpCard) shows any `title` in the themed help card at the cursor, with a short delay and warm follow-on. Opt out with `data-native-title`. Branch woke/app-tips, worktree E:\Git\woke\wt\app-tips. E2e: title-tip.spec.ts.
