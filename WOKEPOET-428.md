---
id: WOKEPOET-428
title: 'Ctrl+Space search: calculator'
status: Done
priority: Medium
effort: S
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T02:52:37.047Z'
    comment: Created ticket.
    id: a-2026-11-21t02-52-37-047z
  - type: activity
    user: claude-code@GUY-PC
    date: '2026-11-21T02:52:40.883Z'
    comment: Claimed by claude-code@GUY-PC
    id: a-2026-11-21t02-52-40-883z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@GUY-PC
    date: '2026-11-21T02:52:40.883Z'
  - type: activity
    user: Agent
    date: '2026-11-21T02:57:39.982Z'
    comment: Updated implementation link.
    id: a-2026-11-21t02-57-39-982z
  - type: comment
    user: Agent
    comment: >-
      Built look A, reviewed by a separate reviewer with fixes, CI green, merged
      as PR 695.
    date: '2026-11-21T03:05:55.230Z'
    completionComment: true
    id: c-2026-11-21t03-05-55-230z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T03:05:55.231Z'
  - type: comment
    user: Agent
    comment: >-
      Calculator in Ctrl+Space search (look A): sums and currency shorthand as
      the top Answer row, Enter copies. Review fixes applied, CI green, merged.
      Look pick (A/B/C) still open on the mockup page.
    completionComment: true
    date: '2026-11-21T03:06:00.035Z'
    id: c-2026-11-21t03-06-00-035z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T03:06:00.540Z'
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/695'
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
Typing a sum in the Ctrl+Space search ("70 * 38", "(12+8) x 1.5", "200 + 10%", "2k * 3") shows the answer as the top row; Enter copies it. Currency shorthand works at poe.ninja prices ("50d / 7", "2 div + 30c"). Safe recursive-descent parser, no eval. Mockups (options A/B/C, A recommended and built): https://claude.ai/artifact/L7PXfmAU1z1fsx4irhNHGe
