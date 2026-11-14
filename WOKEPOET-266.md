---
id: WOKEPOET-266
title: Loot filter presets and groups for NeverSink 8.21
status: Ready
priority: High
effort: S
assignee: unassigned
tags:
  - bug
  - feature
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-13T23:45:39.800Z'
    comment: Created ticket.
    id: a-2026-11-13t23-45-39-800z
  - type: activity
    user: Agent
    date: '2026-11-13T23:45:39.800Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-13t23-45-39-800z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/426 (branch
      woke/filter-presets-821): Scarabs group dropped, Allflames/map
      enchantments price-tiered and netted, rule list categories renamed,
      quiet/beams presets rank Tiered Gear by NeverSink's !exotics_tN marker
      (they stripped the best t5r1 drops before), fixtures now 8.21.0a.
      Adversarial review done and fixed; vitest 3260/3260, lint, vue-tsc, build
      pass. Waiting on merge via the cloud merge thread. New-preset mocks for
      Guy: https://claude.ai/artifact/2Usr8eqAQNLbvRHhW2495j (item tiers,
      Allflames, Viscera/warrants).
    date: '2026-11-14T00:02:19.160Z'
    completionComment: true
    id: c-2026-11-14t00-02-19-160z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-14T00:02:19.160Z'
needsAction: null
---
> **TL;DR** NeverSink 8.21 dropped Scarabs and Vials and added Allflames/Map Enchantments, Viscera, Tiered Gear (UnidentifiedItemTier) and special map mods. Fix what our editor aims at the old sections; mock presets for the new ones before building.

## Audit (8.20.2 vs 8.21.0a, every $type/$tier tag)
- Gone: fragments->scarabs, vials, exoticbaseslower, rare->exotic->talisman, rare->exotic->breachrings, crafting->expensive, maps->corruptedspecial, uniques|foulborn.
- New: mapenchantments (t1-t5, price tiered), viscera (t1-t5), gear->tiered (UnidentifiedItemTier matrix), maps->specialmods, fated decorators.
- All 19 presets' anchor rules still exist at Regular, Very Strict and Uber Strict.

## Fix (this PR)
- economy.ts: drop Scarabs price group and Vials net group; add Allflames and map enchantments group (Allflames move out of the fragments net).
- nav.ts: "Scarabs and fragments" category renamed, viscera and map enchantments placed; names.ts labels for new tags.

## Later (mocks first)
- Tiered drops preset (the old TODO: keyword is UnidentifiedItemTier).
- Viscera price tiering once poe.ninja lists them (no Viscera type on 14 Nov).
