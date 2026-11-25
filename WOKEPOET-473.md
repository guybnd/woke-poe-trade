---
id: WOKEPOET-473
title: 'Net worth: fake poe.ninja price on thin div cards inflates net worth'
status: Released
priority: High
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-22T06:52:00.439Z'
    comment: Created ticket.
    id: a-2026-11-22t06-52-00-439z
  - type: activity
    user: Agent
    date: '2026-11-22T06:57:46.685Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/755 open; adversarial
      review done, 4 findings fixed; waiting on CI.
    id: a-2026-11-22t06-57-46-685z
  - type: comment
    user: Agent
    comment: >-
      PR 755 merged: thin-item price jumps held up to 6h, glitched chart read
      fixed. Review findings fixed, CI green.
    date: '2026-11-22T07:01:34.685Z'
    completionComment: true
    id: c-2026-11-22t07-01-34-685z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T07:01:34.685Z'
  - type: comment
    user: Agent
    comment: >-
      Thin items' 5x+ poe.ninja jumps held at the last read's price for up to 6h
      (mark + hover); glitched chart reads shown at prior prices. Backtested on
      3 days of snapshots; adversarial review's 4 findings fixed. Open: an item
      first seen mid-glitch isn't held.
    completionComment: true
    date: '2026-11-22T07:01:43.392Z'
    id: c-2026-11-22t07-01-43-392z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T07:01:43.931Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:54.669Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/755'
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
The Witch (7,075c, really 0.2c) and Rain Tempter (857c, really 0.01c) spiked on poe.ninja 2026-11-22 ~13:50-16:00 Sydney; Guy's 16:00 read had Div cards 107k c, net worth 196k vs ~100k. Both were thin (gaps 6/7). Users report the same skew.

Fix: hold a thin item's 5x+ jump at the last read's price for up to 6h (marker + hover); drop chart points a price glitch pushed up and the next read reverted. Backtest on 3 days of snapshots in the thread.
