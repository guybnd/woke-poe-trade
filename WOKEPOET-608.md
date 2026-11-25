---
id: WOKEPOET-608
title: 'Card set line: "more/less than buying it" instead of "dearer"'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - polish
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-25T07:08:48.295Z'
    comment: Created ticket.
    id: a-2026-11-25t07-08-48-295z
  - type: comment
    user: Agent
    comment: Merged at 3eb5451; dev build reloaded.
    completionComment: true
    date: '2026-11-25T07:08:51.523Z'
    id: c-2026-11-25t07-08-51-523z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T07:08:51.996Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:46.662Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/925'
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
Card set lines read "N% more/less than buying it" instead of "dearer/cheaper". PR: https://github.com/guybnd/woke-poe-trade/pull/925 (3eb5451).
