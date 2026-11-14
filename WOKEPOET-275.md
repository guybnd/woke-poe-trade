---
id: WOKEPOET-275
title: 'Campaign route: town visits skip zones, card shows wrong step'
status: Done
priority: High
effort: S
assignee: unassigned
tags:
  - campaign
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T04:08:46.602Z'
    comment: Created ticket.
    id: a-2026-11-14t04-08-46-602z
  - type: comment
    user: Agent
    comment: >-
      Merged as c5b094b2. A town visit no longer moves the campaign route past
      zones you haven't been to.
    completionComment: true
    date: '2026-11-14T04:19:38.863Z'
    id: c-2026-11-14t04-19-38-863z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-14T04:19:39.269Z'
baselineCommit: 407ba7f1f2c478fed465d0b71f60be15ccdb1be0
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/436'
swimlane: null
diffSummary:
  - file: testing/e2e/loot-filter.spec.ts
    additions: 1
    deletions: 1
---
> **TL;DR:** Entering a town no longer jumps the campaign route past zones you haven't done, so the card shows the step for the zone you're in.

Cause: town entries matched a later town step up to 14 steps ahead. In Guy's act 4 (2026-11-14) the route went to "Hand in The Eternal Nightmare" and stuck through the Belly. Fixed in PR https://github.com/guybnd/woke-poe-trade/pull/436 (branch woke/zone-step). The adversarial review found one stall, the epilogue tail, which is fixed. All checks pass.
