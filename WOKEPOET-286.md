---
id: WOKEPOET-286
title: 'Ctrl+Space: crafting bench and Harvest craft costs'
status: Released
priority: None
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:18:43.453Z'
    comment: Created ticket.
    id: a-2026-11-15t05-18-43-453z
  - type: comment
    user: Agent
    comment: >-
      Merged as 87d70db5. Bench mod cards with tier tables (roll, cost, price,
      items, unlock), Harvest cards with priced costs and total; data fetched
      from public/data on palette open. Review fixes applied, perf within
      budget.
    completionComment: true
    date: '2026-11-15T05:18:49.826Z'
    id: c-2026-11-15t05-18-49-826z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:18:50.128Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:10:24.554Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/493'
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
version: '00024'
releasedAt: '2026-11-27T16:10:17.975Z'
releaseDocPath: release-notes/00024
---

