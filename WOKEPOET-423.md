---
id: WOKEPOET-423
title: Show title hovers in the app's own tooltip card
status: Released
priority: None
effort: M
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-20T16:55:29.544Z'
    comment: Created ticket.
    id: a-2026-11-20t16-55-29-544z
  - type: comment
    user: Agent
    comment: >-
      Merged as #691 (71d51131): title hovers show in the app's card via
      ui/title-tip.ts, installed from ui/page-hooks.ts; three adversarial review
      rounds fixed; all cloud checks green.
    date: '2026-11-20T17:44:54.469Z'
    completionComment: true
    id: c-2026-11-20t17-44-54-469z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-20T17:44:54.469Z'
  - type: comment
    user: Agent
    comment: >-
      Every title hover shows in the app's own card instead of the browser
      tooltip (~800 hovers, 176 files). One handler in ui/title-tip.ts, loaded
      with the number wheel from ui/page-hooks.ts; startup JS under budget. E2e
      title-tip.spec.ts; harness keeps native titles unless titleTips: true.
    completionComment: true
    date: '2026-11-20T17:44:56.119Z'
    id: c-2026-11-20t17-44-56-119z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T17:44:56.977Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:44.246Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/691'
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
Audit found ~800 native `title` tooltips in 176 files. One shared handler (ui/title-tip.ts, installed by HelpCard) shows any `title` in the themed help card at the cursor, with a short delay and warm follow-on. Opt out with `data-native-title`. Branch woke/app-tips, worktree E:\Git\woke\wt\app-tips. E2e: title-tip.spec.ts.
