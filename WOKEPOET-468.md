---
id: WOKEPOET-468
title: 'Price check: show each defence/DPS max roll in the stat header'
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-22T05:04:37.380Z'
    comment: Created ticket.
    id: a-2026-11-22t05-04-37-380z
  - type: activity
    user: Agent
    date: '2026-11-22T05:05:54.187Z'
    comment: >-
      Mockups for Guy (pick buttons):
      https://claude.ai/artifact/XLdTTCJWWVZjdpn5pqgDpp . Building A meanwhile.
    id: a-2026-11-22t05-05-54-187z
  - type: activity
    user: Agent
    date: '2026-11-22T05:13:21.982Z'
    comment: >-
      Guy picked B (min..max under each big number's bar; chips hover only).
      Implemented on woke/max-roll, PR
      https://github.com/guybnd/woke-poe-trade/pull/751. Over-20% quality
      counted at item's own quality.
    id: a-2026-11-22t05-13-21-982z
  - type: comment
    user: Agent
    comment: >-
      Merged in PR 751 (pick B: lowest..max under each big number's bar). Review
      fixes applied, CI green.
    date: '2026-11-22T05:20:53.990Z'
    completionComment: true
    id: c-2026-11-22t05-20-53-990z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T05:20:53.990Z'
  - type: comment
    user: Agent
    comment: >-
      Stat header shows each big number's range (lowest..max) under its roll bar
      (Guy's pick B); chips/legend in hover. Max = base top roll + mods at top
      rolls at trade quality (item's own when >20). Hidden for fixed uniques,
      plain pastes, values over max.
    completionComment: true
    date: '2026-11-22T05:20:57.487Z'
    id: c-2026-11-22t05-20-57-487z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T05:20:57.979Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/751'
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
Guy asked if the price check can show what a max roll of the item's values could be (armour 2206 / ES 474 chips). The filter bounds already hold the max: base top roll + each local mod at its tier max, at Q20. Show it in the stat header (armour/weapon). Better-tier ceiling needs mod tier data we don't ship: out of scope.
