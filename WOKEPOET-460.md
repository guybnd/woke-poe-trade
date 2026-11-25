---
id: WOKEPOET-460
title: Redesign Ctrl+Space item action buttons
status: Released
priority: Medium
effort: None
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T13:57:10.864Z'
    comment: Created ticket.
    id: a-2026-11-21t13-57-10-864z
  - type: activity
    user: Agent
    date: '2026-11-21T14:00:55.320Z'
    comment: >-
      Option A built in PR https://github.com/guybnd/woke-poe-trade/pull/741;
      mockups/pick: https://claude.ai/artifact/2nmXyqb4SYivXVpW6Nu86H. Review +
      CI running.
    id: a-2026-11-21t14-00-55-320z
  - type: activity
    user: Agent
    date: '2026-11-21T14:01:17.063Z'
    comment: Guy picked option A.
    id: a-2026-11-21t14-01-17-063z
  - type: comment
    user: Agent
    comment: >-
      Merged in PR 741 (option A, Guy's pick). Review fixes applied, all checks
      green.
    date: '2026-11-21T14:38:41.431Z'
    completionComment: true
    id: c-2026-11-21t14-38-41-431z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T14:38:41.431Z'
  - type: comment
    user: Agent
    comment: >-
      Option A (Guy's pick): ItemActions.vue with icons and groups, Trade site
      first (Enter), Market last as a quiet link; Ctrl+Enter price check, Ctrl+F
      find in stash, Ctrl+Shift+C copy name; title tooltips can show boxed keys
      (data-tip-keys); WButton icons hidden from accessible names. Built on PR
      740.
    completionComment: true
    date: '2026-11-21T14:38:46.627Z'
    id: c-2026-11-21t14-38-46-627z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T14:38:47.241Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:56.649Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/741'
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
version: '0001'
releasedAt: '2026-11-25T11:50:45.359Z'
releaseDocPath: release-notes/0001
---
Guy: Open in Market should go or move to the end; better layout with icons for the item detail pane's action row (Wiki, poedb, Price check, Trade site, Find in stash, Copy name). Mockups: https://claude.ai/artifact/2nmXyqb4SYivXVpW6Nu86H (building A meanwhile). Layout/presentation only; trade-site logic belongs to the Ctrl+Space trade links thread.
