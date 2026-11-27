---
id: WOKEPOET-374
title: 'Loot filter: tiers keyed on numbers, not names (cluster jewels first)'
status: Released
priority: Medium
effort: L
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-18T11:21:40.178Z'
    comment: Created ticket.
    id: a-2026-11-18t11-21-40-178z
  - type: activity
    user: Agent
    date: '2026-11-18T11:24:14.332Z'
    comment: >-
      Mockups for Guy's picks: https://claude.ai/artifact/Q5BRTNyyaz4HX6d4LFXcJ5
      (picks in its db at picks/current).
    id: a-2026-11-18t11-24-14-332z
  - type: activity
    user: Agent
    date: '2026-11-18T11:27:31.059Z'
    comment: Updated tags.
    id: a-2026-11-18t11-27-31-059z
  - type: comment
    user: Agent
    comment: >-
      Guy's picks (2026-11-18): layout A (one list per size, rules in words),
      edit numbers in row AND side panel, M (merge price + fallback cluster
      groups into one page), scope All number-keyed groups, P (passive types
      priced live from poe.ninja, pinnable).
    date: '2026-11-18T11:27:32.120Z'
    selfAttested: true
    pin: true
    id: c-2026-11-18t11-27-32-120z
  - type: activity
    user: Agent
    date: '2026-11-18T11:51:56.958Z'
    comment: >-
      Part 1 (number edit, numbers-first rows, size headings, side panel) is PR
      https://github.com/guybnd/woke-poe-trade/pull/622, adversarial review
      running. Next: M (merge price group into cluster page) + P (passive types
      from poe.ninja ClusterJewel).
    id: a-2026-11-18t11-51-56-958z
  - type: activity
    user: Agent
    date: '2026-11-18T11:52:11.056Z'
    comment: Updated description. Changed effort to L. Updated implementation link.
    id: a-2026-11-18t11-52-11-056z
  - type: activity
    user: Agent
    date: '2026-11-18T11:53:13.512Z'
    comment: Updated description.
    id: a-2026-11-18t11-53-13-512z
  - type: status_change
    from: Grooming
    to: Todo
    user: Agent
    date: '2026-11-18T11:53:15.153Z'
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-18T11:53:19.835Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-18t11-53-19-835z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-18T11:53:19.835Z'
  - type: activity
    user: Event Horizon
    date: '2026-11-18T12:24:29.914Z'
    comment: Claim by claude-code@guy-pc expired (no heartbeat for 30 min)
    id: a-2026-11-18t12-24-29-914z
  - type: status_change
    from: In Progress
    to: Todo
    user: Event Horizon
    date: '2026-11-18T12:24:30.189Z'
  - type: activity
    user: Agent
    date: '2026-11-18T12:35:15.461Z'
    comment: >-
      Part 1 merged (#622, a69cc8a4). Part 2 is PR
      https://github.com/guybnd/woke-poe-trade/pull/626, reviewed and fixed, and
      handed to the coordinator to merge.
    id: a-2026-11-18t12-35-15-461z
  - type: comment
    user: Agent
    comment: >-
      Both parts merged: #622 (a69cc8a4) number edits and cluster rules by size;
      #626 (3c634d10) cluster price rules from poe.ninja on the Cluster page.
    date: '2026-11-18T12:47:25.129Z'
    completionComment: true
    id: c-2026-11-18t12-47-25-129z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-18T12:47:25.129Z'
  - type: comment
    user: Agent
    comment: >-
      Done. #622 (a69cc8a4) added number edits in rows and the side panel, and
      lists number-keyed groups numbers-first, with cluster jewels by size. #626
      (3c634d10) makes the cluster price rules follow poe.ninja, adds pins, and
      puts the "Worth money" band on the Cluster page. Untried in game.
    completionComment: true
    date: '2026-11-18T12:47:30.599Z'
    id: c-2026-11-18t12-47-30-599z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T12:47:31.226Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:30:57.081Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/626'
needsAction: null
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
version: '0003'
releasedAt: '2026-11-27T04:30:50.393Z'
releaseDocPath: release-notes/0003
---
> **TL;DR** Make loot filter tiers that differ by numbers (cluster passives + item level, flask area level + quality…) readable and editable; merge the cluster price group into the cluster page and price its passive types live from poe.ninja. Guy picked A, 1+2, M, All, P on the mockups (https://claude.ai/artifact/Q5BRTNyyaz4HX6d4LFXcJ5).

Guy found Jewels > Cluster in the tier editor very hard to read: "Show from: enchantment passive num", tier names cut off, empty "Also needs", struck-through specials.

What NeverSink's [2706] Cluster Jewels: Random tiers really key on:
- Large: 12 passives + ilvl 84 (shown) · 8 or fewer + ilvl 84 (shown) · 8 or fewer, any ilvl (shown) · everything else (hidden)
- Medium: 5 or fewer + ilvl 84 · 5 or fewer, any ilvl · rest hidden
- Small: ilvl 84 · rest hidden

The price group ([2705] clustereco, 54 tiers) runs first: passive count × ilvl band × t1/t2, each naming the enchants worth money, frozen from NeverSink's release.

## Parts
1. PR #622: `number` edit, numbers-first rows with editable boxes, headings by base, side panel "Numbers it checks", for every group whose tiers differ by two numbers.
2. Next PR: cluster price rules shown on the Cluster page (M), passive types priced from poe.ninja ClusterJewel with t1/t2 lines and pins (P).

## Acceptance criteria
- [x] Jewels › Cluster lists rules by size with passives and item level visible
- [x] Passive count and item level editable in the row and the side panel; saved filter changes
- [x] Works for other number-keyed groups (flasks, gems, levelling)
- [ ] Price rules shown on the Cluster page; separate group gone from the list
- [ ] Passive types per price rule follow poe.ninja, with lines and pins
- [ ] Adversarial review fixes, local checks, merged

## Test plan
- Unit: renderer/test/woke/filter-numbers.test.ts (numbers, edit apply on NeverSink's real cluster rules, ladder per strictness); filter-ladder.test.ts unchanged and green.
- e2e: testing/e2e/filter-numbers.spec.ts (headings, row box edit reaches the saved file, side panel).
- Part 2: unit test mapping poe.ninja ClusterJewel lines to EnchantmentPassiveNode names and rewriting clustereco tiers; e2e for pins.

Worktree: E:\Git\woke\wt\cluster-tiers (branch woke/cluster-tiers).
