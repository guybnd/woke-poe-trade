---
id: WOKEPOET-309
title: 'Character: live PoB file of your character (idea 9)'
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
    date: '2026-11-15T05:38:19.592Z'
    comment: Created ticket.
    id: a-2026-11-15t05-38-19-592z
  - type: activity
    user: Agent
    date: '2026-11-15T05:38:19.592Z'
    comment: Created as subtask of WOKEPOET-304.
    id: a-2026-11-15t05-38-19-592z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/510 (after #508),
      reviewed, sent to merge.
    date: '2026-11-15T06:55:23.365Z'
    selfAttested: true
    id: c-2026-11-15t06-55-23-365z
  - type: comment
    user: Agent
    comment: 'Live PoB file, merged in #510.'
    date: '2026-11-15T07:58:51.243Z'
    completionComment: true
    id: c-2026-11-15t07-58-51-243z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T07:58:51.243Z'
  - type: comment
    user: Agent
    comment: 'Merged in #510.'
    completionComment: true
    date: '2026-11-15T07:58:52.190Z'
    id: c-2026-11-15t07-58-52-190z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T07:58:52.699Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/510'
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
Save "Live – <char>" PoB XML into the builds folder from each read (items, tree, gems); never touches the picked build. Open in PoB / compare with the build.
