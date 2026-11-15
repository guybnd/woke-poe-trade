---
id: WOKEPOET-321
title: >-
  Wickerman: make it findable in game (dock icon, mechanics line, window,
  prices)
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - league-3.30
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T10:12:30.032Z'
    comment: Created ticket.
    id: a-2026-11-15t10-12-30-032z
  - type: comment
    user: Agent
    comment: >-
      PR #519 merged as 186667b8. It adds E, F and G plus version prices, which
      come from poe.ninja once the Market Viscera category is in. The merge
      thread added a perf fix (the window's rows render only while it is on
      screen).
    date: '2026-11-15T10:12:35.488Z'
    completionComment: true
    id: c-2026-11-15t10-12-35-488z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T10:12:35.488Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 186667b8. Adds the Wickerman dock icon in zones whose boss drops
      a Viscera, a line on the League mechanics card, a Wickerman window in the
      launcher, and a price for each version. Not yet tried in game. Open: which
      version drops where is unknown; Conqueror, Elder and Incarnation entries
      never match a zone name.
    completionComment: true
    date: '2026-11-15T10:12:41.885Z'
    id: c-2026-11-15t10-12-41-885z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T10:12:42.762Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/519'
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
Guy couldn't find the Wickerman module in game. Round 2 mocks: https://claude.ai/artifact/PMvnyzjUvoHDi7oXGVzDa5. He picked E (a dock icon where a boss drops a Viscera), F (a line on the League mechanics card) and G (a Wickerman window), plus prices per version. PR #519.
