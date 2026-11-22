---
id: WOKEPOET-487
title: >-
  Bulk price check: wrong currency market picked, currency unclear (Originator's
  Exalted)
status: In Progress
priority: High
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-22T23:15:54.362Z'
    comment: Created ticket.
    id: a-2026-11-22t23-15-54-362z
  - type: activity
    user: Agent
    date: '2026-11-22T23:18:42.374Z'
    comment: >-
      Mockups (A recommended, building A):
      https://claude.ai/artifact/1QJTgUJpZtA3NNXXtL1iCw
    id: a-2026-11-22t23-18-42-374z
---
Discord report via Guy: price checking Originator's Exalted Orb (stack 3) shows "1 div each", table "1 / div / bulk 1/1".

Root cause (checked live, Covens): chaos market has 911 offers at 1-3c each; divine market 343 offers at 1 div each. The combined first search (have divine+chaos, sorted by raw amount) returns only 15 chaos rows of 100, so the chaos side is marked "load on demand" (total null) and the view auto-picks divine. The pick is by count, never by price, so the headline quoted the divine market ~100x+ over the real price.

Plan: pick the market by price in chaos (load chaos when needed), show both markets in the verdict with chaos equivalents, currency icon on every price, clear ratio.
