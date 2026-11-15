---
id: WOKEPOET-334
title: 'Window menu: say Hide window, offer Undo'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T16:28:22.644Z'
    comment: Created ticket.
    id: a-2026-11-15t16-28-22-644z
  - type: comment
    user: Agent
    comment: 'Merged in PR #541 (420cdea4). The dev overlay was reloaded on master.'
    date: '2026-11-15T16:28:27.771Z'
    completionComment: true
    id: c-2026-11-15t16-28-27-771z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T16:28:27.771Z'
  - type: comment
    user: Agent
    comment: 'Merged as 420cdea4: the window menu says "Hide window" and offers Undo.'
    completionComment: true
    date: '2026-11-15T16:28:32.435Z'
    id: c-2026-11-15t16-28-32-435z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T16:28:32.701Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/541'
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
> **TL;DR:** The window menu now says "Hide window" and offers Undo. Built and merged in PR #541 (420cdea4); this ticket records it.
