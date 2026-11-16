---
id: WOKEPOET-341
title: Twice-corrupted items open price check on Uncorrupted
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-16T13:41:02.499Z'
    comment: Created ticket.
    id: a-2026-11-16t13-41-02-499z
  - type: comment
    user: Agent
    comment: >-
      Merged as 45821ea2: "Twice Corrupted" line read, corruption implicit
      implies corrupted, such items open on Corrupted. Dev overlay reloaded on
      master.
    completionComment: true
    date: '2026-11-16T13:41:11.809Z'
    id: c-2026-11-16t13-41-11-809z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-16T13:41:12.251Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/558'
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
Guy's String of Servitude (twice corrupted, corruption implicits) opened the Corrupted chip on "Not". Item text ends in "Twice Corrupted", parser only knew "Corrupted". Fixed in PR #558.
