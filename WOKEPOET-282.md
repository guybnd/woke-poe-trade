---
id: WOKEPOET-282
title: 'Loot filter: pick levelling weapon types as chips'
status: Grooming
priority: Medium
effort: S
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T04:57:50.280Z'
    comment: Created ticket.
---
Presets tab, "While levelling, only weapons for [build type]" shows kept classes as plain text. Guy wants to toggle each weapon class; the build type dropdown fills the selection as a starting point, editing a chip turns it Custom.

Plan: `presets.weapons` gains `classes?: string[]` (custom list) with archetype `custom`; Auto follows PoB until a chip is changed. Migration keeps old configs. `archetypeClasses` returns the custom list. Filter guard suite (docs/loot-filter-guard.md) must pass.

Mocks A/B/C: https://claude.ai/artifact/9pv4LGsRDc9qzjPniTRqw2 (pick in db picks/current). Recommended A.
