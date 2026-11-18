---
id: WOKEPOET-371
title: >-
  Base types: save refused with empty Class line when a row is fully split into
  slots
status: Done
priority: High
effort: None
assignee: unassigned
tags:
  - loot-filter
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T07:54:40.813Z'
    comment: Created ticket.
    id: a-2026-11-18t07-54-40-813z
  - type: comment
    user: Agent
    comment: >-
      Merged as 38cbfa25: no empty Class line when every slot of a row has its
      own line.
    completionComment: true
    date: '2026-11-18T08:20:34.129Z'
    id: c-2026-11-18t08-20-34-129z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T08:20:34.497Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/614'
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
> **TL;DR:** Saving failed ("R1-t5: Class has no values") when all five slots of a row had their own line: the row's leftover rule got `Class ==` with no values. Fix in PR #614 (branch woke/gear-empty-class); blocks v1.330.10.

withClasses() now returns null for an empty class list. The test uses Guy's exact settings.
