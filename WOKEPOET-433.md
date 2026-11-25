---
id: WOKEPOET-433
title: 'Vaults: drop the measured rate; tag hover lists rewards'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T04:55:37.693Z'
    comment: Created ticket.
    id: a-2026-11-21t04-55-37-693z
  - type: comment
    user: Agent
    comment: >-
      Merged (5ec22b95), dev build reloaded. Rate text and constants gone from
      the app; tag hover lists the vault's rewards and prices; test guards
      against the rate coming back.
    completionComment: true
    date: '2026-11-21T04:55:43.366Z'
    id: c-2026-11-21t04-55-43-366z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T04:55:43.945Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:42.336Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/703'
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
version: '00002'
releasedAt: '2026-11-25T11:52:41.308Z'
releaseDocPath: release-notes/00002
---
Guy: the 54% vault rate is his own strategy, not general. Remove it from the app's text; the Nightmare vault tag hover should list that vault's reward options and prices.
