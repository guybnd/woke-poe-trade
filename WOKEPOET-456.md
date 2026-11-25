---
id: WOKEPOET-456
title: Retire League investments and Farming
status: Released
priority: Medium
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T12:03:34.607Z'
    comment: Created ticket.
    id: a-2026-11-21t12-03-34-607z
  - type: activity
    user: Agent
    date: '2026-11-21T12:06:02.389Z'
    comment: >-
      Audit card for Guy's picks:
      https://claude.ai/artifact/GcCaMCbbGftoqCeMA5CbGD (picks saved in its db
      collection "picks"). PR 735 in review.
    id: a-2026-11-21t12-06-02-389z
  - type: activity
    user: Agent
    date: '2026-11-21T12:18:56.697Z'
    comment: Updated title.
    id: a-2026-11-21t12-18-56-697z
  - type: comment
    user: Agent
    comment: PR 735 merged (5150531a) after two adversarial reviews and green CI.
    date: '2026-11-21T12:19:14.052Z'
    completionComment: true
    id: c-2026-11-21t12-19-14-052z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T12:19:14.052Z'
  - type: comment
    user: Agent
    comment: >-
      Both moved to RETIRED_MODULES (modules.ts): off the launcher, dock,
      Ctrl+Space, Settings, presets and hotkeys; code and saved data kept. Net
      worth's session view now follows Session story's live night. Session
      analytics' Strategies tab and Atlas earnings keep only past Farming data.
      Follow-up audit: WOKEPOET-457.
    completionComment: true
    date: '2026-11-21T12:19:20.788Z'
    id: c-2026-11-21t12-19-20-788z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T12:19:21.249Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:57.692Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/735'
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
version: '0001'
releasedAt: '2026-11-25T11:50:45.359Z'
releaseDocPath: release-notes/0001
---
Guy wants League investments and Farming hidden for now (low quality), with code and saved data kept. Then a keep / improve / retire audit of every other tool in the grid, decided by Guy.

PR: https://github.com/guybnd/woke-poe-trade/pull/735
