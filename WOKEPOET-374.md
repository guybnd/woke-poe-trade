---
id: WOKEPOET-374
title: 'Loot filter: tiers keyed on numbers, not names (cluster jewels first)'
status: Grooming
priority: Medium
effort: None
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
---
Guy found Jewels > Cluster in the tier editor very hard to read: "Show from: enchantment passive num", tier names cut off, empty "Also needs", struck-through specials.

What NeverSink's [2706] Cluster Jewels: Random tiers really key on:
- Large: 12 passives + ilvl 84 (shown) · 8 or fewer + ilvl 84 (shown) · 8 or fewer, any ilvl (shown) · everything else (hidden)
- Medium: 5 or fewer + ilvl 84 · 5 or fewer, any ilvl · rest hidden
- Small: ilvl 84 · rest hidden

The ladder picks one number (passive count) as the order across three bases, so Small tiers fall to specials and ilvl 84 is invisible. No edit kind exists to change a numeric condition (ilvl, passive count).

Plan: mockups first (artifact with picks), then: split a group by base when tiers differ by BaseType, show every number condition per tier in words, add a condition edit (ilvl / passive count / quality / area level). Generalizes to clustereco, endgame flasks (AreaLevel + Quality), gems, leveling weapons.

Worktree: E:\Git\woke\wt\cluster-tiers (branch woke/cluster-tiers).
