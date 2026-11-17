---
id: WOKEPOET-361
title: Folds remember open or closed
status: Ready
priority: None
effort: S
assignee: unassigned
tags:
  - cleanup
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-354
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:08.690Z'
    comment: Created ticket.
    id: a-2026-11-17t09-44-08-690z
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:08.690Z'
    comment: Created as subtask of WOKEPOET-354.
    id: a-2026-11-17t09-44-08-690z
  - type: comment
    user: Agent
    comment: >-
      PR #580 (woke/remembered-folds): ui/fold useFold/useOneOpen; 13 folds
      remember state. Review bug (watcher scope) fixed. Checks, e2e, perf pass.
    date: '2026-11-17T10:59:51.363Z'
    completionComment: true
    id: c-2026-11-17t10-59-51-363z
  - type: status_change
    from: Backlog
    to: Ready
    user: Agent
    date: '2026-11-17T10:59:51.363Z'
needsAction: null
---
> **TL;DR:** About 20 folds keep their own open state and forget it; only Gem versions remembers. One `useFold(key)` / WFold in ui/.

Audit finding 9.
