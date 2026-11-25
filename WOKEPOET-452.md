---
id: WOKEPOET-452
title: 'Price check: Search bulk button'
status: Released
priority: Medium
effort: XS
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T10:50:42.977Z'
    comment: Created ticket.
    id: a-2026-11-21t10-50-42-977z
  - type: comment
    user: Agent
    comment: >-
      PR #727 merged: Search bulk button, plus hideout/stash icon before the
      count. CI green, review fixes in.
    date: '2026-11-21T11:03:43.498Z'
    completionComment: true
    id: c-2026-11-21t11-03-43-498z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T11:03:43.498Z'
  - type: comment
    user: Agent
    comment: >-
      Search bulk beside Search runs one search with Bulk on and loads more
      pages as needed; it sits outside the hover-to-search area. Hideout/stash
      icon now before the ×count in one column. Other e2e specs use an exact
      Search match.
    completionComment: true
    date: '2026-11-21T11:03:46.719Z'
    id: c-2026-11-21t11-03-46-719z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T11:03:47.147Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:58.559Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/727'
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
Follow-up to WOKEPOET-449: a Search bulk button beside Search runs one search with Bulk already on, loading more pages if needed. PR https://github.com/guybnd/woke-poe-trade/pull/727
