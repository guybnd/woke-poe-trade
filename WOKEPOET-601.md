---
id: WOKEPOET-601
title: 'OCR map scan: no fallback for ratings saved under another wording'
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
    date: '2026-11-25T04:59:09.147Z'
    comment: Created ticket.
    id: a-2026-11-25t04-59-09-147z
  - type: comment
    user: Agent
    comment: Fixed in PR 917 (c0791ee).
    date: '2026-11-25T05:14:26.565Z'
    completionComment: true
    id: c-2026-11-25t05-14-26-565z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-25T05:14:26.565Z'
  - type: comment
    user: Agent
    comment: Merged at c0791ee; dev build reloaded.
    completionComment: true
    date: '2026-11-25T05:14:31.576Z'
    id: c-2026-11-25t05-14-31-576z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T05:14:32.037Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/917'
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
Found in the 2026-11-25 bug hunt (PR 916): the OCR map scan has no fallback when a mod rating was saved under a different wording of the mod.
