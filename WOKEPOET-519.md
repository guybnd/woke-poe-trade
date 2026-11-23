---
id: WOKEPOET-519
title: Make map price check filters consistent
status: Done
priority: None
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
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
---
Map price check: every Trade search number is a chip filter. Done in a cloud thread: https://github.com/guybnd/woke-poe-trade/pull/816

Pick pending: https://claude.ai/artifact/EPRrPQWAtAWmXtTqKkYQaP
