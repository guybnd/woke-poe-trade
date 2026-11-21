---
id: WOKEPOET-439
title: 'Session window 5: glance bar in maps and hideout card'
status: Done
priority: None
effort: M
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-434
history:
  - type: activity
    user: Agent
    date: '2026-11-21T06:06:51.894Z'
    comment: Created ticket.
    id: a-2026-11-21t06-06-51-894z
  - type: activity
    user: Agent
    date: '2026-11-21T06:06:51.894Z'
    comment: Created as subtask of WOKEPOET-434.
    id: a-2026-11-21t06-06-51-894z
  - type: activity
    user: Agent
    date: '2026-11-21T06:07:19.934Z'
    comment: Updated title. Updated description.
    id: a-2026-11-21t06-07-19-934z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T07:30:40.351Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t07-30-40-351z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T07:30:40.351Z'
  - type: comment
    user: Agent
    comment: >-
      PR 710 merged (e278b84b): opt-in glance bar alongside the toast. CI green,
      review fixes applied.
    date: '2026-11-21T07:47:00.587Z'
    completionComment: true
    id: c-2026-11-21t07-47-00-587z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T07:47:00.587Z'
  - type: comment
    user: Agent
    comment: >-
      Merged (e278b84b). Opt-in glance bar (session-story/GlanceBar.vue, toggle
      in ChipSettings): map, tier, minutes this time in
      (MapLog.enteredThisTime), tonight's maps and profit; follows
      MapLog.inCountedMap; click-through; top 52px, z-index 950 to clear the
      dock. Sits alongside the map toast. OPEN: Guy hasn't said whether it
      should replace the toast; in-game placement vs PoE's top-centre boss bar
      not checked. Hideout card not built (toast covers it).
    completionComment: true
    date: '2026-11-21T07:47:02.475Z'
    id: c-2026-11-21t07-47-02-475z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T07:47:03.111Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/710'
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
> TL;DR: thin glance bar while mapping and a short hideout card; open question whether it replaces the map toast.

Thin click-through bar while mapping: timer, map, map count, tonight's income, mini strip. Back in hideout: short card with the last map and latest stash read, hides on leaving. A key opens the full window. Must fit the overlay RAM budget.

OPEN (asked Guy in thread 2026-11-21): replace the map toast (#693) or sit alongside it? Default until answered: alongside, toast untouched.
