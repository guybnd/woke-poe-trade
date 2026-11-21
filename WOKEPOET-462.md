---
id: WOKEPOET-462
title: Report an issue from Settings and Ctrl+Space search
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
    date: '2026-11-21T14:31:51.812Z'
    comment: Created ticket.
    id: a-2026-11-21t14-31-51-812z
  - type: activity
    user: Agent
    date: '2026-11-21T14:44:33.035Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/743 opened; adversarial
      review and CI running.
    id: a-2026-11-21t14-44-33-035z
  - type: comment
    user: Agent
    comment: >-
      PR 743 merged (5ed04982): Report an issue from Settings, About and
      Ctrl+Space; shared scrubbed issue builder; review fixed; all required
      checks green.
    date: '2026-11-21T15:08:35.304Z'
    completionComment: true
    id: c-2026-11-21t15-08-35-304z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T15:08:35.304Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 5ed04982. Report an issue dialog from Settings › Install &
      updates, About and Ctrl+Space; opens a pre-filled GitHub issue, long logs
      to clipboard; builder + scrubbing unified in ipc/issue-report.ts with
      crash reports.
    completionComment: true
    date: '2026-11-21T15:08:45.202Z'
    id: c-2026-11-21t15-08-45-202z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T15:08:45.752Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/743'
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
Add a "Report an issue" dialog (Bug/Idea, title, description, optional app info and scrubbed log, preview) reachable from Settings and Ctrl+Space. Submit opens a pre-filled GitHub issue via safe openExternal; long logs go to clipboard. Reuse/unify the crash-report builder from PR #41 and scrubbing from #269. Branch claude/report-issue, worktree E:\Git\woke\wt\report-issue.
