---
id: WOKEPOET-570
title: Map stat columns in price check results
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-24T12:37:41.446Z'
    comment: Created ticket.
    id: a-2026-11-24t12-37-41-446z
  - type: activity
    user: Agent
    date: '2026-11-24T12:37:45.576Z'
    comment: Updated implementation link.
    id: a-2026-11-24t12-37-45-576z
  - type: comment
    user: Agent
    comment: >-
      A1 is built. Guy's pick is open:
      https://claude.ai/artifact/FiBQgWZ21e7M6owmu8VTyL
    date: '2026-11-24T12:37:46.628Z'
    selfAttested: true
    id: c-2026-11-24t12-37-46-628z
  - type: comment
    user: Agent
    comment: PR 877 merged (bd271ed).
    date: '2026-11-24T12:41:58.796Z'
    completionComment: true
    id: c-2026-11-24t12-41-58-796z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T12:41:58.796Z'
  - type: comment
    user: Agent
    comment: >-
      Merged at bd271ed; dev build reloaded. Guy's A1 pick still open in the
      mockup. Column values not yet seen live (no map price check open after
      reload).
    completionComment: true
    date: '2026-11-24T12:42:08.515Z'
    id: c-2026-11-24t12-42-08-515z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T12:42:09.035Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/877'
needsAction: null
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
Map stat columns in the price check result list. PR: https://github.com/guybnd/woke-poe-trade/pull/877
