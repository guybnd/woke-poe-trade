---
id: WOKEPOET-304
title: 'Epic: use the live character across the PoB tabs'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - pob
  - epic
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:38:08.496Z'
    comment: Created ticket.
    id: a-2026-11-15t05-38-08-496z
  - type: activity
    user: Agent
    date: '2026-11-15T05:38:25.204Z'
    comment: Updated title. Updated tags.
    id: a-2026-11-15t05-38-25-204z
  - type: comment
    user: Agent
    comment: >-
      All subtasks Done (305-312, 314, 316). Left open only for #516 (cleaner
      gem marks, Guy's B + D), then Done.
    date: '2026-11-15T07:59:05.777Z'
    selfAttested: true
    id: c-2026-11-15t07-59-05-777z
  - type: comment
    user: Agent
    comment: All picked ideas merged (#499-#516).
    date: '2026-11-15T08:17:20.542Z'
    completionComment: true
    id: c-2026-11-15t08-17-20-542z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T08:17:20.542Z'
  - type: comment
    user: Agent
    comment: >-
      Epic done: gem marks, real-point leveling, upgrades, jewels, live PoB
      file, gear compare, weapon block, resists/attributes, can't-use-yet, mod
      tiers, cleaner gem marks (#499, #500, #502, #504-#506, #508, #510, #512,
      #515, #516).
    completionComment: true
    date: '2026-11-15T08:17:22.347Z'
    id: c-2026-11-15t08-17-22-347z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T08:17:22.767Z'
subtasks:
  - WOKEPOET-305
  - WOKEPOET-306
  - WOKEPOET-307
  - WOKEPOET-308
  - WOKEPOET-309
  - WOKEPOET-310
  - WOKEPOET-311
  - WOKEPOET-312
  - WOKEPOET-314
  - WOKEPOET-316
  - WOKEPOET-318
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/516'
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
Guy picked ideas 1, 2, 4, 5, 9, 13, 14, 15 from https://claude.ai/artifact/CBff6gMLPNJ637Pfbb7RiD (2026-11-15). Base: Character tab #484, hover #495, raw replies #497 (thread "Sync live character with PoB build").

Order: 5 gem levels + 13 leveling by real points (no mods needed) → 2 next upgrades → 15 jewels → 9 live PoB file → 1, 4, 14 once item mods parse (first read had none; #497 keeps the raw reply to find out why).
