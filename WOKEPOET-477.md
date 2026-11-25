---
id: WOKEPOET-477
title: 'Market Prices: more time ranges (3h to 7d) for sparkline and % change'
status: Released
priority: Medium
effort: M
assignee: unassigned
tags:
  - market
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-22T10:10:41.413Z'
    comment: Created ticket.
    id: a-2026-11-22t10-10-41-413z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-22T10:10:44.583Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-22t10-10-44-583z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-22T10:10:44.583Z'
  - type: activity
    user: Agent
    date: '2026-11-22T10:14:28.912Z'
    comment: >-
      Mockups for Guy to pick from:
      https://claude.ai/artifact/F8HcJFKDjGuhpaGCh5ECVm (building A meanwhile)
    id: a-2026-11-22t10-14-28-912z
  - type: comment
    user: Agent
    comment: >-
      Merged in PR 760 (master 40414aee): range picker 3h–7d on Market Prices,
      remembered; Ctrl+Space extra columns. Review fixes in, CI green.
    date: '2026-11-22T10:39:09.136Z'
    completionComment: true
    id: c-2026-11-22t10-39-09-136z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T10:39:09.136Z'
  - type: comment
    user: Agent
    comment: >-
      Prices tab range picker 3h/6h/12h/24h/2d/3d/7d (option A, remembered).
      Under 3d from the app's own snapshots via new market-series host op; 3d/7d
      poe.ninja daily; 1h not offered. Ctrl+Space extra columns for
      3h/6h/12h/2d. Review fixes in; CI green.
    completionComment: true
    date: '2026-11-22T10:39:16.816Z'
    id: c-2026-11-22t10-39-16-816z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T10:39:17.382Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:53.952Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/760'
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
Guy wants the Market window's Prices tab to offer more ranges than "Last 7 days", for both the sparkline and the % change. Remember the chosen range; surface the new info in Ctrl+Space search; every row keeps its hover tooltip.

Data findings:
- poe.ninja's dense feed only has 7 daily points per item (% vs today).
- The app saves its own full snapshots every ~30 min while running, kept 3 days (Covens: 210 snapshots, median gap 24 min). poe.ninja refreshes currency about hourly, other categories ~every 30 min.
- So: 3h/6h/12h/24h/2d from the app's snapshots, 3d/7d from poe.ninja. 1h not offered (one currency tick).
