---
id: WOKEPOET-553
title: Discord release announcements
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - tooling
createdBy: Agent
updatedBy: Guy
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
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:55.633Z'
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
version: 1.30.20
releasedAt: '2026-11-25T04:05:49.382Z'
releaseDocPath: release-notes/1.30.20
---
CI-only change: releases are announced on Discord. https://github.com/guybnd/woke-poe-trade/pull/855
