---
id: WOKEPOET-354
title: Generalize one-off features
status: Released
priority: Medium
effort: XL
assignee: unassigned
tags:
  - epic
  - cleanup
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:43:51.301Z'
    comment: Created ticket.
    id: a-2026-11-17t09-43-51-301z
  - type: comment
    user: Agent
    comment: >-
      All ten subtasks (355-364) are Done; last PR #595 merged and shipped in
      v1.330.9.
    date: '2026-11-18T05:57:22.266Z'
    completionComment: true
    id: c-2026-11-18t05-57-22-266z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-18T05:57:22.266Z'
  - type: comment
    user: Agent
    comment: >-
      Epic complete: all ten shared-version subtasks merged; last one #595,
      shipped in v1.330.9.
    completionComment: true
    date: '2026-11-18T05:57:28.187Z'
    id: c-2026-11-18t05-57-28-187z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T05:57:28.683Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:31:02.702Z'
subtasks:
  - WOKEPOET-355
  - WOKEPOET-356
  - WOKEPOET-357
  - WOKEPOET-358
  - WOKEPOET-359
  - WOKEPOET-360
  - WOKEPOET-361
  - WOKEPOET-362
  - WOKEPOET-363
  - WOKEPOET-364
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/595'
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
version: '0003'
releasedAt: '2026-11-27T04:30:50.393Z'
releaseDocPath: release-notes/0003
---
> **TL;DR:** Nine places where the same behaviour was written by hand in several windows get one shared version each, so a fix in one list applies to all. Guy said "Let's do all" on the audit page.

Audit: https://claude.ai/artifact/UBqnS7gJEuirEwK38q8VGU

One PR per subtask (base uniques rides with item rows). Each PR starts with a test that pins today's behaviour, then the refactor. No product changes beyond what each subtask lists; design questions get reported, not decided.
