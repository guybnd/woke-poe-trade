---
id: WOKEPOET-375
title: 'Alt+F card: obvious Go to rule button (and G key)'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
  - ux
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T11:22:49.517Z'
    comment: Created ticket.
    id: a-2026-11-18t11-22-49-517z
  - type: comment
    user: Agent
    comment: 'Merged as 4b170c3e: Go to rule button and G key on the Alt+F card.'
    completionComment: true
    date: '2026-11-18T11:35:12.895Z'
    id: c-2026-11-18t11-35-12-895z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T11:35:13.294Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/620'
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
> **TL;DR:** The Alt+F card's "Open editor" was easy to miss; a "Go to rule ›" button beside the verdict (and G key) now opens the editor on the deciding rule (Base types tab for table rules). Guy picked option A from the mock and approved it on the dev build. Branch woke/altf-go-to-rule, handed over for PR.
