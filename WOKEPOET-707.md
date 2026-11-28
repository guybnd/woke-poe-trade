---
id: WOKEPOET-707
title: 'Levelling 8: NeverSink levelling rules off when ours are on + in-game walk'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
  - testing
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-699
history:
  - type: activity
    user: Agent
    date: '2026-11-28T05:35:08.320Z'
    comment: Created ticket.
    id: a-2026-11-28t05-35-08-320z
  - type: activity
    user: Agent
    date: '2026-11-28T05:35:08.320Z'
    comment: Created as subtask of WOKEPOET-699.
    id: a-2026-11-28t05-35-08-320z
  - type: comment
    user: Agent
    comment: 'PR 1080 merged as 847f21a: NeverSink levelling rules off when ours are on.'
    date: '2026-11-28T09:05:36.457Z'
    completionComment: true
    id: c-2026-11-28t09-05-36-457z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-28T09:05:36.457Z'
  - type: comment
    user: Agent
    comment: >-
      PR 1080 merged as 847f21a. Closed on the coordinator's word; the in-game
      walk (Act 1, Act 6, hideout, quest items) isn't recorded here as done.
    completionComment: true
    date: '2026-11-28T09:05:40.912Z'
    id: c-2026-11-28t09-05-40-912z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T09:05:41.386Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1080'
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
Turn NeverSink's levelling rules off when ours are on. In-game walk: Act 1, Act 6, hideout; confirm quest items always show.
