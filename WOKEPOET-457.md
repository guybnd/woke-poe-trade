---
id: WOKEPOET-457
title: 'Tool audit: act on Guy''s keep / improve / retire picks'
status: Released
priority: Medium
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T12:19:01.204Z'
    comment: Created ticket.
    id: a-2026-11-21t12-19-01-204z
  - type: activity
    user: Agent
    date: '2026-11-21T13:14:30.050Z'
    comment: >-
      Guy's picks: retire the Session analytics Strategies tab (PR 737); improve
      Flips (WOKEPOET-155) and Map scan (WOKEPOET-458); keep everything else
      (Wealthy Exile, Drop counter, Death recap, Stopwatch, Labyrinth, Atlas,
      Mechanics, Challenges, Regex library, Megalo, Lab gems, Wickerman).
    id: a-2026-11-21t13-14-30-050z
  - type: comment
    user: Agent
    comment: >-
      Guy picked. Strategies tab retired in PR 737 (merged). Flips improvement
      is WOKEPOET-155, Map scan merge is WOKEPOET-458. Everything else is kept.
    date: '2026-11-21T13:19:47.763Z'
    completionComment: true
    id: c-2026-11-21t13-19-47-763z
  - type: status_change
    from: Require Input
    to: Ready
    user: Agent
    date: '2026-11-21T13:19:47.763Z'
  - type: comment
    user: Agent
    comment: >-
      Strategies tab retired (PR 737). Improvements filed: WOKEPOET-155 (Flips),
      WOKEPOET-458 (Map scan into Map mods).
    completionComment: true
    date: '2026-11-21T13:19:52.923Z'
    id: c-2026-11-21t13-19-52-923z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T13:19:53.787Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:57.306Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/737'
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
Ranked audit of the weakest overlay tools, with Guy's picks stored on the card: https://claude.ai/artifact/GcCaMCbbGftoqCeMA5CbGD (db collection "picks"). Retire nothing until Guy picks. Retiring = add to RETIRED_MODULES in modules.ts (see PR 735).
