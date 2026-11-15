---
id: WOKEPOET-314
title: 'Character: PoB and character item tooltips as rich as the price search''s'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - pob
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-304
history:
  - type: activity
    user: Agent
    date: '2026-11-15T06:18:21.442Z'
    comment: Created ticket.
    id: a-2026-11-15t06-18-21-442z
  - type: activity
    user: Agent
    date: '2026-11-15T06:18:21.442Z'
    comment: Created as subtask of WOKEPOET-304.
    id: a-2026-11-15t06-18-21-442z
  - type: comment
    user: Agent
    comment: >-
      Guy: "like aspd total dmg etc" — weapon block with APS, phys/ele damage,
      total DPS, crit, as the price search listing tooltip shows.
    date: '2026-11-15T06:22:04.198Z'
    selfAttested: true
    id: c-2026-11-15t06-22-04-198z
  - type: comment
    user: Agent
    comment: >-
      Weapon block: PR https://github.com/guybnd/woke-poe-trade/pull/506 (after
      #505), reviewed, sent to merge. Tiers split to WOKEPOET-316.
    date: '2026-11-15T06:31:14.023Z'
    selfAttested: true
    id: c-2026-11-15t06-31-14-023z
  - type: comment
    user: Agent
    comment: 'Weapon block, merged in #506; tiers in #512.'
    date: '2026-11-15T07:58:59.191Z'
    completionComment: true
    id: c-2026-11-15t07-58-59-191z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T07:58:59.191Z'
  - type: comment
    user: Agent
    comment: 'Merged in #506 (tiers: #512).'
    completionComment: true
    date: '2026-11-15T07:59:00.257Z'
    id: c-2026-11-15t07-59-00-257z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T07:59:00.561Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/506'
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
Guy 2026-11-15: the item tooltip on PoB/character items shows only names + mod text, unlike the price search listing tooltip (layout J, #230/#283). Add: weapon DPS/APS/crit from base + local mods, mod tiers + roll % from mod data, crafted/fractured colours (modKinds now carried from 3.30 replies). Do with idea 1 (WOKEPOET-310, Gear compare on icon hover).
