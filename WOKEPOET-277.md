---
id: WOKEPOET-277
title: 'Campaign: mouse wheel steps the route back and forth'
status: Done
priority: Medium
effort: S
assignee: unassigned
tags:
  - campaign
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T04:25:21.672Z'
    comment: Created ticket.
    id: a-2026-11-14t04-25-21-672z
  - type: comment
    user: Agent
    comment: >-
      Merged as 82d06c47. The mouse wheel over the campaign icon or the card's
      steps moves the route back and forth.
    completionComment: true
    date: '2026-11-14T04:46:13.437Z'
    id: c-2026-11-14t04-46-13-437z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-14T04:46:14.222Z'
baselineCommit: ae072f60270fa58e9d206c73fab27bd78609319b
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/438'
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
> **TL;DR:** Scroll the wheel over the campaign dock icon or the card's steps: down marks the step done, up steps back.

PR https://github.com/guybnd/woke-poe-trade/pull/438 (branch woke/campaign-wheel). Review found two issues, both fixed: a tall card now scrolls, and a 1-line-scroll notch now steps. Checks pass. Not tried in game.
