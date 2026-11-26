---
id: WOKEPOET-624
title: 'Deep audit: Cleanup dead code'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - refactor
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-621
history:
  - type: activity
    user: Agent
    date: '2026-11-26T01:37:51.563Z'
    comment: Created ticket.
    id: a-2026-11-26t01-37-51-563z
  - type: activity
    user: Agent
    date: '2026-11-26T01:37:51.563Z'
    comment: Created as subtask of WOKEPOET-621.
    id: a-2026-11-26t01-37-51-563z
  - type: activity
    user: Agent
    date: '2026-11-26T01:37:58.327Z'
    comment: Updated implementation link.
    id: a-2026-11-26t01-37-58-327z
  - type: activity
    user: Agent
    date: '2026-11-26T02:03:42.909Z'
    comment: Updated implementation link.
    id: a-2026-11-26t02-03-42-909z
  - type: comment
    user: Agent
    comment: >-
      PR 946 merged (6b4a541,
      https://github.com/guybnd/woke-poe-trade/pull/946). PR 951
      (https://github.com/guybnd/woke-poe-trade/pull/951) deletes Farming,
      Investments and Wealthy Exile; in CI. Close this when 951 merges.
    date: '2026-11-26T02:03:44.203Z'
    selfAttested: true
    id: c-2026-11-26t02-03-44-203z
  - type: comment
    user: Agent
    comment: PRs 946 and 951 merged (951 at fcc5f11).
    date: '2026-11-26T02:11:09.757Z'
    completionComment: true
    id: c-2026-11-26t02-11-09-757z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-26T02:11:09.758Z'
  - type: comment
    user: Agent
    comment: Done across PRs 946 and 951 (final fcc5f11); dev build reloaded.
    completionComment: true
    date: '2026-11-26T02:11:14.705Z'
    id: c-2026-11-26t02-11-14-705z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T02:11:15.095Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/951'
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
---
Clean up dead code. PR: https://github.com/guybnd/woke-poe-trade/pull/946. Guy chose to delete Farming, Investments and Wealthy Exile.
