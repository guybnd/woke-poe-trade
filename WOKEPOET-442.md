---
id: WOKEPOET-442
title: 'Session window: Ctrl+Space map results open Map history at that row'
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-434
history:
  - type: activity
    user: Agent
    date: '2026-11-21T07:20:40.846Z'
    comment: Created ticket.
    id: a-2026-11-21t07-20-40-846z
  - type: activity
    user: Agent
    date: '2026-11-21T07:20:40.846Z'
    comment: Created as subtask of WOKEPOET-434.
    id: a-2026-11-21t07-20-40-846z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T07:47:20.152Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t07-47-20-152z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T07:47:20.152Z'
  - type: comment
    user: Agent
    comment: >-
      PR 712 merged (0301ab8c): Ctrl+Space opens Map history / a map's row. CI
      green, review fix applied.
    date: '2026-11-21T08:04:14.781Z'
    completionComment: true
    id: c-2026-11-21t08-04-14-781z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T08:04:14.781Z'
  - type: comment
    user: Agent
    comment: >-
      Merged (0301ab8c). Maps card: "Open Map history" + per-row Show
      (saved-open id map:<enteredAt>); tonight card adds "Map history"; Session
      analytics handles it with onSavedOpen. Search's open action now stays open
      with a toast when no window of that tool exists. Release note added.
    completionComment: true
    date: '2026-11-21T08:04:16.477Z'
    id: c-2026-11-21t08-04-16-477z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T08:04:17.082Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/712'
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
> TL;DR: left over from step 3 (WOKEPOET-437). Picking a map or "tonight"/"last vault" result in Ctrl+Space should open Session analytics on Map history and scroll to that row (focusAt in WidgetSessionAnalytics.vue). Search lookups (search/lookups/session-story.ts) don't open windows at a row yet.
