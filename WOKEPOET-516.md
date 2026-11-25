---
id: WOKEPOET-516
title: 'Atlas strategies: import hypostasis.faith links'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - atlas
  - bug
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-23T12:32:10.792Z'
    comment: Created ticket.
    id: a-2026-11-23t12-32-10-792z
  - type: comment
    user: Agent
    comment: >-
      PR #804 (head 471103c5). CI all green, MERGEABLE. Adversarial review
      findings fixed. Handed to the coordinator for merge.
    date: '2026-11-23T12:37:47.202Z'
    completionComment: true
    id: c-2026-11-23t12-37-47-202z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-23T12:37:47.203Z'
  - type: comment
    user: Agent
    comment: Merged at 7826584e; dev build reloaded onto it.
    completionComment: true
    date: '2026-11-23T12:38:27.646Z'
    id: c-2026-11-23t12-38-27-646z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-23T12:38:28.155Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:06:04.260Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/804'
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
Guy (2026-11-23): a hypostasis.faith atlas link (#t=) wouldn't import. PR #804 reads the short and long forms against the loaded atlas (same graph as GGG's) and stores a pathofexile.com link. Ruthless and stale links are refused.
