---
id: WOKEPOET-604
title: 'Tooltip audit picks: mod tier ladder and item extras'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-25T05:25:59.304Z'
    comment: Created ticket.
    id: a-2026-11-25t05-25-59-304z
  - type: comment
    user: Agent
    comment: Merged at 5d659bc (item data v34); dev build reloaded.
    completionComment: true
    date: '2026-11-25T05:26:02.371Z'
    id: c-2026-11-25t05-26-02-371z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T05:26:03.363Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:47.420Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/918'
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
version: '0001'
releasedAt: '2026-11-25T11:50:45.359Z'
releaseDocPath: release-notes/0001
---
Tooltips: mod tier ladder, plus extras veterans look up on uniques, bases, maps, cards, gems and essences. Bumps item data to version 34. PR: https://github.com/guybnd/woke-poe-trade/pull/918 (5d659bc).
