---
id: WOKEPOET-192
title: 'M. Boss runs: Atziri moves to the Temple'
status: Done
priority: Low
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-11T04:22:47.365Z'
    comment: Created ticket.
    id: a-2026-11-11t04-22-47-365z
  - type: activity
    user: Agent
    date: '2026-11-11T04:22:47.365Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-11t04-22-47-365z
  - type: activity
    user: Agent
    date: '2026-11-18T06:33:56.392Z'
    comment: >-
      Built on woke/atziri-temple (97cc626f, pushed): Temple entry rows from
      poe.ninja (Apex of Atzoatl / Cradle of Creation T3), Mortal fragments
      removed, Royal Visage + Cradle Soul Cores, Vaal Orb recipe 5 gems.
      Adversarial review fixes in; local checks pass. Handed to coordinator for
      merge.
    id: a-2026-11-18t06-33-56-392z
  - type: comment
    user: Agent
    comment: >-
      Merged as #607 (7ff0c495): Atziri and Uber Atziri in the Temple of
      Atzoatl, temple entry rows from poe.ninja, Mortal fragments removed, Royal
      Visage and Cradle Soul Cores added, Vaal Orb recipe 5 gems.
    date: '2026-11-18T06:46:09.386Z'
    completionComment: true
    id: c-2026-11-18t06-46-09-386z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T06:46:09.386Z'
  - type: comment
    user: Agent
    comment: 'Merged #607: boss runs follow Atziri to the Temple of Atzoatl for 3.30.'
    completionComment: true
    date: '2026-11-18T06:46:12.307Z'
    id: c-2026-11-18t06-46-12-307z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T06:46:12.759Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/607'
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
> TL;DR: the Uber Atziri entry in boss runs assumes the old Alluring Abyss and fragments. Both are gone in 3.30.

From the patch notes:
- Atziri now lives in the Temple of Atzoatl; Uber Atziri is in temples with the Cradle of Creation, area level 84.
- Sacrifice and Mortal fragments are removed, and the Alluring Abyss is off the Atlas.
- Atziri drops Soul Cores, and Royal Visage in level 81+ temples.
- Some drop sources moved: Ambition from the Trialmaster; Sacrificial Heart and the Tempered jewels from Glittering Halls chests.
- The 3.29 poe.how drop-rate samples in `boss-runs/bosses.ts` (uber-atziri) and the entry costs need a rethink once 3.30 runs exist.
