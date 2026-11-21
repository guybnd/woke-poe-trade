---
id: WOKEPOET-425
title: 'Map toast: PoE 1 redesign, click to dismiss, resizable'
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T02:08:41.473Z'
    comment: Created ticket.
    id: a-2026-11-21t02-08-41-473z
  - type: activity
    user: Agent
    date: '2026-11-21T02:11:12.428Z'
    comment: >-
      Mocks A-D with pick buttons:
      https://claude.ai/artifact/9YEfnCCJHfBTdBLS2EiPS3 (db picks/current).
      Building A (item tooltip) meanwhile. Guy added: show the close key on it
      as a key chip.
    id: a-2026-11-21t02-11-12-428z
  - type: comment
    user: Guy
    comment: Guy picked B (stone plaque); the key chip should say "Dismiss" next to it.
    date: '2026-11-21T02:19:39.317Z'
    selfAttested: true
    id: c-2026-11-21t02-19-39-317z
  - type: comment
    user: Agent
    comment: >-
      Merged #693: plaque look (Guy's B), click to dismiss, resizable
      (chipScale), key chip with Dismiss, two review passes, CI green.
    date: '2026-11-21T02:38:45.653Z'
    completionComment: true
    id: c-2026-11-21t02-38-45-653z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T02:38:45.653Z'
  - type: comment
    user: Agent
    comment: >-
      Map toast as Guy's pick B (stone plaque), click to dismiss, corner resize
      saved, waits under the pointer, close key with Dismiss; card gear row
      fixed.
    completionComment: true
    date: '2026-11-21T02:38:47.048Z'
    id: c-2026-11-21t02-38-47-048z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T02:38:47.474Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/693'
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
Guy's ask (2026-11-21): redesign the post-map screen (map toast from Session story, #686/#688) in the PoE 1 look, with several mocks. Click on it dismisses it (it takes clicks on itself only, never blocks gameplay elsewhere, still auto-hides). Resizable while up, size saved.

Plan: mocks artifact with pick buttons; build the recommended option meanwhile on woke/map-toast-redesign. Hover-rest takes the mouse on the toast only (useHoverZone activate), click closes, corner drag scales it (saved as chipScale), auto-hide pauses while the mouse is on it.

Out of scope: whether Zealot's Vault counts as a map (open elsewhere).
