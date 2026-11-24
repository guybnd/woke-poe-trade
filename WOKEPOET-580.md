---
id: WOKEPOET-580
title: Ctrl+Space keeps typed searches; recents save on close
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-24T17:26:34.799Z'
    comment: Created ticket.
    id: a-2026-11-24t17-26-34-799z
  - type: comment
    user: Agent
    comment: Merged at 427efa7; dev build reloaded.
    completionComment: true
    date: '2026-11-24T17:26:39.051Z'
    id: c-2026-11-24t17-26-39-051z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T17:26:39.345Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/894'
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
Ctrl+Space search keeps what you typed, and recent searches save as the window closes. PR: https://github.com/guybnd/woke-poe-trade/pull/894 (427efa7).
