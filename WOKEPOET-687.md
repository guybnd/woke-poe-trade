---
id: WOKEPOET-687
title: >-
  Calmer filter controls (replace Off/Weighted/Always buttons and the Strictness
  dropdown)
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - polish
  - loot-filter
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-649
history:
  - type: activity
    user: Agent
    date: '2026-11-28T01:28:49.083Z'
    comment: Created ticket.
    id: a-2026-11-28t01-28-49-083z
  - type: activity
    user: Agent
    date: '2026-11-28T01:28:49.083Z'
    comment: Created as subtask of WOKEPOET-649.
    id: a-2026-11-28t01-28-49-083z
  - type: comment
    user: Agent
    comment: 'Design picks open: https://claude.ai/artifact/UhPjwYbbx3W5AbNGcqywsU'
    date: '2026-11-28T01:28:53.626Z'
    selfAttested: true
    pin: true
    id: c-2026-11-28t01-28-53-626z
  - type: status_change
    from: Todo
    to: In Progress
    user: Agent
    date: '2026-11-28T01:48:34.591Z'
  - type: activity
    user: Agent
    date: '2026-11-28T01:48:35.389Z'
    comment: Updated implementation link.
    id: a-2026-11-28t01-48-35-389z
  - type: comment
    user: Agent
    comment: PR 1038 merged (8fded98).
    date: '2026-11-28T02:02:36.791Z'
    completionComment: true
    id: c-2026-11-28t02-02-36-791z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-28T02:02:36.791Z'
  - type: comment
    user: Agent
    comment: Merged at 8fded98; dev build reloaded.
    completionComment: true
    date: '2026-11-28T02:02:41.542Z'
    id: c-2026-11-28t02-02-41-542z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T02:02:42.435Z'
  - type: comment
    user: Agent
    comment: >-
      Follow-up PR 1042 done
      (https://github.com/guybnd/woke-poe-trade/pull/1042, a83d81a): per-item
      editor as one line of chips.
    date: '2026-11-28T02:20:42.647Z'
    selfAttested: true
    id: c-2026-11-28t02-20-42-647z
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1038'
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
Replace the Off/Weighted/Always buttons and the Strictness dropdown in the loot filter with calmer controls.
