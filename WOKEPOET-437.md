---
id: WOKEPOET-437
title: 'Session window 3: strip click-through, chip filters, Ctrl+Space jumps'
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
    date: '2026-11-21T06:06:48.541Z'
    comment: Created ticket.
    id: a-2026-11-21t06-06-48-541z
  - type: activity
    user: Agent
    date: '2026-11-21T06:06:48.541Z'
    comment: Created as subtask of WOKEPOET-434.
    id: a-2026-11-21t06-06-48-541z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T07:08:07.538Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t07-08-07-538z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T07:08:07.538Z'
  - type: comment
    user: Agent
    comment: >-
      PR 708 merged (144a49c5): strip click-through, mechanic/death chips. CI
      green, review fixes applied.
    date: '2026-11-21T07:20:36.789Z'
    completionComment: true
    id: c-2026-11-21t07-20-36-789z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T07:20:36.789Z'
  - type: comment
    user: Agent
    comment: >-
      Merged (144a49c5). Strip map segments in Session analytics are clickable:
      Map history opens, pages and scrolls to the row (exact enteredAt match,
      once per pick, same segment re-clickable), with a hint when the map isn't
      saved yet; a row click outlines its segment. Chips: top 6 mechanics +
      Deaths. Release note added. Ctrl+Space jump to a row NOT done: search
      results can't open a window at a row yet; left for a follow-up.
    completionComment: true
    date: '2026-11-21T07:20:38.965Z'
    id: c-2026-11-21t07-20-38-965z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T07:20:39.550Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/708'
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
Clicking a strip segment scrolls to and opens its row; the selected row outlines its segment. Chips (Vaults, Mirage, mechanics, Deaths) filter the list. Ctrl+Space: "tonight", "last vault", "best night" open the window at the row.
