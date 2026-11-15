---
id: WOKEPOET-305
title: 'Character: gem levels and quality against the build (idea 5)'
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
    date: '2026-11-15T05:38:12.837Z'
    comment: Created ticket.
    id: a-2026-11-15t05-38-12-837z
  - type: activity
    user: Agent
    date: '2026-11-15T05:38:12.837Z'
    comment: Created as subtask of WOKEPOET-304.
    id: a-2026-11-15t05-38-12-837z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/499 (with 306), reviewed,
      sent to merge.
    date: '2026-11-15T05:49:32.881Z'
    selfAttested: true
    id: c-2026-11-15t05-49-32-881z
  - type: comment
    user: Agent
    comment: >-
      Shipped in #499 (236be02f): gem levels and quality compared against the
      build.
    date: '2026-11-15T06:15:01.841Z'
    completionComment: true
    id: c-2026-11-15t06-15-01-841z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T06:15:01.841Z'
  - type: comment
    user: Agent
    comment: 'Merged #499 (236be02f).'
    completionComment: true
    date: '2026-11-15T06:15:08.491Z'
    id: c-2026-11-15t06-15-08-491z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T06:15:08.917Z'
  - type: comment
    user: Agent
    comment: 'Gem marks against your character, merged in #499 (reworked by #516).'
    date: '2026-11-15T07:58:39.374Z'
    completionComment: true
    id: c-2026-11-15t07-58-39-374z
  - type: status_change
    from: Done
    to: Ready
    user: Agent
    date: '2026-11-15T07:58:39.374Z'
  - type: comment
    user: Agent
    comment: 'Merged in #499; cleaner B + D marks in #516.'
    completionComment: true
    date: '2026-11-15T07:58:40.269Z'
    id: c-2026-11-15t07-58-40-269z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T07:58:40.514Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/499'
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
Leveling/Gear gem lists tick off gems you socket, flag under-levelled or missing quality (Precision 14 → 20), dashed for missing. Data: snapshot gems (level, quality) from character-sync.
