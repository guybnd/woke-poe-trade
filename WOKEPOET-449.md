---
id: WOKEPOET-449
title: 'Price check: bulk sellers only toggle'
status: Done
priority: Medium
effort: S
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T10:20:26.117Z'
    comment: Created ticket.
    id: a-2026-11-21t10-20-26-117z
  - type: activity
    user: Agent
    date: '2026-11-21T10:20:31.141Z'
    comment: >-
      Mockup options A/B/C posted in the project thread; building A (Bulk chip,
      loads more on click, resets per item). Branch bulk-only in wt/bulk-only.
    id: a-2026-11-21t10-20-31-141z
  - type: comment
    user: Agent
    comment: >-
      PR #726 merged (f782b21c): Bulk chip, loads more pages on click only. CI
      green, adversarial review fixes in.
    date: '2026-11-21T10:42:54.225Z'
    completionComment: true
    id: c-2026-11-21t10-42-54-225z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T10:42:54.225Z'
  - type: comment
    user: Agent
    comment: >-
      Bulk chip beside the online filter: shows only sellers with 2+ copies of
      the same kind at one price; on click, loads more pages (10 at a time, up
      to 100) until 10 bulk sellers show. Open fetches unchanged. Price drivers
      now load with the first check to keep startup JS under budget.
    completionComment: true
    date: '2026-11-21T10:43:03.120Z'
    id: c-2026-11-21t10-43-03-120z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T10:43:03.654Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/726'
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
Toggle in the price check results to show only sellers listing 2+ copies at a price (e.g. Nightmare Maps x22). When it leaves too few rows, the click pulls more result pages (up to 100 listings). No extra fetches on open.
