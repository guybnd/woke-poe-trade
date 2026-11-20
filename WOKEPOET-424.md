---
id: WOKEPOET-424
title: 'Net worth time bar: hover a colour to outline it and show its share'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - net-worth
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T17:15:19.992Z'
    comment: Created ticket.
    id: a-2026-11-20t17-15-19-992z
  - type: comment
    user: Agent
    comment: >-
      Merged #689: hovering a time bar colour or its legend entry outlines it,
      fades the others and shows "Maps 62%" above it. Review fixes included (own
      class, rounded ends, edge clamp, stale hover reset, <1%, legend tooltip
      share). On the dev build via master c304389c.
    completionComment: true
    date: '2026-11-20T17:15:24.429Z'
    id: c-2026-11-20t17-15-24-429z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T17:15:25.217Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/689'
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
Guy asked (2026-11-20): hovering a colour on the Net worth per hour time bar should select it with an outline and show a label above it with its percentage. Built, reviewed and merged as #689.
