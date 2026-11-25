---
id: WOKEPOET-410
title: 'Map price check holistic A: Run it? / Worth running / Trade search'
status: Released
priority: Medium
effort: M
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-20T04:35:56.033Z'
    comment: Created ticket.
    id: a-2026-11-20t04-35-56-033z
  - type: activity
    user: Agent
    date: '2026-11-20T04:36:01.358Z'
    comment: Updated implementation link.
    id: a-2026-11-20t04-36-01-358z
  - type: comment
    user: Agent
    comment: >-
      Squash-merged as 11251708: holistic map price check A (Run it? / Worth
      running / Trade search with add-a-mod), review fixes included.
    completionComment: true
    date: '2026-11-20T04:40:08.030Z'
    id: c-2026-11-20t04-40-08-030z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T04:40:08.616Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:48.165Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/671'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
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
version: '00002'
releasedAt: '2026-11-25T11:52:41.308Z'
releaseDocPath: release-notes/00002
---
Guy's pick A (https://claude.ai/artifact/THoHsoZL5jFaY4FAHWXH7V) + add-a-mod in Trade search, normal rows only for special mods. PR https://github.com/guybnd/woke-poe-trade/pull/671.
