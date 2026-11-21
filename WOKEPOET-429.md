---
id: WOKEPOET-429
title: 'Ctrl+Space search: pick a new answer as you type'
status: Done
priority: Medium
effort: XS
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T03:13:43.004Z'
    comment: Created ticket.
    id: a-2026-11-21t03-13-43-004z
  - type: activity
    user: claude-code@GUY-PC
    date: '2026-11-21T03:13:46.227Z'
    comment: Claimed by claude-code@GUY-PC
    id: a-2026-11-21t03-13-46-227z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@GUY-PC
    date: '2026-11-21T03:13:46.227Z'
  - type: comment
    user: Agent
    comment: >-
      Every keystroke picks the top result; reviewed, CI green, merged as PR
      698.
    date: '2026-11-21T03:20:00.071Z'
    completionComment: true
    id: c-2026-11-21t03-20-00-071z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T03:20:00.071Z'
  - type: comment
    user: Agent
    comment: >-
      Search picks the top result on every keystroke, and re-picks it when
      prices land after typing. Merged.
    completionComment: true
    date: '2026-11-21T03:20:01.170Z'
    id: c-2026-11-21t03-20-01-170z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T03:20:01.649Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/698'
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
Guy: typing "50d/" selects the web search row; "50d/c" adds the calculator answer on top but the web row stays selected, so Enter opens poewiki. Fix: while the query changes, never keep the web row and let a new top answer take over.
