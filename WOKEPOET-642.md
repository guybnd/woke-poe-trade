---
id: WOKEPOET-642
title: Add Foulborn and Vestigial info to unique price check
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-26T10:12:24.661Z'
    comment: Created ticket.
    id: a-2026-11-26t10-12-24-661z
  - type: activity
    user: Agent
    date: '2026-11-26T10:12:27.290Z'
    comment: Updated implementation link.
    id: a-2026-11-26t10-12-27-290z
  - type: comment
    user: Agent
    comment: 'Waiting on Guy''s pick: https://claude.ai/artifact/E9Ev8R6X2GrT4jDptnzLRg'
    date: '2026-11-26T10:12:28.594Z'
    selfAttested: true
    pin: true
    id: c-2026-11-26t10-12-28-594z
  - type: comment
    user: Agent
    comment: PR 967 merged (9276b27). Follow-up 643 stays open.
    date: '2026-11-26T11:22:35.055Z'
    completionComment: true
    id: c-2026-11-26t11-22-35-055z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-26T11:22:35.055Z'
  - type: comment
    user: Agent
    comment: Merged at 9276b27; dev build reloaded. Follow-up WOKEPOET-643 stays open.
    completionComment: true
    date: '2026-11-26T11:22:38.638Z'
    id: c-2026-11-26t11-22-38-638z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T11:22:40.238Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/967'
subtasks:
  - WOKEPOET-643
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
Unique price check shows Foulborn and Vestigial info. Draft PR: https://github.com/guybnd/woke-poe-trade/pull/967 (branch claude/project-thread-6cp05w).
