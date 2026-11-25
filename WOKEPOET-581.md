---
id: WOKEPOET-581
title: Fix misleading prices for unidentified uniques
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - bug
  - price-check
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-24T17:39:30.416Z'
    comment: Created ticket.
    id: a-2026-11-24t17-39-30-416z
  - type: comment
    user: Agent
    comment: >-
      Merged at 55cc4e1; dev build reloaded. "Check unid price" on an unid
      Forbidden Flame not yet seen live (no price check open after reload).
    completionComment: true
    date: '2026-11-24T17:39:35.825Z'
    id: c-2026-11-24t17-39-35-825z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T17:39:36.142Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:50.291Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/895'
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
version: 1.30.20
releasedAt: '2026-11-25T04:05:49.382Z'
releaseDocPath: release-notes/1.30.20
---
Unid rolled uniques use the unid trade price everywhere, not poe.ninja's guess. PR: https://github.com/guybnd/woke-poe-trade/pull/895 (55cc4e1).
