---
id: WOKEPOET-383
title: 'S3: replace hard sleeps in dock-menu and trade e2e with page.clock'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - testing
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-380
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:49.077Z'
    comment: Created ticket.
    id: a-2026-11-18t15-25-49-077z
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:49.077Z'
    comment: Created as subtask of WOKEPOET-380.
    id: a-2026-11-18t15-25-49-077z
  - type: comment
    user: Agent
    comment: >-
      PR #634 merged (ed30a736): dock-menu and trade e2e fast-forward the page
      clock instead of sleeping 21 s + 8.5 s.
    date: '2026-11-18T15:57:46.489Z'
    completionComment: true
    id: c-2026-11-18t15-57-46-489z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T15:57:46.490Z'
  - type: comment
    user: Agent
    comment: 'Merged as ed30a736: page clock instead of ~30 s of hard sleeps.'
    completionComment: true
    date: '2026-11-18T15:57:54.772Z'
    id: c-2026-11-18t15-57-54-772z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T15:57:55.138Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:55.779Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/634'
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
version: '00002'
releasedAt: '2026-11-25T11:52:41.308Z'
releaseDocPath: release-notes/00002
---
dock-menu.spec.ts:97 waitForTimeout(21_000) (test takes 25 s every run); trade.spec.ts:148 (5.5 s) and :187 (3 s). Use Playwright page.clock to fast-forward the bubble/dismiss timers. ~30 s per run.
