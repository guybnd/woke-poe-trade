---
id: WOKEPOET-560
title: Recipe parts in price check
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
    date: '2026-11-24T10:31:14.945Z'
    comment: Created ticket.
    id: a-2026-11-24t10-31-14-945z
  - type: activity
    user: Agent
    date: '2026-11-24T10:31:17.484Z'
    comment: Updated implementation link.
    id: a-2026-11-24t10-31-17-484z
  - type: comment
    user: Agent
    comment: 'Guy''s open picks: https://claude.ai/artifact/N82j4g5XbvTdrZzYKT7bBR'
    date: '2026-11-24T10:31:18.822Z'
    selfAttested: true
    id: c-2026-11-24t10-31-18-822z
  - type: comment
    user: Agent
    comment: PR 873 merged (47f5ee2). Guy's picks stay open in the mockup.
    date: '2026-11-24T10:37:53.504Z'
    completionComment: true
    id: c-2026-11-24t10-37-53-504z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T10:37:53.504Z'
  - type: comment
    user: Agent
    comment: >-
      Merged at 47f5ee2; dev build reloaded. Guy's picks remain open in the
      mockup (see earlier note).
    completionComment: true
    date: '2026-11-24T10:38:15.134Z'
    id: c-2026-11-24t10-38-15-134z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T10:38:15.714Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:53.091Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/873'
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
Price check shows a unique's vendor recipe parts with their prices (e.g. Lost Unity's five rings).

PR: https://github.com/guybnd/woke-poe-trade/pull/873 (from the cloud thread "Show recipe rings in price check").
