---
id: WOKEPOET-589
title: 'Price check: no fake drops; Lifeforce relations and tooltip text fixes'
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
    date: '2026-11-25T02:57:41.060Z'
    comment: Created ticket.
    id: a-2026-11-25t02-57-41-060z
  - type: comment
    user: Agent
    comment: Merged at 3c448ff (item data v31); dev build reloaded.
    completionComment: true
    date: '2026-11-25T02:57:45.928Z'
    id: c-2026-11-25t02-57-45-928z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T02:57:46.214Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:49.832Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/886'
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
Price check stops showing fake drop sources; Lifeforce relations; item tooltip text fixes. Bumps item data to version 31. PR: https://github.com/guybnd/woke-poe-trade/pull/886 (3c448ff).
