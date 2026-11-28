---
id: WOKEPOET-700
title: 'Levelling 1: gate + hideout'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-699
history:
  - type: activity
    user: Agent
    date: '2026-11-28T05:34:58.959Z'
    comment: Created ticket.
    id: a-2026-11-28t05-34-58-959z
  - type: activity
    user: Agent
    date: '2026-11-28T05:34:58.959Z'
    comment: Created as subtask of WOKEPOET-699.
    id: a-2026-11-28t05-34-58-959z
  - type: comment
    user: Agent
    comment: >-
      In review in PR 1069 (levelling part 1: Loot looks gate everywhere incl.
      hideout, Levelling page, below-maps floors). Merges on green.
    date: '2026-11-28T06:00:18.833Z'
    completionComment: true
    id: c-2026-11-28t06-00-18-833z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-28T06:00:18.833Z'
  - type: activity
    user: Agent
    date: '2026-11-28T06:00:20.669Z'
    comment: Updated implementation link.
    id: a-2026-11-28t06-00-20-669z
  - type: comment
    user: Agent
    comment: PR 1069 merged; dev build picks it up on the next master reload.
    completionComment: true
    date: '2026-11-28T07:06:36.806Z'
    id: c-2026-11-28t07-06-36-806z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T07:06:38.384Z'
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1069'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
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
Loot looks below the maps switch; where the levelling layer sits. The hideout is AreaLevel 60, so today it falls through to NeverSink.
