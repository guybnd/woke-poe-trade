---
id: WOKEPOET-65
title: 'Price check: stop poe.ninja dragging the headline below listings'
status: Done
priority: High
effort: S
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-37
history:
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:34.635Z'
    comment: Created ticket.
    id: a-2026-11-05t08-10-34-635z
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:34.635Z'
    comment: Created as subtask of WOKEPOET-37.
    id: a-2026-11-05t08-10-34-635z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-05T08:39:53.661Z'
  - type: comment
    user: Agent
    comment: >-
      **PR #136 is reviewed, fixed and checked, and holds for Guy's answer on
      merges.** It stacks on #131. The floor only applies with 3 or more current
      listings, a deliberate relaxation so a lone ask or week-old stash listings
      can't set the price. Branch claude/pc-ninja-floor is in a separate clone.
      No docs needed.
    date: '2026-11-05T08:54:38.005Z'
    completionComment: true
    id: c-2026-11-05t08-54-38-005z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-05T08:54:38.005Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:16:55.636Z'
needsAction: null
reviewState: null
---
> TL;DR: 4 listings at 1,000c and poe.ninja at 100c headlines 399c. Never headline below the cheapest trusted listing, and leave poe.ninja out of rolled searches and corrupted or Foulborn uniques.

`sources.ts` headlinePrice, `useSmartPrice.ts` ninjaInfo, `getDetailsId.ts`. Report finding 2.
