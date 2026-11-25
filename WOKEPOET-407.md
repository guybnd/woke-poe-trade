---
id: WOKEPOET-407
title: 'Map verdicts: Safe / Risky / Dangerous, said once'
status: Released
priority: Low
effort: XS
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-20T03:41:41.697Z'
    comment: Created ticket.
    id: a-2026-11-20t03-41-41-697z
  - type: activity
    user: Agent
    date: '2026-11-20T03:41:49.550Z'
    comment: Updated implementation link.
    id: a-2026-11-20t03-41-49-550z
  - type: comment
    user: Agent
    comment: >-
      Merged as dea1e6ed: Safe / Risky / Dangerous badges said once; Alt+M badge
      fits; leftover RUN/CARE wording removed.
    completionComment: true
    date: '2026-11-20T03:49:45.420Z'
    id: c-2026-11-20t03-49-45-420z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T03:49:46.034Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:48.891Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/667'
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
Guy 2026-11-20: CARE badge + "Careful" headline says it twice; rename to Safe / Risky / Dangerous. PR https://github.com/guybnd/woke-poe-trade/pull/667.
