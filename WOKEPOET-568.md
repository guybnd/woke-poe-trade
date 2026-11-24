---
id: WOKEPOET-568
title: Scrying helper
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
    date: '2026-11-24T10:56:15.795Z'
    comment: Created ticket.
    id: a-2026-11-24t10-56-15-795z
  - type: comment
    user: Agent
    comment: >-
      Open with Guy: does a scry use up the orb, and how long does a scry last?
      The Abomination, Citadel, Fortress and Sanctuary orbs have no trade id.
    date: '2026-11-24T10:56:19.449Z'
    selfAttested: true
    pin: true
    id: c-2026-11-24t10-56-19-449z
  - type: comment
    user: Agent
    comment: >-
      Merged at 6a90e40; dev build reloaded. Open questions are in the pinned
      note.
    completionComment: true
    date: '2026-11-24T10:56:20.413Z'
    id: c-2026-11-24t10-56-20-413z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T10:56:21.342Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/871'
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
Shows which map to scry, by the cards a Scrying Orb adds per map. PR https://github.com/guybnd/woke-poe-trade/pull/871 (6a90e40).
