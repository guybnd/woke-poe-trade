---
id: WOKEPOET-620
title: Settlers tattoos in Flips and League mechanics
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
    date: '2026-11-25T16:27:27.327Z'
    comment: Created ticket.
    id: a-2026-11-25t16-27-27-327z
  - type: comment
    user: Agent
    comment: Merged at d7d6c74 (head verified 8df4cb0); dev build reloaded.
    completionComment: true
    date: '2026-11-25T16:27:31.057Z'
    id: c-2026-11-25t16-27-31-057z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T16:27:31.596Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:30:53.840Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/944'
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
version: '0003'
releasedAt: '2026-11-27T04:30:50.393Z'
releaseDocPath: release-notes/0003
---
Flips: Tattoos tab by tribe (which group is worth most on average, what's worth a 3:1). League mechanics: Settlers tab. PR: https://github.com/guybnd/woke-poe-trade/pull/944 (d7d6c74).
