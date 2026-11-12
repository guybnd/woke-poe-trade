---
id: WOKEPOET-224
title: Session analytics CSV is named by the UTC date
status: Grooming
priority: Low
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-218
history:
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:12.656Z'
    comment: Created as subtask of WOKEPOET-218.
---
main/src/woke/session-store.ts names maps-YYYY-MM-DD.csv from toISOString, so a morning export in Australia gets yesterday's date. Fix: local date.
