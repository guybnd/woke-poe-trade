---
id: WOKEPOET-723
title: 'Loot filter: setting changes take seconds to apply'
status: Done
priority: High
effort: S
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-28T10:11:48.050Z'
    comment: Created ticket.
    id: a-2026-11-28t10-11-48-050z
  - type: activity
    user: Agent
    date: '2026-11-28T10:12:41.349Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/1095 opened; adversarial
      review clean; waiting for CI.
    id: a-2026-11-28t10-12-41-349z
  - type: comment
    user: Agent
    comment: >-
      PR 1095 merged (8289be39); review clean, CI green. Setting change 2.3–4.1
      s -> 0.55–0.7 s.
    date: '2026-11-28T10:29:55.206Z'
    completionComment: true
    id: c-2026-11-28t10-29-55-206z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-28T10:29:55.206Z'
  - type: comment
    user: Agent
    comment: >-
      Merged PR 1095: loot filter setting change 2.3–4.1 s -> 0.55–0.7 s on the
      live overlay.
    completionComment: true
    date: '2026-11-28T10:29:56.199Z'
    id: c-2026-11-28t10-29-56-199z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T10:29:57.068Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1095'
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
> **TL;DR:** Every loot filter setting change rebuilt the whole filter in 2.3–4.1 s on the live overlay. Fixed hot spots in the rebuild (price lookups, gem band rescue, levelling floors, edits' block search); now 0.55–0.7 s.

Branch `woke/loot-filter-speed`. Profiled over CDP on the dev overlay (toggle 6 sockets preset on/off).
