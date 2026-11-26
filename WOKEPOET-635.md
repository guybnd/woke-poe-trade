---
id: WOKEPOET-635
title: Worth selling section in Net worth
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
    date: '2026-11-26T04:08:58.883Z'
    comment: Created ticket.
    id: a-2026-11-26t04-08-58-883z
  - type: comment
    user: Agent
    comment: >-
      Look and rule picks still open:
      https://claude.ai/artifact/KS3qXgggHzSb7tF3TeFRVk
    date: '2026-11-26T04:09:04.430Z'
    selfAttested: true
    pin: true
    id: c-2026-11-26t04-09-04-430z
  - type: comment
    user: Agent
    comment: >-
      Merged at 42e9ff4; dev build reloaded. Look/rule picks still open (pinned
      note).
    completionComment: true
    date: '2026-11-26T04:09:05.547Z'
    id: c-2026-11-26t04-09-05-547z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T04:09:07.042Z'
  - type: comment
    user: Agent
    comment: >-
      Follow-up PR 960 (https://github.com/guybnd/woke-poe-trade/pull/960,
      578e09d): Worth selling is now a Falling chip on the Holdings table.
    date: '2026-11-26T05:00:37.036Z'
    selfAttested: true
    id: c-2026-11-26t05-00-37-036z
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/956'
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
Net worth gets a Worth selling list of falling holdings (Guy, 2026-11-26). PR: https://github.com/guybnd/woke-poe-trade/pull/956 (42e9ff4).
