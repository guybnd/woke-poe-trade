---
id: WOKEPOET-377
title: 'Net worth: Share as a percent of net worth'
status: Done
priority: None
effort: XS
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T12:00:55.629Z'
    comment: Created ticket.
    id: a-2026-11-18t12-00-55-629z
  - type: activity
    user: Agent
    date: '2026-11-18T12:00:59.440Z'
    comment: Updated implementation link.
    id: a-2026-11-18t12-00-59-440z
  - type: comment
    user: Agent
    comment: 'Share = % of net worth with text, PR #623, merged as 7047b998.'
    date: '2026-11-18T12:16:36.847Z'
    completionComment: true
    id: c-2026-11-18t12-16-36-847z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T12:16:36.847Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 7047b998: Net worth Share is each row's % of net worth, shown as
      text beside the bar.
    completionComment: true
    date: '2026-11-18T12:16:48.491Z'
    id: c-2026-11-18t12-16-48-491z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T12:16:52.223Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/623'
needsAction: null
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
Guy asked what Share means (bar was scaled to the top row) and agreed it should be a real percent. PR https://github.com/guybnd/woke-poe-trade/pull/623: % of Valuation.chaos with text beside the bar. Reviewed + lint/build/tests pass.
