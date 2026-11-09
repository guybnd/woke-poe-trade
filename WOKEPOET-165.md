---
id: WOKEPOET-165
title: Cluster jewel "also grant" resistances as pseudo rows
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - price-check
  - woke
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-09T13:53:15.182Z'
    comment: Created ticket.
    id: a-2026-11-09t13-53-15-182z
  - type: comment
    user: Agent
    comment: >-
      Merged as #280 (95fdf444). The dev build is on master, and Guy confirmed
      it on his jewel.
    date: '2026-11-09T13:53:19.338Z'
    completionComment: true
    id: c-2026-11-09t13-53-19-338z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-09T13:53:19.338Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 95fdf444 and live on the master dev build. Cluster "also grant"
      resistance lines fold into a pseudo row that matches any element.
    completionComment: true
    date: '2026-11-09T13:53:23.286Z'
    id: c-2026-11-09t13-53-23-286z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-09T13:53:23.592Z'
needsAction: null
baselineCommit: e67d6ec4dad47efdb249e0afdf27705a03528309
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/280'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/loot-filter/RuleBuilder.vue
    additions: 11
    deletions: 1
  - file: renderer/src/web/woke/loot-filter/rules.ts
    additions: 20
    deletions: 3
  - file: renderer/test/woke/filter-rules.test.ts
    additions: 12
    deletions: 1
---
> **TL;DR:** A cluster jewel's "Added Small Passive Skills also grant: +X% <element> Resistance" line folds into a pseudo row that matches any element. Merged as #280 (95fdf444).

- One element line: a total Elemental Resistance row (any element, or all-res at a third).
- Element line plus an all-res line: "Fire, Cold or Lightning" at the same number, with both rows ticked.
- One row per mod: the line folds under the row's Pseudo chip.
- The trade site's pseudo totals don't count cluster lines, and weighted sums need a login.
