---
id: WOKEPOET-592
title: Fit the dock card's "After a map" settings
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-25T03:40:47.149Z'
    comment: Created ticket.
    id: a-2026-11-25t03-40-47-149z
  - type: comment
    user: Agent
    comment: Merged at b47bca1; dev build reloaded.
    completionComment: true
    date: '2026-11-25T03:40:51.563Z'
    id: c-2026-11-25t03-40-51-563z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T03:40:52.617Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/904'
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
---
"After a map" settings in the dock card: labels above, options wrap. PR: https://github.com/guybnd/woke-poe-trade/pull/904 (b47bca1).
