---
id: WOKEPOET-436
title: 'Session window 2: Tonight ledger with stash-read income rows'
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
    date: '2026-11-21T06:06:46.596Z'
    comment: Created ticket.
    id: a-2026-11-21t06-06-46-596z
  - type: activity
    user: Agent
    date: '2026-11-21T06:06:46.596Z'
    comment: Created as subtask of WOKEPOET-434.
    id: a-2026-11-21t06-06-46-596z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T06:56:57.582Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t06-56-57-582z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T06:56:57.582Z'
  - type: comment
    user: Agent
    comment: >-
      PR 707 merged (ba719a92): stash reads as income rows in Map history. CI
      green, adversarial review fixes applied.
    date: '2026-11-21T07:07:50.933Z'
    completionComment: true
    id: c-2026-11-21t07-07-50-933z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T07:07:50.933Z'
  - type: comment
    user: Agent
    comment: >-
      Merged (ba719a92). Map history interleaves each Net worth stash read
      (saved gains, net-worth/gains.ts) as its own row: income since the read
      before, maps covered (by leftAt), per hour when 5+ min apart; purchases
      via resolveSpends over all gains, then cut to the range. Re-reads each
      minute while open. Helpers session-story/income.ts with tests. Release
      note added. Not done here: loot on map-row click (Farming loot isn't
      linked to Map history records; fold into step 3 if wanted).
    completionComment: true
    date: '2026-11-21T07:07:55.638Z'
    id: c-2026-11-21t07-07-55-638z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T07:07:56.051Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/707'
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
Map history becomes the Tonight list (time bar, deaths, character, Met as chips). Each net worth stash read is its own row placed by time between maps: income since last read, maps it covers, per hour; purchases left out (#696). Row click shows loot picked up.
