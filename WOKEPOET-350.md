---
id: WOKEPOET-350
title: 'Atlas screenshot import: read pictures off the main thread'
status: Done
priority: Low
effort: None
assignee: unassigned
tags:
  - atlas
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-17T06:57:44.103Z'
    comment: Created ticket.
    id: a-2026-11-17t06-57-44-103z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-17T06:57:46.018Z'
  - type: comment
    user: Agent
    comment: >-
      PR #567: picture fit in a short-lived worker (dist/picture.js), review
      fixes applied (double fit on exit, transfer, timeout, queue). Main tsc,
      main prod build, testing/main 22 tests, atlas e2e 12/12 green. Handed to
      coordinator for merge.
    date: '2026-11-17T06:59:53.168Z'
    completionComment: true
    id: c-2026-11-17t06-59-53-168z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-17T06:59:53.168Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 85191100: the picture fit runs in a worker thread. The leftover
      postMessage-throw cleanup goes in a tiny follow-up PR.
    completionComment: true
    date: '2026-11-17T07:12:32.334Z'
    id: c-2026-11-17t07-12-32-334z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-17T07:12:32.765Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/567'
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
Follow-up from #565's merge review: main fit each pasted screenshot synchronously (~0.2 s at 1440p). PR #567 moves the fit to a short-lived worker (dist/picture.js). Branch woke/atlas-shot-async.
