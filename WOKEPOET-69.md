---
id: WOKEPOET-69
title: 'Price check: show more, mocks first'
status: Done
priority: Medium
effort: L
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-37
history:
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:43.740Z'
    comment: Created ticket.
    id: a-2026-11-05t08-10-43-740z
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:43.740Z'
    comment: Created as subtask of WOKEPOET-37.
    id: a-2026-11-05t08-10-43-740z
  - type: comment
    user: Agent
    comment: >-
      **Which of these should I build?** Mocks:
      https://claude.ai/artifact/T7Ty4PqX9C1iKtLGvdqovp. Listing mods hover card
      (A) or open row (B), bulk verdict, price data age, weighted search, real
      sales from the trade log. Proposed default: hover card, data age and bulk
      verdict first.
    date: '2026-11-05T09:41:10.740Z'
    id: c-2026-11-05t09-41-10-740z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-05T09:41:10.740Z'
    comment: >-
      **Which of these should I build?** Mocks:
      https://claude.ai/artifact/T7Ty4PqX9C1iKtLGvdqovp. Listing mods hover card
      (A) or open row (B), bulk verdict, price data age, weighted search, real
      sales from the trade log. Proposed default: hover card, data age and bulk
      verdict first.
  - type: comment
    user: Agent
    comment: >-
      Guy said keep going, so building the suggested picks first: hover card
      with corrupted tags, price data age, bulk verdict. Weighted search and
      real sales wait.
    date: '2026-11-05T11:03:17.267Z'
    id: c-2026-11-05t11-03-17-267z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-05T11:03:17.267Z'
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-05T11:03:17.267Z'
  - type: comment
    user: Agent
    comment: >-
      **Do you want weighted search and real sales built too?** Hover card
      (#160), data age (#161) and bulk verdict (#164) are merged. Proposed
      default: leave those two out until you've tried the rest in game.
    date: '2026-11-05T12:03:31.316Z'
    id: c-2026-11-05t12-03-31-316z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-05T12:03:31.316Z'
    comment: >-
      **Do you want weighted search and real sales built too?** Hover card
      (#160), data age (#161) and bulk verdict (#164) are merged. Proposed
      default: leave those two out until you've tried the rest in game.
  - type: comment
    user: Agent
    comment: >-
      Guy (2026-11-13, "Apply all"): close this. Parked as ideas, not built:
      weighted search, and real sales from the trade log. Hover card (#160),
      data age (#161) and bulk verdict (#164) shipped.
    date: '2026-11-13T01:55:30.782Z'
    selfAttested: true
    id: c-2026-11-13t01-55-30-782z
  - type: comment
    user: Agent
    comment: 'Answered: park weighted search and real sales as ideas; close.'
    date: '2026-11-13T01:55:31.676Z'
    id: c-2026-11-13t01-55-31-676z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-13T01:55:31.676Z'
    comment: 'Answered: park weighted search and real sales as ideas; close.'
  - type: comment
    user: Agent
    comment: >-
      Closed on Guy's "Apply all" (2026-11-13). Shipped: #160, #161, #164.
      Weighted search and real sales parked as ideas.
    date: '2026-11-13T01:55:58.836Z'
    completionComment: true
    id: c-2026-11-13t01-55-58-836z
  - type: status_change
    from: In Progress
    to: Done
    user: Agent
    date: '2026-11-13T01:55:58.836Z'
swimlane: null
needsAction: null
---
> TL;DR: Listing mods on hover, a corrupted column, a verdict for bulk items, price data age, weighted searches and real sales from the trade log. New UI, so mocks and Guy's pick come first.

Report: veteran's concerns table.
