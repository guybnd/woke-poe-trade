---
id: WOKEPOET-188
title: I. Item tier buttons run T2-T5
status: Done
priority: High
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-11T04:22:29.471Z'
    comment: Created ticket.
    id: a-2026-11-11t04-22-29-471z
  - type: activity
    user: Agent
    date: '2026-11-11T04:22:29.471Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-11t04-22-29-471z
  - type: comment
    user: Agent
    comment: >-
      **Tier buttons now run T2-T5.** PR
      https://github.com/guybnd/woke-poe-trade/pull/323. Local checks pass.
      Waiting on the cloud merge.
    date: '2026-11-11T04:23:04.289Z'
    completionComment: true
    id: c-2026-11-11t04-23-04-289z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-11T04:23:04.289Z'
  - type: comment
    user: Agent
    comment: Merged as 92ec973 and live in the dev build. No docs needed.
    completionComment: true
    date: '2026-11-11T04:30:43.207Z'
    id: c-2026-11-11t04-30-43-207z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-11T04:30:43.453Z'
needsAction: null
baselineCommit: 1255c6130adfa2dd4dd3e8816e974721f413e568
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/323'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/loot-filter/rules.ts
    additions: 4
    deletions: 3
  - file: renderer/test/woke/filter-rules.test.ts
    additions: 2
    deletions: 2
---
> TL;DR: the patch notes say tiers run from 2 to 5, so the T1 button goes. PR #323.
