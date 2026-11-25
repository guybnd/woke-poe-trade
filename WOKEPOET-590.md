---
id: WOKEPOET-590
title: 'Shared profit row: Boss runs drops and the run kit'
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
    date: '2026-11-25T03:11:24.238Z'
    comment: Created ticket.
    id: a-2026-11-25t03-11-24-238z
  - type: comment
    user: Agent
    comment: Merged at 211d18f; dev build reloaded.
    completionComment: true
    date: '2026-11-25T03:11:29.757Z'
    id: c-2026-11-25t03-11-29-757z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T03:11:30.573Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/901'
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
Boss runs drops and the run kit use the shared profit row (follow-up to WOKEPOET-574/578). PR: https://github.com/guybnd/woke-poe-trade/pull/901 (211d18f).
