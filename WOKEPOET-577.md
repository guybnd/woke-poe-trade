---
id: WOKEPOET-577
title: 'Map price check: rare-only mods back in the mod list'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-24T15:32:01.885Z'
    comment: Created ticket.
    id: a-2026-11-24t15-32-01-885z
  - type: comment
    user: Agent
    comment: Merged at 25c8689; dev build reloaded.
    completionComment: true
    date: '2026-11-24T15:32:06.492Z'
    id: c-2026-11-24t15-32-06-492z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T15:32:07.136Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/891'
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
Regression fix after the map price check redesign (WOKEPOET-571, PR 880): rare-only mods show in the one list again, yellow and searchable. PR: https://github.com/guybnd/woke-poe-trade/pull/891 (25c8689).
