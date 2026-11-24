---
id: WOKEPOET-548
title: 'Startup bundle: load the gem campaign table as its own chunk'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - perf
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-24T03:55:16.213Z'
    comment: Created ticket.
    id: a-2026-11-24t03-55-16-213z
  - type: comment
    user: Agent
    comment: Merged at 8480d59c from a cloud thread; dev build reloaded.
    completionComment: true
    date: '2026-11-24T03:55:20.721Z'
    id: c-2026-11-24t03-55-20-721z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T03:55:21.314Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/845'
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
gem-sources.json loads lazily, freeing about 100 KB of startup JS headroom. Done in a cloud thread: https://github.com/guybnd/woke-poe-trade/pull/845 (merged at 8480d59c).
