---
id: WOKEPOET-467
title: 'Sales table: sortable columns'
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - net-worth
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T16:09:12.641Z'
    comment: Created ticket.
    id: a-2026-11-21t16-09-12-641z
  - type: activity
    user: Agent
    date: '2026-11-21T16:13:50.494Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/748 opened; review + CI
      running.
    id: a-2026-11-21t16-13-50-494z
  - type: comment
    user: Agent
    comment: >-
      Merged in PR #748 (https://github.com/guybnd/woke-poe-trade/pull/748).
      Sortable Sales columns + older unique/rare sale tooltips fixed. Reviewed
      twice, CI green.
    date: '2026-11-21T16:30:15.111Z'
    completionComment: true
    id: c-2026-11-21t16-30-15-111z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T16:30:15.111Z'
  - type: comment
    user: Agent
    comment: >-
      Sales table headers sort (click again flips), Price by chaos value,
      unpriced / no-ninja last, sort kept in config (salesSort). Also fixed:
      older unique and rare sales without stored mods had no tooltip. Unit +
      fake-game e2e; 2 adversarial reviews; CI green.
    completionComment: true
    date: '2026-11-21T16:30:18.955Z'
    id: c-2026-11-21t16-30-18-955z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T16:30:19.241Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/748'
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
Net worth > Sales table: click a header (Item, Price, value, vs ninja, When) to sort; click again to flip. Numbers/dates start highest/newest, Item A-Z. Default When newest. Unpriced / no vs-ninja rows last. Pure sort in net-worth/sales.ts with unit tests; e2e click test. Sort kept in widget config.
