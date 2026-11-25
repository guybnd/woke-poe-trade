---
id: WOKEPOET-386
title: 'F4: make stash-optin.test.ts independent of timing'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - testing
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-380
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:56.295Z'
    comment: Created ticket.
    id: a-2026-11-18t15-25-56-295z
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:56.295Z'
    comment: Created as subtask of WOKEPOET-380.
    id: a-2026-11-18t15-25-56-295z
  - type: comment
    user: Agent
    comment: >-
      PR #636 merged (f79e5c6f): Net worth chunk warmed in beforeAll, the heavy
      test gets 60 s.
    date: '2026-11-18T15:57:47.638Z'
    completionComment: true
    id: c-2026-11-18t15-57-47-638z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T15:57:47.639Z'
  - type: comment
    user: Agent
    comment: 'Merged as f79e5c6f: stash-optin no longer times out under load.'
    completionComment: true
    date: '2026-11-18T15:57:55.872Z'
    id: c-2026-11-18t15-57-55-872z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T15:57:56.172Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:55.652Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/636'
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
renderer/test/woke/stash-optin.test.ts: 3 failures in a local run 2026-11-19 under load (20 s timeout on "unlocking shows the row", then follow-on failures). Remove the real-time dependency.
