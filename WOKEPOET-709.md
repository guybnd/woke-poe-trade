---
id: WOKEPOET-709
title: 'Base ranks: split Exotic into valuable and the rest'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-649
history:
  - type: activity
    user: Agent
    date: '2026-11-28T05:58:34.516Z'
    comment: Created ticket.
    id: a-2026-11-28t05-58-34-516z
  - type: activity
    user: Agent
    date: '2026-11-28T05:58:34.516Z'
    comment: Created as subtask of WOKEPOET-649.
    id: a-2026-11-28t05-58-34-516z
  - type: comment
    user: Agent
    comment: Colour pick still open; E1 magenta is live.
    date: '2026-11-28T05:58:40.173Z'
    selfAttested: true
    pin: true
    id: c-2026-11-28t05-58-40-173z
  - type: comment
    user: Agent
    comment: >-
      Merged at f175a08; dev build reloaded. Colour pick still open (E1 magenta
      live).
    completionComment: true
    date: '2026-11-28T05:58:41.353Z'
    id: c-2026-11-28t05-58-41-353z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T05:58:41.976Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1049'
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
Base ranks splits Exotic into valuable and the rest, each with its own colour. PR: https://github.com/guybnd/woke-poe-trade/pull/1049 (f175a08).
