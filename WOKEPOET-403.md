---
id: WOKEPOET-403
title: 'Nightmare (T17) map value: map price vs boss fragment EV'
status: Done
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
  - type: activity
    user: Agent
    date: '2026-11-20T02:48:22.275Z'
    comment: Updated implementation link.
    id: a-2026-11-20t02-48-22-275z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/663
      (woke/nightmare-maps). Guy picked A (Boss runs Nightmare tab) + B2 (price
      check grid with icons, unique row). Estimates marked ~ (2 fragments a kill
      setting, 80% favoured, unique 5%). Local checks green: vue-tsc app+tests,
      eslint, vitest all, e2e nightmare-maps + boss/price-check specs. Two
      adversarial reviews, findings fixed. Open: rates and unique pairing
      unconfirmed for 3.30; Ctrl+Space search doesn't list Nightmare bosses yet.
      Mocks: https://claude.ai/artifact/JnieYEaSRWxQ9bQ5PeeRmL
    date: '2026-11-20T02:48:25.310Z'
    completionComment: true
    id: c-2026-11-20t02-48-25-310z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-20T02:48:25.310Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 9e239ee0 (golden trade-query entry added in ca04682a by the
      merge thread). Boss runs Nightmare tab + Nightmare Map price check grid
      with icons and unique row. Estimates marked ~; follow-ups: Ctrl+Space
      search lacks Nightmare bosses, exceptional supports not modelled, 3.30
      rates unconfirmed.
    completionComment: true
    date: '2026-11-20T02:57:15.094Z'
    id: c-2026-11-20t02-57-15-094z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T02:57:15.443Z'
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/663'
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
---
For each T17 map (Fortress, Abomination, Citadel, Sanctuary, Ziggurat): poe.ninja price of the map vs expected value of the uber fragments its boss drops; show which ones pay.

Facts (checked 2026-11-20):
- poe.ninja 3.30 lists one row "Nightmare Map" (type Map) for all T17s, so map cost is shared; trade base is also just "Nightmare Map".
- Biased fragments per map (maxroll 3.30 Nightmare Boss Rush table + poedb item pages): Abomination Reality/Awakening, Citadel Cosmic/Synthesising, Fortress Decaying/Synthesising, Sanctuary Traumatic/Reverent/Lonely, Ziggurat Devouring/Blazing. All 10 fragments priced on poe.ninja.
- No published rates. Wiki (3.25, via search): 1-3 fragments per kill, each 80% from the biased group. poe-farm-helper: scales with Atlas Drops. So values are estimates, frags-per-kill is a player setting.

Plan: mocks A/B/C (artifact), build A = Nightmare tab in Boss runs reusing its calc (kill log, typed rates, est. marks). No auto trade searches.
