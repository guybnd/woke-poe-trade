---
id: WOKEPOET-388
title: 'G2: atlas strategy list unit tests for add, remove, import, undo'
status: Grooming
priority: None
effort: None
assignee: unassigned
tags:
  - testing
  - atlas
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-380
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:26:00.212Z'
    comment: Created as subtask of WOKEPOET-380.
---
Bugs WOKEPOET-222, 227, 228, 229 were strategy list state bugs (new strategy inherits removed one's draft, same-name import shares regexes, undo after add does nothing, Settings link hidden by draft). Cover the store with unit tests.
