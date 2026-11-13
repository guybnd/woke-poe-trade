---
id: WOKEPOET-263
title: Atlas strategies read poeplanner atlas tree links
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
    date: '2026-11-13T13:46:37.821Z'
    comment: Created ticket.
    id: a-2026-11-13t13-46-37-821z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/418 up; self-reviewed,
      lint/tests/typecheck/build pass locally. On the dev build now. Waiting on
      the cloud merge.
    date: '2026-11-13T13:46:42.564Z'
    completionComment: true
    id: c-2026-11-13t13-46-42-564z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-13T13:46:42.564Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 76ce4322. Bare poeplanner character codes (no URL) can't be told
      apart; they decode to passives the atlas doesn't have, so the tree shows
      "N of its passives aren't in this atlas" and stays read-only. Left as is.
    completionComment: true
    date: '2026-11-13T13:54:43.351Z'
    id: c-2026-11-13t13-54-43-351z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-13T13:54:43.765Z'
needsAction: null
baselineCommit: 3defd75f96d427b12eabf1301a1d6ad20d1b18ce
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/418'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/mechanics/data.ts
    additions: 4
    deletions: 4
  - file: renderer/src/web/woke/mechanics/guide.ts
    additions: 1
    deletions: 1
---
> **TL;DR** Pasting a poeplanner.com/atlas-tree link into Atlas strategies now shows and edits the tree. PR #418.

Guy asked whether poeplanner atlas links import. Import accepted them but the tree couldn't decode poeplanner's little-endian format. `decodeTree` now tells the formats apart by the first byte; node ids are GGG's. Variant picks (shrine on Path of Worship) aren't in the link.
