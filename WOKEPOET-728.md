---
id: WOKEPOET-728
title: >-
  Loot filter tutorial: first-open tour, ? How the filter works page, first
  Alt+F cards
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
  - loot-filter
  - ux
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-28T15:59:38.843Z'
    comment: Created ticket.
    id: a-2026-11-28t15-59-38-843z
  - type: activity
    user: Agent
    date: '2026-11-28T16:12:46.500Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/1129 open; waiting on CI.
      Shots: E:\Git\woke\shots\filter-tutorial\{1080p,4k}\
    id: a-2026-11-28t16-12-46-500z
  - type: comment
    user: Agent
    comment: >-
      PR 1129 merged after green CI (standing rule: threads on Guy's PC merge
      their own PRs). Tour, ? page, Alt+F cards shipped.
    date: '2026-11-28T16:19:39.639Z'
    completionComment: true
    id: c-2026-11-28t16-19-39-639z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-28T16:19:39.639Z'
  - type: comment
    user: Agent
    comment: >-
      Merged PR 1129 (squash 1b1414a1). Tour (A), ? How the filter works page
      with Show me + Replay (C), first Alt+F cards (F1), shared TourCard (price
      check tour reuses it, now zoom-aware), Ctrl+Z on the rare score card,
      What's new line. CI green. Shots in
      E:\Git\woke\shots\filter-tutorial\{1080p,4k}.
    completionComment: true
    date: '2026-11-28T16:19:44.799Z'
    id: c-2026-11-28t16-19-44-799z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T16:19:45.271Z'
needsAction: null
baselineCommit: 8289be3944ec8e037ccf214e1ae02b1146f21d66
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1129'
swimlane: null
diffSummary:
  - file: release-next-notes.md
    additions: 1
    deletions: 0
  - file: renderer/src/web/woke/loot-filter/CurrencyCard.vue
    additions: 3
    deletions: 2
  - file: renderer/src/web/woke/loot-filter/currency-weights.ts
    additions: 83
    deletions: 17
  - file: renderer/src/web/woke/loot-filter/unique-classes.ts
    additions: 8
    deletions: 2
  - file: renderer/test/woke/filter-loot-special-rolls.test.ts
    additions: 45
    deletions: 6
---
Guy's picks A + C, F1 (mock https://claude.ai/artifact/FtQxvcuANikFBwZsbjzvEh).

- A: six-card tour the first time the loot filter window opens on our own filter (All loot, Section rulers, Steps, Section choice, Gear, Preview).
- C: ? in the title bar (lit until opened) opens How the filter works: a tile per part with Show me (tab + flash) and Replay tour.
- F1: first Alt+F card gets three cards (Rule path, Needle, Ctrl+Z).
- Shared TourCard (price check tour reuses it); What's new line; e2e + unit tests.
