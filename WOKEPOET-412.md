---
id: WOKEPOET-412
title: 'Nightmare map window: grid replaces bars, one section open at a time'
status: Done
priority: Medium
effort: S
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T08:13:16.075Z'
    comment: Created ticket.
    id: a-2026-11-20t08-13-16-075z
  - type: activity
    user: Agent
    date: '2026-11-20T08:13:21.394Z'
    comment: Updated implementation link.
    id: a-2026-11-20t08-13-21-394z
  - type: comment
    user: Agent
    comment: >-
      Squash-merged as a79afb61: grid replaces the bars; Worth running and Trade
      search open one at a time on a Nightmare Map.
    completionComment: true
    date: '2026-11-20T08:18:16.907Z'
    id: c-2026-11-20t08-18-16-907z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T08:18:17.340Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/673'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
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
Guy 2026-11-20 feedback after #671. PR https://github.com/guybnd/woke-poe-trade/pull/673.
