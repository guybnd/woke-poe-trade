---
id: WOKEPOET-403
title: 'Nightmare (T17) map value: map price vs boss fragment EV'
status: In Progress
priority: Medium
effort: M
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T02:21:46.778Z'
    comment: Created ticket.
    id: a-2026-11-20t02-21-46-778z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-20T02:23:53.489Z'
  - type: activity
    user: Agent
    date: '2026-11-20T02:23:57.693Z'
    comment: >-
      Mocks A/B/C with pick buttons:
      https://claude.ai/artifact/JnieYEaSRWxQ9bQ5PeeRmL (pick in its db at
      picks/current). Building A in wt/nightmare-maps, branch
      woke/nightmare-maps.
    id: a-2026-11-20t02-23-57-693z
needsAction: null
---
For each T17 map (Fortress, Abomination, Citadel, Sanctuary, Ziggurat): poe.ninja price of the map vs expected value of the uber fragments its boss drops; show which ones pay.

Facts (checked 2026-11-20):
- poe.ninja 3.30 lists one row "Nightmare Map" (type Map) for all T17s, so map cost is shared; trade base is also just "Nightmare Map".
- Biased fragments per map (maxroll 3.30 Nightmare Boss Rush table + poedb item pages): Abomination Reality/Awakening, Citadel Cosmic/Synthesising, Fortress Decaying/Synthesising, Sanctuary Traumatic/Reverent/Lonely, Ziggurat Devouring/Blazing. All 10 fragments priced on poe.ninja.
- No published rates. Wiki (3.25, via search): 1-3 fragments per kill, each 80% from the biased group. poe-farm-helper: scales with Atlas Drops. So values are estimates, frags-per-kill is a player setting.

Plan: mocks A/B/C (artifact), build A = Nightmare tab in Boss runs reusing its calc (kill log, typed rates, est. marks). No auto trade searches.
