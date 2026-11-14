---
id: WOKEPOET-275
title: 'Campaign route: town visits skip zones, card shows wrong step'
status: Ready
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
---
> **TL;DR:** Entering a town no longer jumps the campaign route past zones you haven't done, so the card shows the step for the zone you're in.

Cause: town entries matched a later town step up to 14 steps ahead. In Guy's act 4 (2026-11-14) the route went to "Hand in The Eternal Nightmare" and stuck through the Belly. Fixed in PR https://github.com/guybnd/woke-poe-trade/pull/436 (branch woke/zone-step). The adversarial review found one stall, the epilogue tail, which is fixed. All checks pass.
