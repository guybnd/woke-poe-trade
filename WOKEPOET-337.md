---
id: WOKEPOET-337
title: 'Alt+F: read 3.30 item tier, never say Hidden when a tier rule may show it'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-16T03:36:02.892Z'
    comment: Created ticket.
    id: a-2026-11-16t03-36-02-892z
  - type: comment
    user: Agent
    comment: Merged as 2f800bcf; dev overlay running it.
    completionComment: true
    date: '2026-11-16T03:49:22.036Z'
    id: c-2026-11-16t03-49-22-036z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-16T03:49:22.599Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/548'
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
PR https://github.com/guybnd/woke-poe-trade/pull/548 (open as of 2026-11-16): reads "Unidentified (Tier N)" on 3.30 items, and stops saying Hidden when a tier rule may show the item. Filed after the fact.
