---
id: WOKEPOET-427
title: Spending shouldn't tank profit/hour (purchases read as losses)
status: Released
priority: Medium
effort: None
assignee: unassigned
tags:
  - net-worth
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T02:42:08.221Z'
    comment: Created ticket.
    id: a-2026-11-21t02-42-08-221z
  - type: activity
    user: Agent
    date: '2026-11-21T02:43:31.859Z'
    comment: >-
      Options for Guy (pick buttons):
      https://claude.ai/artifact/P5pQQGJLyFdVnDrVY7Yzmv . Building A
      (auto-detect purchases + per-refresh toggle) meanwhile.
    id: a-2026-11-21t02-43-31-859z
  - type: comment
    user: Agent
    comment: >-
      PR #696 merged after three adversarial review rounds and green CI.
      Purchases count 0 toward profit; manual marking from change list and
      chart; 3h chart range.
    date: '2026-11-21T03:27:45.706Z'
    completionComment: true
    id: c-2026-11-21t03-27-45-706z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T03:27:45.706Z'
  - type: comment
    user: Agent
    comment: >-
      Merged (557d1867). Purchases count 0 toward profit per hour, session and
      session story; same-size gains within 2 h cancel them; any losing refresh
      can be marked from the change list or a chart point with an amount, and
      dismissed. Purchase marker on the chart, plus a 3h range.
    completionComment: true
    date: '2026-11-21T03:27:54.338Z'
    id: c-2026-11-21t03-27-54-338z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T03:27:55.124Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:43.077Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/696'
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
Buying an item (e.g. 50 d) removes currency from stash; the bought item is equipped or unpriced, so diffStash books a -50 d net change. That flows into Net worth per-hour rates (play-time.ts playRate via ledger points), session profit (gains.ts stashGainsBetween -> Net worth session, Session story "Farming profit").

Plan: flag a read as a spend when a big net drop is mostly currency leaving with little coming in; spends count 0 toward profit/hour and session profit, show as a marker, and can be toggled per refresh. Options mocked for Guy in an artifact.
