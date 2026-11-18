---
id: WOKEPOET-374
title: 'Loot filter: tiers keyed on numbers, not names (cluster jewels first)'
status: Grooming
priority: Medium
effort: L
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
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
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/622'
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

Worktree: E:\Git\woke\wt\cluster-tiers (branch woke/cluster-tiers).
