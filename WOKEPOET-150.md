---
id: WOKEPOET-150
title: A. Filter editor accepts the item tier condition
status: Grooming
priority: High
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-08T09:53:43.222Z'
    comment: Created as subtask of WOKEPOET-149.
---
Add the new tier condition (likely `UnidentifiedItemTier`, confirm from 3.30 patch notes / NeverSink 3.30) to `loot-filter/parse.ts`, `validate.ts`, `match.ts` so NeverSink 3.30 filters load without "unknown condition" warnings. Matching returns unknown until the parser knows an item's tier (D). Before launch.
