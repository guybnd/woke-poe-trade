---
id: WOKEPOET-487
title: >-
  Bulk price check: wrong currency market picked, currency unclear (Originator's
  Exalted)
status: Done
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
  - type: activity
    user: Agent
    date: '2026-11-22T23:32:44.915Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/774 open; review fixes
      pushed (a55c95e9 + master merge). Waiting on CI.
    id: a-2026-11-22t23-32-44-915z
  - type: comment
    user: Agent
    comment: >-
      PR 774 merged (e52c3629): cheaper market first, currency icons,
      other-market line, review fixes, TradeBulk async for startup budget.
    date: '2026-11-23T01:07:12.921Z'
    completionComment: true
    id: c-2026-11-23t01-07-12-921z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-23T01:07:12.921Z'
  - type: comment
    user: Agent
    comment: >-
      Merged (e52c3629). Open: Guy's A/B/C mockup pick and the price spread line
      idea.
    completionComment: true
    date: '2026-11-23T01:07:13.913Z'
    id: c-2026-11-23t01-07-13-913z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-23T01:07:14.207Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/774'
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
Discord report via Guy: price checking Originator's Exalted Orb (stack 3) shows "1 div each", table "1 / div / bulk 1/1".

Root cause (checked live, Covens): chaos market has 911 offers at 1-3c each; divine market 343 offers at 1 div each. The combined first search (have divine+chaos, sorted by raw amount) returns only 15 chaos rows of 100, so the chaos side is marked "load on demand" (total null) and the view auto-picks divine. The pick is by count, never by price, so the headline quoted the divine market ~100x+ over the real price.

Plan: pick the market by price in chaos (load chaos when needed), show both markets in the verdict with chaos equivalents, currency icon on every price, clear ratio.
