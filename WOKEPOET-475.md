---
id: WOKEPOET-475
title: 'Vaults tab: a button per vault, rewards as icon rows'
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
    date: '2026-11-22T08:31:08.168Z'
    comment: Created ticket.
    id: a-2026-11-22t08-31-08-168z
  - type: comment
    user: Agent
    comment: >-
      PR 757 reviewed (tooltip fixes applied), CI green after a flaky rerun,
      merged as a6ebd29e.
    date: '2026-11-22T08:46:09.750Z'
    completionComment: true
    id: c-2026-11-22t08-46-09-750z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T08:46:09.750Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as a6ebd29e, dev build reloaded: Vaults tab is a button per vault
      plus the chosen vault's icon rows (look A; Guy hasn't picked yet).
    completionComment: true
    date: '2026-11-22T08:46:11.251Z'
    id: c-2026-11-22t08-46-11-251z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T08:46:12.084Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/757'
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
Guy: the Vaults view in the Nightmare "Worth running" panel looked bad. Mockups: https://claude.ai/artifact/5Gd3UQQiJK59BtWXarH26E (building A). PR: https://github.com/guybnd/woke-poe-trade/pull/757
