---
id: WOKEPOET-598
title: 'Bug hunt 2026-11-25: 39 fixes'
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
    date: '2026-11-25T04:59:04.360Z'
    comment: Created ticket.
    id: a-2026-11-25t04-59-04-360z
  - type: comment
    user: Agent
    comment: >-
      Merged at 5ac2902; dev build reloaded. Follow-ups: 599 (design picks),
      600, 601, 602.
    completionComment: true
    date: '2026-11-25T04:59:12.345Z'
    id: c-2026-11-25t04-59-12-345z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T04:59:13.199Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/916'
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
39 fixes across Net worth, sessions, maps, price check, settings and trade. PR: https://github.com/guybnd/woke-poe-trade/pull/916 (5ac2902).
