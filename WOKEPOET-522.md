---
id: WOKEPOET-522
title: 'Bug hunt 3: Net worth and run tracking'
status: Released
priority: Medium
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-24T01:33:15.234Z'
    comment: Created ticket.
    id: a-2026-11-24t01-33-15-234z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-24T01:33:21.672Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-24t01-33-21-672z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-24T01:33:21.672Z'
  - type: activity
    user: Agent
    date: '2026-11-24T01:50:18.788Z'
    comment: >-
      15 fixes committed (ca7ef95b on fix/bug-hunt-3); adversarial review and CI
      checks running. 4 product questions (uncollected Faustus sales in total,
      At Faustus box scope, run per hour away time, Listed big number) asked in
      the project thread.
    id: a-2026-11-24t01-50-18-788z
  - type: activity
    user: Event Horizon
    date: '2026-11-24T02:21:08.333Z'
    comment: Claim by claude-code@guy-pc expired (no heartbeat for 30 min)
    id: a-2026-11-24t02-21-08-333z
  - type: status_change
    from: In Progress
    to: Todo
    user: Event Horizon
    date: '2026-11-24T02:21:08.339Z'
  - type: comment
    user: Agent
    comment: >-
      PR 829 merged (8a1647b8): 15 bug fixes plus the At Faustus box on the dock
      card and goal. Reviews done, checks green.
    date: '2026-11-24T02:31:53.941Z'
    completionComment: true
    id: c-2026-11-24t02-31-53-941z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-24T02:31:53.941Z'
  - type: comment
    user: Agent
    comment: >-
      Merged PR 829 (8a1647b8): 15 bug fixes across Net worth, Strategy runs and
      Session story, plus Guy's pick that the At Faustus box covers the dock
      card total and goal. Two adversarial reviews, 5 findings fixed. Left open:
      pre-update tallies lack map-cost flags; aborted Stop drops pending reads;
      night deaths follow MapLog's char guess. Global per-hour setting split to
      WOKEPOET-525.
    completionComment: true
    date: '2026-11-24T02:32:04.093Z'
    id: c-2026-11-24t02-32-04-093z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T02:32:05.648Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:06:00.880Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/829'
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
Second bug hunt over Net worth (stash, Sales/Listed, chart, glance, fake-price guards #796-#800, Faustus toggle #819/#821) and run tracking (map runs, Session analytics, Strategy runs WOKEPOET-515, post-map toast, in-map timer). Skips what PR #824 fixed. Branch fix/bug-hunt-3, worktree E:\Git\woke\wt\bug-hunt-3.
