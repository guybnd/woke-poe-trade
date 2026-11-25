---
id: WOKEPOET-519
title: Make map price check filters consistent
status: Released
priority: None
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-23T15:12:46.165Z'
    comment: Created ticket.
    id: a-2026-11-23t15-12-46-165z
  - type: comment
    user: Agent
    comment: >-
      Merged from a cloud thread; dev build reloaded. Guy's pick still pending:
      https://claude.ai/artifact/EPRrPQWAtAWmXtTqKkYQaP
    completionComment: true
    date: '2026-11-23T15:13:21.132Z'
    id: c-2026-11-23t15-13-21-132z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-23T15:13:21.601Z'
  - type: comment
    user: Agent
    comment: >-
      Follow-up merged: https://github.com/guybnd/woke-poe-trade/pull/820 makes
      the Rarity chip on map price checks start on by default.
    date: '2026-11-23T16:21:48.671Z'
    selfAttested: true
    id: c-2026-11-23t16-21-48-671z
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:06:02.279Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/816'
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
Map price check: every Trade search number is a chip filter. Done in a cloud thread: https://github.com/guybnd/woke-poe-trade/pull/816

Pick pending: https://claude.ai/artifact/EPRrPQWAtAWmXtTqKkYQaP
