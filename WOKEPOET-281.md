---
id: WOKEPOET-281
title: 'PoB auto: gems, gear and tree stay in step'
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - pob
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T04:56:53.358Z'
    comment: Created ticket.
    id: a-2026-11-14t04-56-53-358z
  - type: comment
    user: Agent
    comment: 'PR #441 squash-merged as 7b66dc8a.'
    date: '2026-11-14T05:05:02.596Z'
    completionComment: true
    id: c-2026-11-14t05-05-02-596z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-14T05:05:02.596Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 7b66dc8a. Gems, gear and tree stay in step on passive points;
      checked live at L45/A6 (54/54/54).
    completionComment: true
    date: '2026-11-14T05:05:07.061Z'
    id: c-2026-11-14t05-05-07-061z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-14T05:05:07.669Z'
needsAction: null
baselineCommit: ae072f60270fa58e9d206c73fab27bd78609319b
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/441'
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
Guy (2026-11-14): "why is auto not synced between all 3". After #437 the tree moved by passive points while gems/gear stayed by title. PR https://github.com/guybnd/woke-poe-trade/pull/441: gems and gear follow the tree's same-named sets; Next skips empty specs; Tree row only when names differ. Live on dev (4520ac8e): L45/A6 → 54/54/54.
