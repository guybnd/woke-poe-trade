---
id: WOKEPOET-419
title: 'Map chip: time and events when you leave a map'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T14:24:43.927Z'
    comment: Created ticket.
    id: a-2026-11-20t14-24-43-927z
  - type: activity
    user: Agent
    date: '2026-11-20T15:28:59.977Z'
    comment: Updated description.
    id: a-2026-11-20t15-28-59-977z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-20T15:29:00.607Z'
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/686: map chip (dock
      peek), Map history tab, Ctrl+Space maps, per-map m:s. Review fixes in,
      checks green, sent to merge. Open: MapWorldsMemoryVault2 (Zealot's Vault,
      level 84) counts as a map; asked Guy.
    date: '2026-11-20T15:55:50.351Z'
    completionComment: true
    id: c-2026-11-20t15-55-50-351z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-20T15:55:50.351Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as a8be6e1b: map chip (dock or mid-screen toast setting), Map
      history tab in day files, Ctrl+Space maps, per-map m:s. Open with Guy:
      Zealot's Vault counts as a map.
    completionComment: true
    date: '2026-11-20T16:16:52.693Z'
    id: c-2026-11-20t16-16-52-693z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T16:16:53.459Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/686'
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
Guy picked B (2026-11-20), plus: store every map in Session analytics as a map history with character and level. Mocks in https://claude.ai/artifact/C69uz3mGDDWMSQ68RTKcSp section 4.
Built on branch woke/map-chip (stacked on woke/session-facts): the chip is a one-line dock peek on the Session story icon (8 s); Map history tab; Ctrl+Space "maps".
Log facts (checked): map name + area level, time in map vs hideout, deaths, level-ups, league NPC speech. Not logged: kills, XP, map boss kills, loot.
