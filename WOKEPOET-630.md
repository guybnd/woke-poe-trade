---
id: WOKEPOET-630
title: 'UX consistency: corpse quick price check'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-622
history:
  - type: activity
    user: Agent
    date: '2026-11-26T02:01:56.787Z'
    comment: Created ticket.
    id: a-2026-11-26t02-01-56-787z
  - type: activity
    user: Agent
    date: '2026-11-26T02:01:56.787Z'
    comment: Created as subtask of WOKEPOET-622.
    id: a-2026-11-26t02-01-56-787z
  - type: comment
    user: Agent
    comment: 'PR 952 merged (6097747, data v35).'
    date: '2026-11-26T02:53:51.391Z'
    completionComment: true
    id: c-2026-11-26t02-53-51-391z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-26T02:53:51.391Z'
  - type: comment
    user: Agent
    comment: Merged at 6097747 (data v35); dev build reloaded.
    completionComment: true
    date: '2026-11-26T02:53:58.438Z'
    id: c-2026-11-26t02-53-58-438z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T02:53:59.942Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/952'
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
Quick price check for corpses. Building.
