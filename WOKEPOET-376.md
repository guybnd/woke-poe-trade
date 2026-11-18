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
---
Guy: "move the stacked deck session analytics section into its own tab from here too".

Today the Stacked decks window (WidgetStackedDecks.vue) shows either the live session, or the start prompt plus a "Last session" block (opened/spent/got/result, under-2c switch, graph, card list) and the own-average line.

Plan: split the window with WTabs like Run timer (Splits / Past runs): a live Session tab, and a past-sessions tab that reuses DeckHistory.vue (already Session analytics' Stacked decks tab). Mocks first, Guy picks.
