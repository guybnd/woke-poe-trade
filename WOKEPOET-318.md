---
id: WOKEPOET-318
title: 'Character and stash readers: read 3.30''s mod objects'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
  - pob
  - '3.30'
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-304
history:
  - type: activity
    user: Agent
    date: '2026-11-15T06:47:09.102Z'
    comment: Created ticket.
    id: a-2026-11-15t06-47-09-102z
  - type: activity
    user: Agent
    date: '2026-11-15T06:47:09.102Z'
    comment: Created as subtask of WOKEPOET-304.
    id: a-2026-11-15t06-47-09-102z
  - type: comment
    user: Agent
    comment: 'Merged #504 (f43e09e6).'
    completionComment: true
    date: '2026-11-15T06:47:16.215Z'
    id: c-2026-11-15t06-47-16-215z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T06:47:16.689Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/504'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/pob-builds/BuildDetail.vue
    additions: 4
    deletions: 4
  - file: renderer/src/web/woke/pob-builds/build-model.ts
    additions: 14
    deletions: 0
  - file: renderer/test/woke/pob-builds.test.ts
    additions: 39
    deletions: 1
---
In 3.30 the character and stash replies from pathofexile.com send each mod as `{ description, flags }`, not a string, so every worn item came through with no mods. This broke the Character tab, the price check's worn-gear compare and the stash reader. The readers now take both shapes and keep the crafted and fractured flags. Shipped in PR #504.
