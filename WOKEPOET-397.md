---
id: WOKEPOET-397
title: Map mods page redesign
status: Released
priority: Medium
effort: L
assignee: unassigned
tags:
  - map-mods
  - ui
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-19T01:57:19.659Z'
    comment: Created ticket.
    id: a-2026-11-19t01-57-19-659z
  - type: activity
    user: Agent
    date: '2026-11-19T02:19:00.338Z'
    comment: >-
      Guy picked A (2026-11-19). Built on branch woke/map-mods-redesign; review
      then merge.
    id: a-2026-11-19t02-19-00-338z
  - type: activity
    user: Agent
    date: '2026-11-19T02:24:25.066Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/647 up, review fixes in,
      sent to the cloud merge thread.
    id: a-2026-11-19t02-24-25-066z
  - type: comment
    user: Agent
    comment: >-
      Layout A merged as #647 (e0bd316b). It includes the Rewards table, the
      rewards block on the map check card and named saves. The dev build is
      reloaded on master.
    date: '2026-11-19T02:30:18.831Z'
    completionComment: true
    id: c-2026-11-19t02-30-18-831z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-19T02:30:18.831Z'
  - type: comment
    user: Agent
    comment: >-
      Map mods redesign A is live in master (e0bd316b) and on the dev build. It
      has two panes with a Rewards table (minimums and juice weights), rewards
      met or missed on the map check card with an Edit rewards link, and a name
      prompt or rename when saving to the Regex library.
    completionComment: true
    date: '2026-11-19T02:30:23.294Z'
    id: c-2026-11-19t02-30-23-294z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-19T02:30:23.759Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:52.183Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/647'
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
version: '00002'
releasedAt: '2026-11-25T11:52:41.308Z'
releaseDocPath: release-notes/00002
---
Guy (2026-11-19): couldn't find where to set wanted currency/rewards; asked for a holistic redesign of the Map mods page, "god tier UI UX". Also: let him name searches saved to the Regex library.

Mocks (A/B/C, A recommended): https://claude.ai/artifact/GZjsvnLu7tWJSVakw1vHK2 — awaiting Guy's pick in the project thread.

Scope in every option:
- One Rewards table: per stat minimum % + juice weight (today split between the folded Minimums footer and Settings › Juice weights).
- One-click rating buttons per mod row instead of the four-way switch.
- Stash search block with length meter; "Highlight good/bad" renamed to what the search finds.
- Save to Regex library asks for a name (prefilled "Maps: build").
- Map check card: "Your rewards" block, minimums met/missed on this map, Edit rewards opens the Rewards table.
