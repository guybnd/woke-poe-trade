---
id: WOKEPOET-434
title: 'Session window: merge Session analytics and Session story (A + D glance)'
status: Released
priority: High
effort: XL
assignee: unassigned
tags:
  - epic
  - ui
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T06:06:41.473Z'
    comment: Created ticket.
    id: a-2026-11-21t06-06-41-473z
  - type: comment
    user: Agent
    comment: 'All subtasks merged: PRs 705, 707, 708, 709, 710, 712, 715, 716, 718.'
    date: '2026-11-21T08:56:13.440Z'
    completionComment: true
    id: c-2026-11-21t08-56-13-440z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-21T08:56:13.440Z'
  - type: comment
    user: Agent
    comment: >-
      Epic done. Session analytics is now the one Session window: tonight's
      strip on top (705), stash-read income rows (707), strip click-through and
      chips (708), Nights tab (709), opt-in glance bar with seconds timer
      alongside the toast (710, 715), Ctrl+Space to a row (712), Session story
      window retired with its dock icon opening Session analytics (716), tonight
      survives restarts (718). Open: glance bar placement vs PoE's top-centre
      boss bar not checked in game.
    completionComment: true
    date: '2026-11-21T08:56:19.606Z'
    id: c-2026-11-21t08-56-19-606z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T08:56:20.090Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:59.851Z'
subtasks:
  - WOKEPOET-435
  - WOKEPOET-436
  - WOKEPOET-437
  - WOKEPOET-438
  - WOKEPOET-439
  - WOKEPOET-440
  - WOKEPOET-442
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/716'
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
version: '0001'
releasedAt: '2026-11-25T11:50:45.359Z'
releaseDocPath: release-notes/0001
---
Guy picked concept A (The Ledger) plus D (glance bar) on 2026-11-21. Mockups: https://claude.ai/artifact/S91TdBrGyCdFHcwWfN5xbS

One window: tonight's strip pinned on top (from NightCard), tabs Tonight / Nights / Maps / Strategies / Decks underneath (from WidgetSessionAnalytics + MapHistory). Clicking a strip segment opens that map's row.

Guy's change: income comes from net worth stash reads (~10 min apart), too slow to pin on a map. Each read is its own row between map rows: income since the last read, which maps it covers, per hour. Purchases left out as in #696.

Rules: nothing blocks gameplay, short factual text, key chips, RAM-conscious, perf budgets never raised. Old windows stay until the switch-over PR.
