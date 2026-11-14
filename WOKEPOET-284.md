---
id: WOKEPOET-284
title: 'Price check: a unique priced by name gets its mods as stat rows'
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T05:25:15.873Z'
    comment: Created ticket.
    id: a-2026-11-14t05-25-15-873z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/445: unique mods from the
      tooltip data become stat rows, all unticked. Adversarial review found 6
      issues (auto-ticks, another base's mods, choice lines, seeds, negative
      ranges, filter chip), all fixed and tested. Local checks, e2e and JS
      budgets pass.
    date: '2026-11-14T05:41:17.745Z'
    completionComment: true
    id: c-2026-11-14t05-41-17-745z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-14T05:41:17.745Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as ea41afa5. A unique priced by name gets its mods as unticked stat
      rows from the tooltip data, with each roll at the bottom of its range.
    completionComment: true
    date: '2026-11-14T05:54:02.660Z'
    id: c-2026-11-14t05-54-02-660z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-14T05:54:03.072Z'
needsAction: null
baselineCommit: ae072f60270fa58e9d206c73fab27bd78609319b
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/445'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/loot-filter/compose.ts
    additions: 1
    deletions: 1
  - file: renderer/src/web/woke/loot-filter/store.ts
    additions: 3
    deletions: 14
  - file: renderer/test/woke/filter-flows.test.ts
    additions: 11
    deletions: 0
  - file: renderer/test/woke/filter-price-flows.test.ts
    additions: 6
    deletions: 5
---
Guy: "why cant i get any of the stats to filter when i price check from a searched item". A unique priced from Ctrl+Space search or the item menu had no game text, so it had no stat rows to filter on.

Change: build Ctrl+Alt+C-style game text from tips/uniques.json, with each range at its low end, and read it with the real parser. Rows start unticked, so the first search stays name-only. English only. A variant comes from the price row when it's known; otherwise only the mods every variant shares are used. Mod pools (more than 4 implicits or more than 12 explicits) and unreadable lines are left out. 1110 of 1194 known uniques get rows. Branch woke/search-unique-stats.
