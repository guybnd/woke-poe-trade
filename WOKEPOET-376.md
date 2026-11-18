---
id: WOKEPOET-376
title: 'Stacked decks window: session analytics in its own tab'
status: Grooming
priority: Medium
effort: S
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
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
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/624'
---
Guy: "move the stacked deck session analytics section into its own tab from here too".

Today the Stacked decks window (WidgetStackedDecks.vue) shows either the live session, or the start prompt plus a "Last session" block (opened/spent/got/result, under-2c switch, graph, card list) and the own-average line.

Plan: split the window with WTabs like Run timer (Splits / Past runs): a live Session tab, and a past-sessions tab that reuses DeckHistory.vue (already Session analytics' Stacked decks tab). Mocks first, Guy picks.
