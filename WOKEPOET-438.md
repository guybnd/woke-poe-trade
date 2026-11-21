---
id: WOKEPOET-438
title: 'Session window 4: Nights tab with a strip per night'
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-434
history:
  - type: activity
    user: Agent
    date: '2026-11-21T06:06:50.052Z'
    comment: Created ticket.
    id: a-2026-11-21t06-06-50-052z
  - type: activity
    user: Agent
    date: '2026-11-21T06:06:50.052Z'
    comment: Created as subtask of WOKEPOET-434.
    id: a-2026-11-21t06-06-50-052z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T07:20:57.629Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t07-20-57-629z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T07:20:57.629Z'
  - type: comment
    user: Agent
    comment: 'PR 709 merged (3f9f642b): Nights tab. CI green, review fixes applied.'
    date: '2026-11-21T07:30:17.482Z'
    completionComment: true
    id: c-2026-11-21t07-30-17-482z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T07:30:17.482Z'
  - type: comment
    user: Agent
    comment: >-
      Merged (3f9f642b). Nights tab in Session analytics
      (session-story/NightsList.vue via WidgetSessionStory.vue's export): strip,
      time, maps, profit per night; a click shows the night in the top band and
      clears the old map pick. Map history says when a picked map is outside the
      range vs not saved yet. Release note added.
    completionComment: true
    date: '2026-11-21T07:30:19.471Z'
    id: c-2026-11-21t07-30-19-471z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T07:30:19.949Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/709'
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
One thin strip per night with time, maps and income; clicking a night loads it into the top band and the ledger.
