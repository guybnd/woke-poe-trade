---
id: WOKEPOET-408
title: 'Map strip: number chips toggle search, switches labelled trade search'
status: Released
priority: Medium
effort: S
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-20T04:03:19.681Z'
    comment: Created ticket.
    id: a-2026-11-20t04-03-19-681z
  - type: comment
    user: Agent
    comment: >-
      Merged as 3c5eb367: number chips toggle their search filter (scroll sets
      min), Trade search label + hint, map strip lazy (startup JS 1635.4 KB).
    completionComment: true
    date: '2026-11-20T04:20:34.445Z'
    id: c-2026-11-20t04-20-34-445z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T04:20:35.240Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:48.633Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/668'
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
Guy 2026-11-20: set Drops/Rarity/Pack from the strip; unclear what Any/Has/Not does. PR https://github.com/guybnd/woke-poe-trade/pull/668.
