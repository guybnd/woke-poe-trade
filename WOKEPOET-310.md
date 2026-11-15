---
id: WOKEPOET-310
title: 'Character: Gear tab shows your item beside the build''s (idea 1)'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - pob
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-304
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:38:21.256Z'
    comment: Created ticket.
    id: a-2026-11-15t05-38-21-256z
  - type: activity
    user: Agent
    date: '2026-11-15T05:38:21.256Z'
    comment: Created as subtask of WOKEPOET-304.
    id: a-2026-11-15t05-38-21-256z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/505 (after #502, #504),
      reviewed, sent to merge.
    date: '2026-11-15T06:25:11.587Z'
    selfAttested: true
    id: c-2026-11-15t06-25-11-587z
  - type: comment
    user: Agent
    comment: 'Gear compare in tooltip, merged in #505.'
    date: '2026-11-15T07:58:53.245Z'
    completionComment: true
    id: c-2026-11-15t07-58-53-245z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T07:58:53.245Z'
  - type: comment
    user: Agent
    comment: 'Merged in #505; old-read mods fix #515.'
    completionComment: true
    date: '2026-11-15T07:58:54.300Z'
    id: c-2026-11-15t07-58-54-300z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T07:58:54.628Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/505'
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
Each Gear tab slot shows the worn item under the build's, swap compare on hover. Blocked: first read had no item mods (raw reply kept by #497 to find out why).
