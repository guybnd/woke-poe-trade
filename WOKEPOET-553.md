---
id: WOKEPOET-553
title: Discord release announcements
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - tooling
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-24T05:37:25.066Z'
    comment: Created ticket.
    id: a-2026-11-24t05-37-25-066z
  - type: comment
    user: Agent
    comment: 'Merged from a cloud thread; CI-only, so no dev reload was needed.'
    completionComment: true
    date: '2026-11-24T05:37:30.880Z'
    id: c-2026-11-24t05-37-30-880z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T05:37:31.498Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/855'
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
CI-only change: releases are announced on Discord. https://github.com/guybnd/woke-poe-trade/pull/855
