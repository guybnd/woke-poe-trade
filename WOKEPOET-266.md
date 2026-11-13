---
id: WOKEPOET-266
title: Loot filter presets and groups for NeverSink 8.21
status: Grooming
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
    comment: Created as subtask of WOKEPOET-149.
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
