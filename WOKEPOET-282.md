---
id: WOKEPOET-282
title: 'Loot filter: pick levelling weapon types as chips'
status: Ready
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
    id: a-2026-11-14t04-57-50-280z
  - type: activity
    user: Agent
    date: '2026-11-14T05:12:40.811Z'
    comment: Updated implementation link.
    id: a-2026-11-14t05-12-40-811z
  - type: comment
    user: Agent
    comment: >-
      Guy picked B (build-type buttons + one-/two-handed chips). PR #443 on
      branch woke/levelling-weapon-chips (clone E:\Git\woke-weapon-chips). Lint,
      build, vitest 3714, guard suite, e2e pass; bundle within budget;
      adversarial review fixes in. Waiting on the cloud merge thread.
    date: '2026-11-14T05:12:40.881Z'
    completionComment: true
    id: c-2026-11-14t05-12-40-881z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-14T05:12:40.881Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/443'
needsAction: null
reviewState: approved
---
Presets tab, "While levelling, only weapons for [build type]" shows kept classes as plain text. Guy wants to toggle each weapon class; the build type dropdown fills the selection as a starting point, editing a chip turns it Custom.

Plan: `presets.weapons` gains `classes?: string[]` (custom list) with archetype `custom`; Auto follows PoB until a chip is changed. Migration keeps old configs. `archetypeClasses` returns the custom list. Filter guard suite (docs/loot-filter-guard.md) must pass.

Mocks A/B/C: https://claude.ai/artifact/9pv4LGsRDc9qzjPniTRqw2 (pick in db picks/current). Recommended A.
