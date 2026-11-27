---
id: WOKEPOET-376
title: 'Stacked decks window: session analytics in its own tab'
status: Released
priority: Medium
effort: S
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-18T11:24:08.955Z'
    comment: Created ticket.
    id: a-2026-11-18t11-24-08-955z
  - type: activity
    user: Agent
    date: '2026-11-18T11:26:34.951Z'
    comment: >-
      Mocks A/B/C with pick buttons sent to Guy:
      https://claude.ai/artifact/PYHSvx6zzXCq1rF5EhMe42 (picks in its db at
      picks/current). Recommended A.
    id: a-2026-11-18t11-26-34-951z
  - type: activity
    user: Agent
    date: '2026-11-18T12:00:56.006Z'
    comment: Updated implementation link.
    id: a-2026-11-18t12-00-56-006z
  - type: activity
    user: Agent
    date: '2026-11-18T12:02:54.367Z'
    comment: Updated implementation link.
    id: a-2026-11-18t12-02-54-367z
  - type: comment
    user: Agent
    comment: 'Session | Past sessions tabs (Guy''s pick A), PR #624, merged as 9d8a06db.'
    date: '2026-11-18T12:16:35.587Z'
    completionComment: true
    id: c-2026-11-18t12-16-35-587z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T12:16:35.587Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 9d8a06db: Stacked decks window has Session | Past sessions tabs;
      Past sessions reuses DeckHistory.
    completionComment: true
    date: '2026-11-18T12:16:41.924Z'
    id: c-2026-11-18t12-16-41-924z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T12:16:47.257Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:30:57.783Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/624'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
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
version: '0003'
releasedAt: '2026-11-27T04:30:50.393Z'
releaseDocPath: release-notes/0003
---
Guy: "move the stacked deck session analytics section into its own tab from here too".

Today the Stacked decks window (WidgetStackedDecks.vue) shows either the live session, or the start prompt plus a "Last session" block (opened/spent/got/result, under-2c switch, graph, card list) and the own-average line.

Plan: split the window with WTabs like Run timer (Splits / Past runs): a live Session tab, and a past-sessions tab that reuses DeckHistory.vue (already Session analytics' Stacked decks tab). Mocks first, Guy picks.
