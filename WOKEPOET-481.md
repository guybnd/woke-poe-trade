---
id: WOKEPOET-481
title: 'Price check: guess which unique an unidentified jewel is from its art'
status: Released
priority: Medium
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-22T11:42:22.253Z'
    comment: Created ticket.
    id: a-2026-11-22t11-42-22-253z
  - type: activity
    user: Agent
    date: '2026-11-22T11:51:24.342Z'
    comment: >-
      Mockups for Guy's pick: https://claude.ai/artifact/FeUUkk6b5tAW9X7vXzNyHH
      (db picks/guy). Building A.
    id: a-2026-11-22t11-51-24-342z
  - type: comment
    user: Agent
    comment: >-
      PR 765 merged (d142adc1). Option A is live on master: an art guess for
      one-slot unid uniques, a Change list with prices, poe.ninja first for unid
      jewels. Guy's layout pick is still open; not yet tested against the real
      game.
    date: '2026-11-22T13:20:40.242Z'
    completionComment: true
    id: c-2026-11-22t13-20-40-242z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T13:20:40.242Z'
  - type: comment
    user: Agent
    comment: >-
      Merged in PR 765 (option A). Guy's layout pick is still open on the
      mockups artifact.
    completionComment: true
    date: '2026-11-22T13:20:49.501Z'
    id: c-2026-11-22t13-20-49-501z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T13:20:50.283Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:52.989Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/765'
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
Guy's idea: price checking an unidentified unique jewel asks which unique it is. Guess instead from the item art on screen (screenshot at the hotkey press, matched against the candidate uniques' icons), with an easy switch to change the pick. Unid jewel prices stay poe.ninja first, trade search only on click.
