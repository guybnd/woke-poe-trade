---
id: WOKEPOET-583
title: Replace Tonight wording
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - polish
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-25T01:05:16.822Z'
    comment: Created ticket.
    id: a-2026-11-25t01-05-16-822z
  - type: comment
    user: Agent
    comment: 'Merged at e6ef71f (head d4b8903, CI green); dev build reloaded.'
    completionComment: true
    date: '2026-11-25T01:05:22.052Z'
    id: c-2026-11-25t01-05-22-052z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T01:05:22.671Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/898'
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
Say "This session" instead of "Tonight", and "Play sessions" instead of "Nights" (incl. "Night of …" and the Nights tab). PR: https://github.com/guybnd/woke-poe-trade/pull/898 (e6ef71f).
