---
id: WOKEPOET-576
title: Click price to switch chaos/divine + bigger stash price card
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-24T14:52:09.245Z'
    comment: Created ticket.
    id: a-2026-11-24t14-52-09-245z
  - type: activity
    user: Agent
    date: '2026-11-24T14:52:11.872Z'
    comment: Updated implementation link.
    id: a-2026-11-24t14-52-11-872z
  - type: comment
    user: Agent
    comment: PR 887 merged (924c3fe).
    date: '2026-11-24T15:23:57.286Z'
    completionComment: true
    id: c-2026-11-24t15-23-57-286z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T15:23:57.286Z'
  - type: comment
    user: Agent
    comment: >-
      Merged at 924c3fe; dev build reloaded. Click the poe.ninja price to switch
      chaos/divine; instant card 20% bigger.
    completionComment: true
    date: '2026-11-24T15:24:01.034Z'
    id: c-2026-11-24t15-24-01-034z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T15:24:01.638Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:51.091Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/887'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
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
Clicking a price switches between chaos and divine; the stash price card is bigger. PR: https://github.com/guybnd/woke-poe-trade/pull/887
