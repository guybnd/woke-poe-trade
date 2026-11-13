---
id: WOKEPOET-265
title: Atlas import opens poeplanner short links
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - atlas
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-13T14:20:02.452Z'
    comment: Created ticket.
    id: a-2026-11-13t14-20-02-452z
  - type: comment
    user: Agent
    comment: 'PR #419 reviewed, local checks pass, merged as 0062462e.'
    date: '2026-11-13T14:20:06.016Z'
    completionComment: true
    id: c-2026-11-13t14-20-06-016z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-13T14:20:06.016Z'
  - type: comment
    user: Agent
    comment: Merged as 0062462e; dev build back on master.
    completionComment: true
    date: '2026-11-13T14:20:09.618Z'
    id: c-2026-11-13t14-20-09-618z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-13T14:20:09.859Z'
needsAction: null
baselineCommit: 3defd75f96d427b12eabf1301a1d6ad20d1b18ce
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/419'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/mechanics/data.ts
    additions: 4
    deletions: 4
  - file: renderer/src/web/woke/mechanics/guide.ts
    additions: 1
    deletions: 1
---
> **TL;DR** poeplanner.com/a/<id> short links import via api.poeplanner.com/api/b/<id>; proxy no longer cuts gzip bodies short. PR #419.
