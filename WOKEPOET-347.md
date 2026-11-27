---
id: WOKEPOET-347
title: 'Gear tab: per-slot lines (F2) and Alt+F rank moves'
status: Released
priority: Medium
effort: M
assignee: unassigned
tags:
  - loot-filter
  - '3.30'
  - ux
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-17T06:00:25.815Z'
    comment: Created ticket.
    id: a-2026-11-17t06-00-25-815z
  - type: comment
    user: Agent
    comment: >-
      Branch woke/gear-slots 17c83318 is handed to the coordinator for PR and
      merge (before v1.330.10). It has per-slot lines, the Alt+F rank strip, the
      Base types tab (second, numbered sub-tabs), Quick setups menu and base
      tooltips. The review's 5 findings are fixed with tests. Lint, typecheck,
      build and 4448 tests pass.
    date: '2026-11-18T06:27:21.021Z'
    completionComment: true
    id: c-2026-11-18t06-27-21-021z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-18T06:27:21.021Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 2e165c4c: per-slot lines, Alt+F Gear rank strip, Base types tab
      (second, numbered sub-tabs), Quick setups menu, base tooltips. Review
      fixes included. F1 (ranks from prices, in the Prices tab) is still open.
    completionComment: true
    date: '2026-11-18T07:01:34.867Z'
    id: c-2026-11-18t07-01-34-867z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T07:01:35.265Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:31:00.771Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/606'
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
> **TL;DR:** Guy picked F2 from the Gear canvas (per-slot lines), and asked for the Alt+F card to show a base's Gear rank with easy up/down. Branch woke/gear-slots, on the dev build for him to try.

- F2: GearSettings.slots, plus perSlot() in applyGear, which emits a row's rules per slot group (with a Class line) before the row's own. UI: ▸ on each row opens body/armour/offhand/jewellery/weapon sub-rows (dim = following the row).
- Alt+F: GearRankStrip.vue in SampleCard. Shows the lane (R1/R2/R3/Unranked/Never) with ▲▼ and chips, plus the row's line for the item's rarity. The copy has no drop tier, so it can't show the item's own tier.
- F1 (ranks from prices) goes in the Prices tab, per Guy. Not built yet.
