---
id: WOKEPOET-419
title: 'Map chip: time and events when you leave a map'
status: Ready
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
needsAction: null
---
Guy picked B (2026-11-20), plus: store every map in Session analytics as a map history with character and level. Mocks in https://claude.ai/artifact/C69uz3mGDDWMSQ68RTKcSp section 4.
Built on branch woke/map-chip (stacked on woke/session-facts): the chip is a one-line dock peek on the Session story icon (8 s); Map history tab; Ctrl+Space "maps".
Log facts (checked): map name + area level, time in map vs hideout, deaths, level-ups, league NPC speech. Not logged: kills, XP, map boss kills, loot.
